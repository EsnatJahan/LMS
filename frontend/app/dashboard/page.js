"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [courseProgressMap, setCourseProgressMap] = useState({});
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const storedUser = localStorage.getItem("user");
        const jwt = localStorage.getItem("jwt");

        if (!storedUser || !jwt || jwt === "undefined" || jwt === "null") {
          router.push("/login");
          return;
        }

        const currentUser = JSON.parse(storedUser);
        setUser(currentUser);

        // Fetch Enrollments, Courses, Lesson Progresses, and Quiz Results in parallel
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
        const allCourses = coursesData?.data || [];
        const allProgresses = progData?.data || [];
        const allQuizResults = quizData?.data || [];

        // 1. Filter student's enrollments
        const studentEnrollments = allEnrollments.filter((enr) => {
          const u = enr.users_permissions_user;
          return (
            u &&
            (u.id === currentUser.id ||
              u.documentId === currentUser.documentId ||
              u.username === currentUser.username)
          );
        });

        // 2. Map to distinct Courses
        const enrolledCourseMap = new Map();
        studentEnrollments.forEach((enr) => {
          let c = enr.course;
          if (c) {
            // Find full course with lessons from allCourses
            const fullCourse = allCourses.find(
              (item) => item.documentId === c.documentId || item.id === c.id || item.title === c.title
            ) || c;

            const courseKey = fullCourse.documentId || fullCourse.id || fullCourse.title;
            if (!enrolledCourseMap.has(courseKey)) {
              enrolledCourseMap.set(courseKey, fullCourse);
            }
          }
        });

        const distinctCourses = Array.from(enrolledCourseMap.values());
        setEnrolledCourses(distinctCourses);

        // 3. Filter student's lesson progresses
        const studentProgresses = allProgresses.filter((p) => {
          const u = p.users_permissions_user;
          return (
            p.completed &&
            (!u ||
              u.id === currentUser.id ||
              u.documentId === currentUser.documentId ||
              u.username === currentUser.username)
          );
        });

        // 4. Calculate progress percentage per enrolled course
        const progMap = {};
        distinctCourses.forEach((course) => {
          const courseLessons = course.lessons || [];
          const totalLessons = courseLessons.length;

          let completedCount = 0;
          courseLessons.forEach((lesson) => {
            const isCompleted = studentProgresses.some((p) => {
              const pLesson = p.lesson;
              return (
                pLesson &&
                (pLesson.id === lesson.id ||
                  pLesson.documentId === lesson.documentId ||
                  String(pLesson.id) === String(lesson.id))
              );
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

        // 5. Filter student's quiz results
        const studentQuizzes = allQuizResults.filter((r) => {
          const u = r.users_permissions_user;
          return (
            !u ||
            u.id === currentUser.id ||
            u.documentId === currentUser.documentId ||
            u.username === currentUser.username
          );
        });
        setQuizResults(studentQuizzes);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-semibold animate-pulse">Loading Student Dashboard...</div>
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

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Welcome Header */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                isAdmin ? "bg-purple-100 text-purple-800" :
                isContentManager ? "bg-blue-100 text-blue-800" :
                isInstructor ? "bg-amber-100 text-amber-800" :
                "bg-green-100 text-green-800"
              }`}>
                {roleName}
              </span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight mt-1">
              Welcome back, {user.username}!
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Track your enrolled courses, lesson completion, and quiz assessments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
            >
              Browse Catalog
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-800 transition shadow-sm"
              >
                ⚡ Admin Panel
              </Link>
            )}

            {(isInstructor || isContentManager) && (
              <Link
                href="/manage/courses"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm"
              >
                📚 Manage Courses
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200 mb-8">
            {error}
          </div>
        )}

        {/* My Enrolled Courses */}
        <section className="mb-12">
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
    </main>
  );
}