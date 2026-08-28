"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function LessonDetails() {
  const params = useParams();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchLesson() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/lessons/${params.id}?populate=*`
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
    return <main className="p-10">Loading...</main>;
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

       {lesson.course && (
            <Link
                href={`/courses/${lesson.course.documentId}`}
                className="mb-6 inline-block text-blue-600 hover:underline"
            >
                ← Back to {lesson.course.title}
            </Link>
        )}

        <h1 className="text-4xl font-bold">
          {lesson.title}
        </h1>

        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="text-2xl font-bold">
            Lesson Content
          </h2>

          <p className="mt-4 whitespace-pre-line text-gray-700">
            {lesson.content}
          </p>
        </div>

      </div>
    </main>
  );
}