"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Student States
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [courseProgressMap, setCourseProgressMap] = useState({});
  const [quizResults, setQuizResults] = useState([]);

  // Content Manager & Instructor States
  const [allCourses, setAllCourses] = useState([]);
  const [allBlogs, setAllBlogs] = useState([]);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [instructorStudents, setInstructorStudents] = useState([]);

  async function loadDashboardData() {
    try {
      const storedUser = localStorage.getItem("user");
      const jwt = localStorage.getItem("jwt");

      if (!storedUser || !jwt || jwt === "undefined" || jwt === "null") {
        router.push("/login");
        return;
      }

      const currentUser = JSON.parse(storedUser);
      setUser(currentUser);
      const roleName = currentUser.role?.name || "Student";

      if (roleName === "Student" || roleName === "Authenticated") {
        // --- LOAD STUDENT DATA ---
        const [enrollRes, coursesRes, progRes, quizRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments?populate=*`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses?populate=*`),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lesson-progresses?populate=*`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quiz-results?populate=*&sort=createdAt:desc`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
        ]);

        const enrollData = await enrollRes.json();
        const coursesData = await coursesRes.json();
        const progData = await progRes.json();
        const quizData = await quizRes.json();

        const allEnrollments = enrollData?.data || [];
        const publishedCourses = coursesData?.data || [];
        const allProgresses = progData?.data || [];
        const allQuizSubmissions = quizData?.data || [];

        // Match student's enrollments
        const studentEnrollments = allEnrollments.filter((enr) => {
          const u = enr.users_permissions_user;
          return (
            u &&
            (u.id === currentUser.id ||
              u.documentId === currentUser.documentId ||
              u.username === currentUser.username)
          );
        });

        // Distinct courses
        const enrolledMap = new Map();
        studentEnrollments.forEach((enr) => {
          let c = enr.course;
          if (c) {
            const fullCourse = publishedCourses.find(
              (item) => item.documentId === c.documentId || item.id === c.id || item.title === c.title
            ) || c;
            const courseKey = fullCourse.documentId || fullCourse.id || fullCourse.title;
            if (!enrolledMap.has(courseKey)) {
              enrolledMap.set(courseKey, fullCourse);
            }
          }
        });

        const distinct = Array.from(enrolledMap.values());
        setEnrolledCourses(distinct);

        // Calculate student progress
        const progMap = {};
        distinct.forEach((course) => {
          const courseLessons = course.lessons || [];
          const totalLessons = courseLessons.length;

          let completedCount = 0;
          courseLessons.forEach((lesson) => {
            const isCompleted = allProgresses.some((p) => {
              const u = p.users_permissions_user;
              const matchUser = !u || u.id === currentUser.id || u.documentId === currentUser.documentId;
              const pLesson = p.lesson;
              const matchLesson =
                pLesson &&
                (pLesson.id === lesson.id ||
                  pLesson.documentId === lesson.documentId ||
                  String(pLesson.id) === String(lesson.id));
              return p.completed && matchUser && matchLesson;
            });
            if (isCompleted) completedCount++;
          });

          const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
          const courseKey = course.documentId || course.id;
          progMap[courseKey] = {
            completed: completedCount,
            total: totalLessons,
            percentage: percent,
          };
        });
        setCourseProgressMap(progMap);

        // Student Quiz Results
        const studentQuizzes = allQuizSubmissions.filter((r) => {
          const u = r.users_permissions_user;
          return (
            !u ||
            u.id === currentUser.id ||
            u.documentId === currentUser.documentId ||
            u.username === currentUser.username
          );
        });
        setQuizResults(studentQuizzes);

      } else if (roleName === "Content Manager") {
        // --- LOAD CONTENT MANAGER DATA ---
        const [coursesRes, blogsRes, quizzesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses?populate=*`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blog-posts?populate=*&sort=createdAt:desc`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quizzes?populate=*`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
        ]);

        const coursesData = await coursesRes.json();
        const blogsData = await blogsRes.json();
        const quizzesData = await quizzesRes.json();

        setAllCourses(coursesData?.data || []);
        setAllBlogs(blogsData?.data || []);
        setAllQuizzes(quizzesData?.data || []);

      } else if (roleName === "Instructor") {
        // --- LOAD INSTRUCTOR DATA ---
        const [coursesRes, enrollRes, progRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses?populate=*`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments?populate=*`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lesson-progresses?populate=*`, {
            headers: { Authorization: `Bearer ${jwt}` },
          }),
        ]);

        const coursesData = await coursesRes.json();
        const enrollData = await enrollRes.json();
        const progData = await progRes.json();

        const allRawCourses = coursesData?.data || [];
        const myCourses = allRawCourses.filter((c) => {
          const inst = c.instructor;
          return inst && (inst.id === currentUser.id || inst.documentId === currentUser.documentId || inst.username === currentUser.username);
        });

        setAllCourses(myCourses);

        const myCourseIds = new Set(myCourses.map((c) => c.id));
        const myCourseDocIds = new Set(myCourses.map((c) => c.documentId));

        const allEnr = enrollData?.data || [];
        const allProg = progData?.data || [];

        const studentTracker = [];
        allEnr.forEach((enr) => {
          const c = enr.course;
          const u = enr.users_permissions_user;
          if (c && u && (myCourseIds.has(c.id) || myCourseDocIds.has(c.documentId))) {
            const targetCourse = myCourses.find((item) => item.id === c.id || item.documentId === c.documentId) || c;
            const totalLessons = targetCourse.lessons?.length || 0;
            const completedInCourse = allProg.filter(
              (p) =>
                p.completed &&
                p.users_permissions_user?.id === u.id &&
                (p.course?.id === c.id || p.course?.documentId === c.documentId)
            ).length;

            const percent = totalLessons > 0 ? Math.round((completedInCourse / totalLessons) * 100) : 0;

            studentTracker.push({
              enrollmentId: enr.id,
              studentName: u.username,
              studentEmail: u.email,
              courseTitle: targetCourse.title,
              completed: completedInCourse,
              total: totalLessons,
              percentage: percent,
            });
          }
        });

        setInstructorStudents(studentTracker);
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, [router]);

  async function handleDeleteCourse(courseIdentifier) {
    if (!confirm("Are you sure you want to delete this course? This will remove the course, lessons, and quizzes.")) return;

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${courseIdentifier}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || "Failed to delete course");
      }

      alert("Course deleted successfully!");
      await loadDashboardData();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-semibold animate-pulse">Loading Dashboard...</div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const roleName = user.role?.name || "Student";
  const isAdmin = roleName === "Admin";
  const isContentManager = roleName === "Content Manager";
  const isInstructor = roleName === "Instructor";
  const isStudent = roleName === "Student" || roleName === "Authenticated";

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* ========================================================
            HEADER BANNER (Role-Tailored)
        ======================================================== */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                isAdmin ? "bg-purple-100 text-purple-800" :
                isContentManager ? "bg-blue-100 text-blue-800" :
                isInstructor ? "bg-amber-100 text-amber-800" :
                "bg-green-100 text-green-800"
              }`}>
                {roleName} Dashboard
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mt-2">
              Welcome back, {user.username}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isContentManager && "Manage platform courses, curricula, lessons, quizzes, and publish educational blogs."}
              {isInstructor && "Manage your courses, lectures, quizzes, and track enrolled student completion."}
              {isStudent && "Track your enrolled courses, lesson progress, and quiz assessments."}
              {isAdmin && "Full system administration and oversight."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isContentManager && (
              <>
                <Link
                  href="/manage/courses"
                  className="rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
                >
                  📚 Manage Courses & Lessons
                </Link>
                <Link
                  href="/manage/blogs"
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition shadow-sm"
                >
                  ✍️ Blog & Drafts
                </Link>
              </>
            )}

            {isInstructor && (
              <>
                <Link
                  href="/manage/courses"
                  className="rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
                >
                  📚 Manage My Courses & Lectures
                </Link>
                <Link
                  href="/"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  👁️ Browse Catalog
                </Link>
              </>
            )}

            {isStudent && (
              <Link
                href="/"
                className="rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
              >
                Browse All Courses
              </Link>
            )}

            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className="rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-800 transition shadow-sm"
                >
                  ⚡ Admin Panel
                </Link>
                <Link
                  href="/manage/courses"
                  className="rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
                >
                  📚 Manage Courses
                </Link>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {/* ========================================================
            1. CONTENT MANAGER DASHBOARD VIEW
        ======================================================== */}
        {isContentManager && (
          <div className="space-y-8">
            
            {/* Content Manager Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase">Platform Courses</div>
                <div className="text-3xl font-black text-gray-900 mt-1">{allCourses.length}</div>
                <div className="text-[11px] text-gray-400 mt-1">Total active courses</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase">Total Lessons</div>
                <div className="text-3xl font-black text-gray-900 mt-1">
                  {allCourses.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">Across all curricula</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase">Quizzes Created</div>
                <div className="text-3xl font-black text-gray-900 mt-1">{allQuizzes.length}</div>
                <div className="text-[11px] text-gray-400 mt-1">MCQ assessments</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase">Blog Articles</div>
                <div className="text-3xl font-black text-blue-600 mt-1">{allBlogs.length}</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {allBlogs.filter((b) => b.postStatus === "published").length} Published • {allBlogs.filter((b) => b.postStatus === "draft").length} Drafts
                </div>
              </div>
            </div>

            {/* Platform Courses Management Table */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Platform Courses ({allCourses.length})</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Edit courses, add lessons/lectures, or delete courses</p>
                </div>
                <Link
                  href="/manage/courses"
                  className="rounded-lg bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition"
                >
                  Manage Courses Hub →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-6">Course Title</th>
                      <th className="py-3.5 px-4">Instructor</th>
                      <th className="py-3.5 px-4">Lessons</th>
                      <th className="py-3.5 px-4">Quiz</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allCourses.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-4 px-6 font-bold text-gray-900 max-w-xs truncate">
                          {c.title}
                        </td>
                        <td className="py-4 px-4 text-xs font-medium text-gray-500">
                          {c.instructor?.username || "Staff"}
                        </td>
                        <td className="py-4 px-4 text-xs font-bold text-gray-700">
                          📖 {c.lessons?.length || 0} Lessons
                        </td>
                        <td className="py-4 px-4 text-xs">
                          {c.quizzes?.length > 0 ? (
                            <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">
                              ✓ Quiz Active
                            </span>
                          ) : (
                            <span className="text-gray-400 font-medium">No quiz</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-3">
                          <Link
                            href="/manage/courses"
                            className="text-xs font-bold text-indigo-600 hover:underline"
                          >
                            Manage Curriculum →
                          </Link>
                          <button
                            onClick={() => handleDeleteCourse(c.documentId || c.id)}
                            className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Recent Blog Articles */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Blog Posts & Editorial ({allBlogs.length})</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Write articles and toggle draft / published status</p>
                </div>
                <Link
                  href="/manage/blogs"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                >
                  Manage All Blogs →
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-6">Article Title</th>
                      <th className="py-3.5 px-4">Author</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Created Date</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allBlogs.slice(0, 5).map((b) => (
                      <tr key={b.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-4 px-6 font-bold text-gray-900 max-w-xs truncate">
                          {b.title}
                        </td>
                        <td className="py-4 px-4 text-xs">
                          {b.users_permissions_user?.username || "Editorial"}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                              b.postStatus === "published"
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {b.postStatus === "published" ? "🟢 Published" : "🟡 Draft"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-400">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link
                            href="/manage/blogs"
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            Edit Article →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}

        {/* ========================================================
            2. INSTRUCTOR DASHBOARD VIEW
        ======================================================== */}
        {isInstructor && (
          <div className="space-y-8">
            
            {/* Instructor Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase">My Authored Courses</div>
                <div className="text-3xl font-black text-gray-900 mt-1">{allCourses.length}</div>
                <div className="text-[11px] text-gray-400 mt-1">Courses created by you</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase">My Lectures / Lessons</div>
                <div className="text-3xl font-black text-gray-900 mt-1">
                  {allCourses.reduce((acc, c) => acc + (c.lessons?.length || 0), 0)}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">Across all your courses</div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="text-xs font-semibold text-gray-500 uppercase">Enrolled Students</div>
                <div className="text-3xl font-black text-amber-600 mt-1">{instructorStudents.length}</div>
                <div className="text-[11px] text-gray-400 mt-1">Active student enrollments</div>
              </div>
            </div>

            {/* My Courses & Curriculum */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">My Courses & Lectures ({allCourses.length})</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Manage your course curriculum, video lectures, and MCQ quizzes</p>
                </div>
                <Link
                  href="/manage/courses"
                  className="rounded-lg bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition"
                >
                  ➕ Create / Edit Curriculum
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-6">Course</th>
                      <th className="py-3.5 px-4">Lectures</th>
                      <th className="py-3.5 px-4">Quiz</th>
                      <th className="py-3.5 px-6 text-right">Curriculum Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {allCourses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          You have not created any courses yet. Click "Create / Edit Curriculum" to start!
                        </td>
                      </tr>
                    ) : (
                      allCourses.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50/50 transition">
                          <td className="py-4 px-6 font-bold text-gray-900 max-w-xs truncate">
                            {c.title}
                          </td>
                          <td className="py-4 px-4 text-xs font-bold text-gray-700">
                            📖 {c.lessons?.length || 0} Lectures
                          </td>
                          <td className="py-4 px-4 text-xs">
                            {c.quizzes?.length > 0 ? (
                              <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded">
                                ✓ Quiz Configured
                              </span>
                            ) : (
                              <span className="text-gray-400 font-medium">No quiz attached</span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-right space-x-3">
                            <Link
                              href="/manage/courses"
                              className="text-xs font-bold text-indigo-600 hover:underline"
                            >
                              Edit Lectures & Quiz →
                            </Link>
                            <button
                              onClick={() => handleDeleteCourse(c.documentId || c.id)}
                              className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Enrolled Students Progress Tracker */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Enrolled Students Progress ({instructorStudents.length})</h2>
                <p className="text-xs text-gray-500 mt-0.5">Real-time completion percentage for students in your courses</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                    <tr>
                      <th className="py-3.5 px-6">Student</th>
                      <th className="py-3.5 px-4">Course</th>
                      <th className="py-3.5 px-4">Progress</th>
                      <th className="py-3.5 px-6 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {instructorStudents.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-400">
                          No students have enrolled in your courses yet.
                        </td>
                      </tr>
                    ) : (
                      instructorStudents.map((st, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition">
                          <td className="py-4 px-6">
                            <div className="font-bold text-gray-900">{st.studentName}</div>
                            <div className="text-xs text-gray-400">{st.studentEmail}</div>
                          </td>
                          <td className="py-4 px-4 text-xs font-semibold text-gray-700">
                            {st.courseTitle}
                          </td>
                          <td className="py-4 px-4 text-xs text-gray-500">
                            {st.completed} of {st.total} lessons completed
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span
                              className={`text-xs font-black px-2.5 py-1 rounded-full ${
                                st.percentage === 100
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {st.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}

        {/* ========================================================
            3. STUDENT DASHBOARD VIEW
        ======================================================== */}
        {isStudent && (
          <div className="space-y-8">
            
            {/* My Enrolled Courses */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                  My Enrolled Courses ({enrolledCourses.length})
                </h2>
              </div>

              {enrolledCourses.length === 0 ? (
                <div className="rounded-2xl bg-white p-10 text-center text-gray-500 border border-gray-100 max-w-md mx-auto">
                  <div className="text-4xl mb-2">📚</div>
                  <h3 className="font-bold text-gray-800 text-lg">No enrolled courses yet</h3>
                  <p className="text-xs text-gray-400 mt-1 mb-6">
                    Explore our catalog of courses and enroll for free!
                  </p>
                  <Link
                    href="/"
                    className="rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition"
                  >
                    Browse Catalog →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {enrolledCourses.map((course) => {
                    const courseKey = course.documentId || course.id;
                    const prog = courseProgressMap[courseKey] || { completed: 0, total: 0, percentage: 0 };

                    return (
                      <div
                        key={courseKey}
                        className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                              Course
                            </span>
                            <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                              Enrolled ✅
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-gray-900 tracking-tight line-clamp-2">
                            {course.title}
                          </h3>

                          <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                            {course.description}
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1.5">
                              <span>Progress: {prog.completed} / {prog.total} lessons</span>
                              <span className="font-bold text-gray-900">{prog.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  prog.percentage === 100 ? "bg-green-600" : "bg-black"
                                }`}
                                style={{ width: `${prog.percentage}%` }}
                              />
                            </div>
                          </div>

                          <Link
                            href={`/courses/${course.documentId || course.id}`}
                            className="block w-full text-center rounded-lg bg-black py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition shadow-sm"
                          >
                            {prog.completed > 0 ? "Continue Learning →" : "Start Course →"}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Quiz Results History */}
            <section className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-gray-200">
              <h2 className="text-xl font-black text-gray-900 mb-4">
                Recent Quiz Submissions & Grades
              </h2>

              {quizResults.length === 0 ? (
                <div className="text-sm text-gray-400 bg-gray-50 p-6 rounded-xl text-center">
                  You haven't taken any quizzes yet. Complete course lessons and take the end-of-course MCQ assessments!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-y border-gray-200">
                      <tr>
                        <th className="py-3 px-4">Quiz Title</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Percentage</th>
                        <th className="py-3 px-4">Result</th>
                        <th className="py-3 px-4">Date Taken</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {quizResults.map((r) => {
                        const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : (r.percentage || 0);
                        const passed = r.passed !== undefined ? r.passed : pct >= 60;

                        return (
                          <tr key={r.id}>
                            <td className="py-3 px-4 font-bold text-gray-900">
                              {r.quiz?.title || r.quizTitle || "MCQ Quiz"}
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-800">
                              {r.score} / {r.total}
                            </td>
                            <td className="py-3 px-4 font-bold text-indigo-600">
                              {pct}%
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                  passed
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {passed ? "Passed ✅" : "Failed ❌"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs text-gray-400">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        )}

        {/* ========================================================
            4. ADMIN QUICK OVERVIEW
        ======================================================== */}
        {isAdmin && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center">
            <h2 className="text-2xl font-black text-gray-900">Administrator Control Center</h2>
            <p className="text-sm text-gray-500 mt-2 max-w-xl mx-auto">
              As an Administrator, you have full platform oversight to manage users, assign roles, inspect analytics, manage courses, and publish blog articles.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <Link
                href="/admin"
                className="rounded-lg bg-purple-700 px-6 py-3 text-sm font-bold text-white hover:bg-purple-800 transition shadow-sm"
              >
                Open Admin Panel & User Role Manager →
              </Link>
              <Link
                href="/manage/courses"
                className="rounded-lg bg-black px-6 py-3 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
              >
                Manage All Courses →
              </Link>
              <Link
                href="/manage/blogs"
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition shadow-sm"
              >
                Manage Blogs →
              </Link>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}