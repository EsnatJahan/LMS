"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "../../components/Toast";

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [lesson, setLesson] = useState(null);
  const [courseLessons, setCourseLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    async function fetchLessonAndData() {
      try {
        // 1. Fetch current lesson with populate=*
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lessons/${params.id}?populate=*`
        );

        const data = await response.json();

        if (!response.ok || !data.data) {
          throw new Error("Failed to load lesson");
        }

        const lessonData = data.data;
        setLesson(lessonData);

        // 2. Fetch sibling lessons from the parent course for sequential navigation
        if (lessonData.course) {
          const courseId = lessonData.course.documentId || lessonData.course.id;
          const courseRes = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${courseId}?populate=*`
          );
          const courseData = await courseRes.json();
          if (courseData?.data?.lessons) {
            const rawLessons = courseData.data.lessons;
            const sortedLessons = [...rawLessons].sort((a, b) => (a.order || 0) - (b.order || 0));
            setCourseLessons(sortedLessons);
          }
        }

        // 3. Check if user has already completed this lesson
        const jwt = localStorage.getItem("jwt");
        const userStr = localStorage.getItem("user");

        if (jwt && userStr) {
          const user = JSON.parse(userStr);
          const progressRes = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lesson-progresses?filters[users_permissions_user][id][$eq]=${user.id}&filters[lesson][id][$eq]=${lessonData.id}`,
            {
              headers: {
                Authorization: `Bearer ${jwt}`,
              },
            }
          );

          if (progressRes.ok) {
            const progressData = await progressRes.json();
            if (progressData?.data && progressData.data.length > 0) {
              setIsCompleted(true);
            }
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchLessonAndData();
    }
  }, [params.id]);

  const handleCompleteLesson = async () => {
    const jwt = localStorage.getItem("jwt");
    
    if (!jwt) {
      toast.info("Please log in first to track lesson progress.");
      return;
    }

    setCompleting(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lesson-progresses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            lesson: lesson.documentId || lesson.id,
            course: lesson.course?.documentId || lesson.course?.id, 
            completed: true
          },
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error?.message || "Failed to save progress");
      }
      
      setIsCompleted(true);
      toast.success("Lesson marked as complete! Your course progress has been updated.");
      
    } catch (err) {
      console.error("Progress Error:", err);
      toast.error(err.message);
    } finally {
      setCompleting(false);
    }
  };

  function getEmbedVideoUrl(url) {
    if (!url) return null;
    try {
      if (url.includes("youtube.com/watch?v=")) {
        const videoId = url.split("v=")[1]?.split("&")[0];
        return `https://www.youtube.com/embed/${videoId}`;
      } else if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1]?.split("?")[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      return url;
    } catch (e) {
      return url;
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-semibold animate-pulse">Loading lesson content...</div>
      </main>
    );
  }

  if (error || !lesson) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow border border-gray-100 max-w-md">
          <div className="text-4xl mb-2">🔍</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Lesson Not Found</h2>
          <p className="text-xs text-gray-500 mb-6">{error || "The lesson you are looking for does not exist."}</p>
          <Link
            href="/"
            className="rounded-lg bg-black px-5 py-2.5 text-sm font-bold text-white hover:bg-gray-800"
          >
            ← Return to Courses
          </Link>
        </div>
      </main>
    );
  }

  const currentIndex = courseLessons.findIndex(
    (l) => l.id === lesson.id || l.documentId === lesson.documentId
  );
  const previousLesson = currentIndex > 0 ? courseLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < courseLessons.length - 1 ? courseLessons[currentIndex + 1] : null;

  const embedUrl = getEmbedVideoUrl(lesson.videoUrl);

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={`/courses/${lesson.course?.documentId || lesson.course?.id}`}
            className="text-sm font-semibold text-gray-600 hover:text-black transition flex items-center gap-1"
          >
            ← Back to Course: <strong>{lesson.course?.title}</strong>
          </Link>
        </div>

        {/* Lesson Article Card */}
        <article className="rounded-2xl bg-white p-6 sm:p-10 shadow-sm border border-gray-100">
          
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-black text-white text-xs font-bold px-2.5 py-1 rounded">
              Lesson {lesson.order || (currentIndex >= 0 ? currentIndex + 1 : 1)} of {courseLessons.length || 1}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            {lesson.title}
          </h1>

          {/* Video Player */}
          {embedUrl && (
            <div className="mt-8 rounded-xl overflow-hidden shadow bg-black aspect-video">
              {embedUrl.includes("youtube.com") ? (
                <iframe
                  src={embedUrl}
                  title={lesson.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video controls className="w-full h-full">
                  <source src={embedUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              )}
            </div>
          )}

          {/* Text Content */}
          <div className="mt-8 text-base text-gray-800 leading-relaxed whitespace-pre-wrap font-normal">
            {lesson.content}
          </div>

          {/* Completion Action */}
          <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {!isCompleted ? (
              <button
                onClick={handleCompleteLesson}
                disabled={completing}
                className="rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 transition disabled:bg-gray-400 shadow-sm"
              >
                {completing ? "Saving Progress..." : "✓ Mark Lesson as Complete"}
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-bold text-green-800 border border-green-200">
                <span>✅ You have completed this lesson!</span>
              </div>
            )}

            <div className="text-xs text-gray-400">
              Progress is automatically saved to your student profile
            </div>
          </div>

        </article>

        {/* Sequential Navigation */}
        <div className="mt-8 flex items-center justify-between gap-4">
          {previousLesson ? (
            <Link
              href={`/lessons/${previousLesson.documentId || previousLesson.id}`}
              className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-5 py-3 text-sm font-bold text-gray-800 hover:border-black hover:shadow-sm transition"
            >
              ← Previous: {previousLesson.title}
            </Link>
          ) : (
            <div />
          )}

          {nextLesson ? (
            <Link
              href={`/lessons/${nextLesson.documentId || nextLesson.id}`}
              className="flex items-center gap-2 rounded-xl bg-black px-5 py-3 text-sm font-bold text-white hover:bg-gray-800 shadow-sm transition"
            >
              Next: {nextLesson.title} →
            </Link>
          ) : (
            <Link
              href={`/courses/${lesson.course?.documentId || lesson.course?.id}`}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 shadow-sm transition"
            >
              Course Overview & Quiz →
            </Link>
          )}
        </div>

      </div>
    </main>
  );
}