"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCourses() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses?populate=*`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error("Failed to load courses");
        }

        setCourses(data.data || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-4xl font-bold">
          Learning Management System
        </h1>

        <p className="mt-2 text-gray-600">
          Explore our courses
        </p>

        {loading && (
          <p className="mt-8">Loading courses...</p>
        )}

        {error && (
          <p className="mt-8 text-red-600">{error}</p>
        )}

        {!loading && !error && courses.length === 0 && (
          <p className="mt-8">
            No courses available.
          </p>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.documentId || course.id}
              className="rounded-lg bg-white p-6 shadow"
            >
              <h2 className="text-xl font-bold">
                {course.title}
              </h2>

              <p className="mt-3 text-gray-600">
                {course.description}
              </p>

              <Link
                href={`/courses/${course.documentId || course.id}`}
                className="mt-5 inline-block rounded bg-black px-4 py-2 text-white"
              >
                View Course
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}