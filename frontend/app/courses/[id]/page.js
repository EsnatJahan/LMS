"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "../../components/Toast";

export default function CourseDetails() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [course, setCourse] = useState(null);
  const [courseQuiz, setCourseQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [completedLessonIds, setCompletedLessonIds] = useState(new Set());
  const [userQuizResult, setUserQuizResult] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    async function loadCourseAndData() {
      try {
        const jwt = localStorage.getItem("jwt");
        const userStr = localStorage.getItem("user");
        let parsedUser = null;

        if (jwt && userStr && jwt !== "undefined" && jwt !== "null") {
          try {
            parsedUser = JSON.parse(userStr);
            setCurrentUser(parsedUser);
          } catch (e) {
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }

        // 1. Fetch Course details and Quizzes in parallel
        const headers = jwt && jwt !== "undefined" ? { Authorization: `Bearer ${jwt}` } : {};
        const [courseRes, quizzesRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${id}?populate=*`),
          fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quizzes?populate=*`, { headers }),
        ]);

        const courseData = await courseRes.json();
        const quizzesData = await quizzesRes.json();
        const courseObj = courseData?.data;
        setCourse(courseObj);

        if (!courseObj) {
          setLoading(false);
          return;
        }

        // 2. Match Quiz for this course and ensure questions are populated
        const allQuizzes = quizzesData?.data || [];
        const currentQuiz = allQuizzes.find((q) => {
          const c = q.course;
          return (
            c &&
            (c.id === courseObj.id ||
              c.documentId === courseObj.documentId ||
              c.documentId === id ||
              String(c.id) === String(id) ||
              c.title === courseObj.title)
          );
        }) || null;

        if (currentQuiz && (!currentQuiz.questions || currentQuiz.questions.length === 0)) {
          try {
            const qRes = await fetch(
              `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/questions?populate=*`,
              { headers }
            );
            if (qRes.ok) {
              const qData = await qRes.json();
              const matched = (qData.data || []).filter((item) => {
                const qz = item.quiz;
                return (
                  qz &&
                  (qz.id === currentQuiz.id ||
                    qz.documentId === currentQuiz.documentId ||
                    qz.title === currentQuiz.title)
                );
              });
              if (matched.length > 0) {
                currentQuiz.questions = matched;
              }
            }
          } catch (e) {}
        }
        setCourseQuiz(currentQuiz);

        // 3. If logged in, check enrollment, lesson progress, and quiz results
        if (jwt && parsedUser) {
          // Check Enrollment
          const enrollRes = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments?populate=*`,
            { headers: { Authorization: `Bearer ${jwt}` } }
          );
          const enrollData = await enrollRes.json();
          const enrolledList = enrollData?.data || [];
          
          const isUserEnrolled = enrolledList.some((enr) => {
            const u = enr.users_permissions_user;
            const c = enr.course;
            if (!u || !c) return false;
            
            const matchUser =
              u.id === parsedUser.id ||
              u.documentId === parsedUser.documentId ||
              u.username === parsedUser.username;

            const matchCourse =
              c.id === courseObj.id ||
              c.documentId === courseObj.documentId ||
              c.documentId === id ||
              String(c.id) === String(id) ||
              c.title === courseObj.title;

            return matchUser && matchCourse;
          });

          setIsEnrolled(isUserEnrolled);

          // Check Lesson Progresses
          if (isUserEnrolled) {
            const progRes = await fetch(
              `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lesson-progresses?populate=*`,
              { headers: { Authorization: `Bearer ${jwt}` } }
            );
            const progData = await progRes.json();
            if (progRes.ok && progData?.data) {
              const compSet = new Set();
              progData.data.forEach((p) => {
                const u = p.users_permissions_user;
                const matchUser =
                  !u ||
                  u.id === parsedUser.id ||
                  u.documentId === parsedUser.documentId ||
                  u.username === parsedUser.username;

                if (p.completed && p.lesson && matchUser) {
                  compSet.add(p.lesson.id);
                  compSet.add(p.lesson.documentId);
                  compSet.add(String(p.lesson.id));
                }
              });
              setCompletedLessonIds(compSet);
            }
          }

          // Check Quiz Results
          if (currentQuiz) {
            const qResultRes = await fetch(
              `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/quiz-results?populate=*&sort=createdAt:desc`,
              { headers: { Authorization: `Bearer ${jwt}` } }
            );
            const qResultData = await qResultRes.json();
            if (qResultRes.ok && qResultData?.data) {
              const foundResult = qResultData.data.find((r) => {
                const u = r.users_permissions_user;
                const q = r.quiz;
                const matchUser = !u || u.id === parsedUser.id || u.documentId === parsedUser.documentId;
                const matchQuiz = q && (q.id === currentQuiz.id || q.documentId === currentQuiz.documentId);
                return matchUser && matchQuiz;
              });
              if (foundResult) {
                setUserQuizResult(foundResult);
              }
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
    const userStr = localStorage.getItem("user");

    if (!jwt || !userStr || jwt === "undefined" || jwt === "null") {
      toast.info("Please log in first to enroll in this course.");
      router.push("/login");
      return;
    }

    let userObj = null;
    try {
      userObj = JSON.parse(userStr);
    } catch (e) {}

    const roleName = userObj?.role?.name || "Student";
    if (roleName !== "Student" && roleName !== "Authenticated") {
      toast.info(`Course enrollment is for students. Your current role is: ${roleName}`);
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
            course: course.documentId || course.id || id,
          },
        }),
      });

      if (res.status === 401) {
        localStorage.removeItem("jwt");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("authChange"));
        toast.error("Your session has expired. Please log in again to enroll.");
        router.push("/login");
        return;
      }

      const result = await res.json();
      if (!res.ok) {
        if (result?.error?.message?.includes("already enrolled")) {
          setIsEnrolled(true);
          return;
        }
        throw new Error(result?.error?.message || "Failed to enroll");
      }

      toast.success("Successfully enrolled in this course! You now have full access to all lessons.");
      setIsEnrolled(true);
    } catch (error) {
      console.error("ENROLL ERROR:", error);
      toast.error(error.message);
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
        <div className="text-center bg-white p-8 rounded-2xl shadow border border-gray-100 max-w-md">
          <div className="text-4xl mb-2">🔍</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h2>
          <p className="text-sm text-gray-500 mb-6">
            The course you are looking for might have been moved or is not yet published.
          </p>
          <Link
            href="/"
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition"
          >
            ← Browse All Courses
          </Link>
        </div>
      </main>
    );
  }

  const lessons = (course.lessons || []).sort((a, b) => (a.order || 0) - (b.order || 0));
  const totalLessons = lessons.length;
  let completedCount = 0;
  lessons.forEach((l) => {
    if (completedLessonIds.has(l.id) || completedLessonIds.has(l.documentId) || completedLessonIds.has(String(l.id))) {
      completedCount++;
    }
  });

  const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const userRole = currentUser?.role?.name || "Guest";
  const isStudentOrGuest = !currentUser || userRole === "Student" || userRole === "Authenticated";

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
                Course Curriculum
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
                {courseQuiz && <span>• ❓ MCQ Quiz Included</span>}
              </div>
            </div>

            {/* Enrollment Action Box */}
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center min-w-[250px]">
              {isEnrolled ? (
                <div>
                  <div className="text-green-700 font-bold text-xs bg-green-100 py-1.5 px-3 rounded-full mb-3 inline-block">
                    ✅ Enrolled Student
                  </div>
                  <div className="text-xs text-gray-500 mb-4">
                    Full access to all course lessons and quizzes
                  </div>
                  {lessons.length > 0 && (
                    <Link
                      href={`/lessons/${lessons[0].documentId || lessons[0].id}`}
                      className="block w-full rounded-lg bg-black py-2.5 px-4 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
                    >
                      {completedCount > 0 ? "Continue Learning →" : "Start Course →"}
                    </Link>
                  )}
                </div>
              ) : currentUser && !isStudentOrGuest ? (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Instructor / Staff View
                  </div>
                  <span className="inline-block text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg mb-3">
                    Role: {userRole}
                  </span>
                  <p className="text-xs text-gray-500 mb-3">
                    Course enrollment is reserved for student accounts.
                  </p>
                  <Link
                    href="/manage/courses"
                    className="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Go to Manage Courses →
                  </Link>
                </div>
              ) : !currentUser ? (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Free Course Access
                  </div>
                  <Link
                    href="/login"
                    className="block w-full rounded-lg bg-black py-3 px-6 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
                  >
                    🔐 Login to Enroll
                  </Link>
                  <p className="text-[11px] text-gray-400 mt-2">Sign in or create a student account</p>
                </div>
              ) : (
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Free Course Access
                  </div>
                  <button
                    onClick={handleEnroll}
                    disabled={enrolling}
                    className="w-full rounded-lg bg-black py-3 px-6 text-sm font-bold text-white hover:bg-gray-800 transition disabled:bg-gray-400 shadow-sm"
                  >
                    {enrolling ? "Enrolling..." : "Enroll in Course"}
                  </button>
                  <p className="text-[11px] text-gray-400 mt-2">Instant enrollment for students</p>
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

        {/* Curriculum & Quiz Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Lessons List (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900">Lessons & Content</h2>
              <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2.5 py-1 rounded-full">
                {totalLessons} Lessons
              </span>
            </div>

            {lessons.length === 0 ? (
              <div className="rounded-xl bg-white p-6 text-center text-gray-400 border border-gray-100">
                No lessons published for this course yet.
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, index) => {
                  const isDone =
                    completedLessonIds.has(lesson.id) ||
                    completedLessonIds.has(lesson.documentId) ||
                    completedLessonIds.has(String(lesson.id));

                  return (
                    <Link
                      key={lesson.id}
                      href={isEnrolled ? `/lessons/${lesson.documentId || lesson.id}` : "#"}
                      onClick={(e) => {
                        if (!isEnrolled) {
                          e.preventDefault();
                          if (!currentUser) {
                            toast.info("Please log in and enroll to access the lessons.");
                            router.push("/login");
                          } else {
                            toast.info("Please enroll in this course above to access the lessons.");
                          }
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
                              📺 Video Included
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
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full hover:bg-black hover:text-white transition">
                            View Lesson →
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
            <h2 className="text-2xl font-black text-gray-900">Course Assessment</h2>

            {!courseQuiz ? (
              <div className="rounded-xl bg-white p-6 text-center text-gray-400 border border-gray-100">
                No quiz assigned for this course.
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded">
                    MCQ Assessment
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900">{courseQuiz.title}</h3>
                <p className="text-xs text-gray-600 mt-1 mb-4">{courseQuiz.description}</p>

                <div className="text-xs text-gray-500 font-medium mb-4 space-y-1">
                  <div>❓ Questions: <strong>{courseQuiz.questions?.length !== undefined ? courseQuiz.questions.length : 0} Questions</strong></div>
                  <div>🎯 Passing Grade: <strong>60%</strong></div>
                  <div>⚡ Auto-Grading: <strong>Instant Results</strong></div>
                </div>

                {userQuizResult && (
                  <div className="mb-4 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
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
                    className="block w-full text-center rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition shadow-sm"
                  >
                    {userQuizResult ? "Retake MCQ Quiz →" : "Take MCQ Quiz →"}
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full text-center rounded-lg bg-gray-200 py-3 text-xs font-bold text-gray-500 cursor-not-allowed"
                  >
                    Enroll in course to unlock quiz
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