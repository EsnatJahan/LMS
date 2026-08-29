"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [courseProgressMap, setCourseProgressMap] = useState({});
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const storedUser = localStorage.getItem("user");
        const jwt = localStorage.getItem("jwt");

        if (!storedUser || !jwt) {
          router.push("/login");
          return;
        }

        const currentUser = JSON.parse(storedUser);
        setUser(currentUser);

        // 1. Fetch Enrollments with course & lessons
        const enrollRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments?filters[users_permissions_user][id][$eq]=${currentUser.id}&populate[course][populate]=lessons`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );

        const enrollData = await enrollRes.json();
        const enrollList = enrollData.data || [];
        setEnrollments(enrollList);

        // 2. Fetch all lesson progresses for this student
        const progRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lesson-progresses?filters[users_permissions_user][id][$eq]=${currentUser.id}&populate[lesson]=*&populate[course]=*`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        const progData = await progRes.json();
        const progresses = progData?.data || [];

        // Build progress map per course
        const progMap = {};
        enrollList.forEach((enr) => {
          const course = enr.course;
          if (!course) return;

          const totalLessons = course.lessons?.length || 0;
          const completedInThisCourse = progresses.filter(
            (p) => (p.course?.id === course.id || p.course?.documentId === course.documentId) && p.completed
          ).length;

          const percent = totalLessons > 0 ? Math.round((completedInThisCourse / totalLessons) * 100) : 0;

          progMap[course.id] = {
            completed: completedInThisCourse,
            total: totalLessons,
            percentage: percent,
          };
        });
        setCourseProgressMap(progMap);

        // 3. Fetch Quiz Results
        const quizRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quiz-results?filters[users_permissions_user][id][$eq]=${currentUser.id}&populate[quiz]=*&sort=createdAt:desc`,
          { headers: { Authorization: `Bearer ${jwt}` } }
        );
        const quizData = await quizRes.json();
        setQuizResults(quizData?.data || []);

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
              Track your enrolled courses, lesson progress, and quiz assessments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-lg bg-black px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition"
            >
              Browse All Courses
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-lg bg-purple-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-800 transition"
              >
                ⚡ Admin Panel
              </Link>
            )}

            {(isInstructor || isContentManager) && (
              <Link
                href="/manage/courses"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
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
              My Enrolled Courses ({enrollments.length})
            </h2>
          </div>

          {enrollments.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center text-gray-500 border border-gray-100 max-w-md mx-auto">
              <div className="text-4xl mb-2">📚</div>
              <h3 className="font-bold text-gray-800 text-lg">No enrolled courses yet</h3>
              <p className="text-xs text-gray-400 mt-1 mb-6">
                Explore our catalog of courses and enroll for free!
              </p>
              <Link
                href="/"
                className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
              >
                Browse Catalog →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrollments.map((enrollment) => {
                const course = enrollment.course;
                if (!course) return null;

                const prog = courseProgressMap[course.id] || { completed: 0, total: 0, percentage: 0 };

                return (
                  <div
                    key={enrollment.documentId || enrollment.id}
                    className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Course
                        </span>
                        <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded">
                          Enrolled
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
                          <span>{prog.percentage}%</span>
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
                        className="block w-full text-center rounded-lg bg-black py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
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
                    const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
                    const passed = pct >= 60;

                    return (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {r.quiz?.title || "Quiz"}
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