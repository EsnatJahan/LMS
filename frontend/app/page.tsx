
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses?populate=*`
        );

        const data = await response.json();

        if (response.ok) {
          setCourses(data.data || []);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  if (loading) {
    return <main className="p-10">Loading courses...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">
          Courses
        </h1>

        {courses.length === 0 ? (
          <p>No courses available.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((course) => (
              <div
                key={course.documentId}
                className="rounded-lg bg-white p-6 shadow"
              >
                <h2 className="text-xl font-bold">
                  {course.title}
                </h2>

                <p className="mt-2 text-gray-600">
                  {course.description}
                </p>

                <p className="mt-3 text-sm text-gray-500">
                  Instructor:{" "}
                  {course.instructor?.username || "Not assigned"}
                </p>

                <Link
                  href={`/courses/${course.documentId}`}
                  className="mt-5 inline-block rounded bg-black px-5 py-2 text-white"
                >
                  View Course
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
