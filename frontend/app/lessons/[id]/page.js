"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function LessonPage() {
  const params = useParams();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // 1. Moved states inside the component
  const [completing, setCompleting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    async function fetchLessonAndProgress() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lessons/${params.id}?populate=course`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error("Failed to load lesson");
        }

        const lessonData = data.data;
        setLesson(lessonData);

        // Check if user has already completed this lesson
        const jwt = localStorage.getItem("jwt");
        const userStr = localStorage.getItem("user");

        if (jwt && userStr) {
          const user = JSON.parse(userStr);
          const progressRes = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lesson-progresses?filters[users_permissions_user][id][$eq]=${user.id}&filters[lesson][documentId][$eq]=${params.id}`,
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
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchLessonAndProgress();
    }
  }, [params.id]);

  // 2. Moved function inside the component so it can access the 'lesson' state
  const handleCompleteLesson = async () => {
    const jwt = localStorage.getItem("jwt");
    
    if (!jwt) {
      alert("Please login first.");
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
      alert("Lesson marked as complete!");
      
    } catch (error) {
      console.error("Progress Error:", error);
      alert(error.message);
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return <main className="p-10">Loading lesson...</main>;
  }

  if (error) {
    return (
      <main className="p-10 text-red-600">
        {error}
      </main>
    );
  }

  if (!lesson) {
    return <main className="p-10">Lesson not found.</main>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl">

        <Link
          href={`/courses/${lesson.course?.documentId}`}
          className="text-blue-600"
        >
          ← Back to Course
        </Link>

        <article className="mt-6 rounded-lg bg-white p-8 shadow">
          <h1 className="text-3xl font-bold">
            {lesson.title}
          </h1>

          <div className="mt-6 whitespace-pre-wrap text-gray-700">
            {lesson.content}
          </div>
        </article>

        {!isCompleted ? (
          <button
            onClick={handleCompleteLesson}
            disabled={completing}
            className="mt-10 rounded bg-green-600 px-6 py-3 text-white disabled:bg-gray-400"
          >
            {completing ? "Saving..." : "Mark as Complete"}
          </button>
        ) : (
          <div className="mt-10 rounded bg-green-100 p-4 font-bold text-green-800">
            ✅ You have completed this lesson!
          </div>
        )}

      </div>
    </main>
  );
}