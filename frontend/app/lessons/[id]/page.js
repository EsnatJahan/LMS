
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function LessonPage() {
  const params = useParams();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLesson() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lessons/${params.id}?populate=course`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error("Failed to load lesson");
        }

        setLesson(data.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchLesson();
    }
  }, [params.id]);

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

      </div>
    </main>
  );
}
