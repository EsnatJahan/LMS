"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CourseDetails() {
  const { id } = useParams();
  const router = useRouter();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [userQuizResult, setUserQuizResult] = useState(null);
  const [userRole, setUserRole] = useState("Student");

  useEffect(() => {
    async function loadCourseAndData() {
      try {
        const jwt = localStorage.getItem("jwt");
        const userStr = localStorage.getItem("user");
        let currentUser = null;

        if (userStr) {
          try {
            currentUser = JSON.parse(userStr);
            setUserRole(currentUser.role?.name || "Student");
          } catch (e) {}
        }

        // 1. Fetch Course details with lessons, quizzes, instructor
        const courseRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${id}?populate[instructor]=*&populate[lessons]=*&populate[quizzes][populate]=questions`
        );
        const courseData = await courseRes.json();
        const courseObj = courseData.data;
        setCourse(courseObj);

        // 2. If logged in, check enrollment and progress
        if (jwt && currentUser && courseObj) {
          // Check Enrollment
          const enrollRes = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments?filters[course][id][$eq]=${courseObj.id}&filters[users_permissions_user][id][$eq]=${currentUser.id}`,
            { headers: { Authorization: `Bearer ${jwt}` } }
          );
          const enrollData = await enrollRes.json();
          const enrolled = enrollData?.data && enrollData.data.length > 0;
          setIsEnrolled(enrolled);

          // Check Lesson Progresses
          if (enrolled) {
            const progRes = await fetch(
              `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lesson-progresses?filters[course][id][$eq]=${courseObj.id}&filters[users_permissions_user][id][$eq]=${currentUser.id}`,
              { headers: { Authorization: `Bearer ${jwt}` } }
            );
            const progData = await progRes.json();
            if (progRes.ok && progData?.data) {
              const compSet = new Set();
              progData.data.forEach((p) => {
                if (p.completed && p.lesson) {
                  compSet.add(p.lesson.id);
                  compSet.add(p.lesson.documentId);
                }
              });
              setCompletedLessonIds(compSet);
            }
          }

          // Check Quiz Results
          if (courseObj.quizzes && courseObj.quizzes.length > 0) {
            const quizId = courseObj.quizzes[0].id;
            const qResultRes = await fetch(
              `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quiz-results?filters[quiz][id][$eq]=${quizId}&filters[users_permissions_user][id][$eq]=${currentUser.id}&sort=createdAt:desc`,
              { headers: { Authorization: `Bearer ${jwt}` } }
            );
            const qResultData = await qResultRes.json();
            if (qResultRes.ok && qResultData?.data && qResultData.data.length > 0) {
              setUserQuizResult(qResultData.data[0]);
            }
          }
        }
      } catch (error) {
        console.error("Course Load Error:", error);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadCourseAndData();
  }, [id]);

  const handleEnroll = async () => {
    const jwt = localStorage.getItem("jwt");

    if (!jwt) {
      alert("Please login first to enroll.");
      router.push("/login");
      return;
    }

    if (userRole !== "Student" && userRole !== "Authenticated") {
      alert(`Only students can enroll in courses. (Your current role is: ${userRole})`);
      return;
    }

    setEnrolling(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            course: course.id || id,
          },
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error?.message || "Failed to enroll");
      }

      alert("Successfully enrolled in this course! You can now start the lessons.");
      setIsEnrolled(true);
    } catch (error) {
      console.error("ENROLL ERROR:", error);
      alert(error.message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-semibold animate-pulse">Loading Course Details...</div>
      </main>
    );
  }

  if (!course) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow border border-gray-100">
          <div className="text-3xl mb-2">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Course Not Found</h2>
          <Link href="/" className="text-sm font-bold text-black underline">
            ← Browse all courses
          </Link>
        </div>
      </main>
    );
  }

  const lessons = (course.lessons || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  const totalLessons = lessons.length;
  let completedCount = 0;
  lessons.forEach((l) => {
    if (completedLessonIds.has(l.id) || completedLessonIds.has(l.documentId)) {
      completedCount++;
    }
  });

  const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const courseQuiz = course.quizzes && course.quizzes.length > 0 ? course.quizzes[0] : null;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link href="/" className="text-sm font-semibold text-gray-600 hover:text-black transition">
            ← Back to All Courses
          </Link>
        </div>

        {/* Course Header Banner */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-block bg-black text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Course
              </span>
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                {course.title}
              </h1>
              <p className="text-base text-gray-600 leading-relaxed whitespace-pre-wrap">
                {course.description}
              </p>
              <div className="flex items-center gap-2 pt-2 text-sm text-gray-500 font-medium">
                <span>👨‍🏫 Instructor: <strong>{course.instructor?.username || "LMS Faculty"}</strong></span>
                <span>•</span>
                <span>📖 {totalLessons} Lessons</span>
                {courseQuiz && <span>• ❓ Quiz Available</span>}
              </div>
            </div>

            {/* Enrollment Action Box */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center min-w-[240px]">
              {isEnrolled ? (
                <div>
                  <div className="text-green-700 font-bold text-sm bg-green-100 py-1.5 px-3 rounded-full mb-3 inline-block">
                    ✅ Enrolled Student
                  </div>
                  <div className="text-xs text-gray-500 mb-3">You have full access to all course materials</div>
                  {lessons.length > 0 && (
                    <Link
                      href={`/lessons/${lessons[0].documentId || lessons[0].id}`}
                      className="block w-full rounded-lg bg-black py-2.5 px-4 text-sm font-bold text-white hover:bg-gray-800 transition"
                    >
                      {completedCount > 0 ? "Continue Learning →" : "Start Course →"}
                    </Link>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Free Enrollment
                  </div>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full rounded-lg bg-black py-3 px-6 text-sm font-bold text-white hover:bg-gray-800 transition disabled:bg-gray-400 shadow-sm"
                  >
                    {enrolling ? "Enrolling..." : "Enroll in Course"}
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2">Instant access upon enrolling</p>
                </div>
              )}
            </div>
          </div>

          {/* Student Progress Bar (Shown when enrolled) */}
          {isEnrolled && totalLessons > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-bold text-gray-900">Your Course Progress</span>
                <span className="font-bold text-gray-900">
                  {completedCount} of {totalLessons} lessons completed ({progressPercentage}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progressPercentage === 100 ? "bg-green-600" : "bg-black"
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Lessons Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Lessons List (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900">Curriculum & Lessons</h2>
              <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                {totalLessons} Sequential Lessons
              </span>
            </div>

            {lessons.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-center text-gray-500 border border-gray-100">
                No lessons published for this course yet.
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const isDone = completedLessonIds.has(lesson.id) || completedLessonIds.has(lesson.documentId);

                  return (
                    <Link
                      key={lesson.id}
                      href={isEnrolled ? `/lessons/${lesson.documentId || lesson.id}` : "#"}
                      onClick={(e) => {
                        if (!isEnrolled) {
                          e.preventDefault();
                          alert("Please enroll in this course to access the lessons.");
                        }
                      }}
                      className={`flex items-center justify-between p-4 rounded-xl border transition ${
                        isEnrolled
                          ? "bg-white border-gray-200 hover:border-black hover:shadow-sm"
                          : "bg-gray-100/70 border-gray-200 opacity-75 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            isDone
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {isDone ? "✓" : index + 1}
                        </span>

                        <div>
                          <h3 className="font-bold text-gray-900 text-base leading-snug">
                            {lesson.title}
                          </h3>
                          {lesson.videoUrl && (
                            <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                              📺 Video Lesson
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDone ? (
                          <span className="text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
                            Completed ✅
                          </span>
                        ) : isEnrolled ? (
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                            Start Lesson →
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-400">🔒 Locked</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quiz Card Section (1 col) */}
          <div className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900">Course Quiz</h2>

            {!courseQuiz ? (
              <div className="rounded-xl bg-white p-6 text-center text-gray-400 border border-gray-100">
                No quiz assigned for this course.
              </div>
            ) : (
              <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded">
                    MCQ Assessment
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900">{courseQuiz.title}</h3>
                <p className="text-xs text-gray-600 mt-1 mb-4">{courseQuiz.description}</p>

                <div className="text-xs text-gray-500 font-medium mb-4 space-y-1">
                  <div>❓ Total Questions: <strong>{courseQuiz.questions?.length || 0}</strong></div>
                  <div>🎯 Passing Grade: <strong>60%</strong></div>
                </div>

                {userQuizResult && (
                  <div className="mb-4 p-3.5 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                    <div className="font-bold text-gray-900 mb-1">Your Latest Score:</div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-indigo-600">
                        {userQuizResult.score} / {userQuizResult.total} (
                        {Math.round((userQuizResult.score / userQuizResult.total) * 100)}%)
                      </span>
                      <span className="text-green-700 font-bold bg-green-100 px-2 py-0.5 rounded">
                        Submitted ✅
                      </span>
                    </div>
                  </div>
                )}

                {isEnrolled ? (
                  <Link
                    href={`/quizzes/${courseQuiz.documentId || courseQuiz.id}`}
                    className="block w-full text-center rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition"
                  >
                    {userQuizResult ? "Retake Quiz →" : "Take MCQ Quiz →"}
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full text-center rounded-lg bg-gray-200 py-2.5 text-xs font-bold text-gray-500 cursor-not-allowed"
                  >
                    Enroll to unlock quiz
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

      </div>
    </main>
  );
}