"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
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

       const response = await fetch(
  `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments?filters[users_permissions_user][id][$eq]=${currentUser.id}&populate[course][fields][0]=title&populate[course][fields][1]=description`
);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error?.message || "Failed to load courses"
          );
        }

        console.log("Enrollment data:", data.data);

        setEnrollments(data.data || []);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">
            Loading...
          </h1>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-5xl">

        <h1 className="text-3xl font-bold">
          Welcome, {user.username}!
        </h1>

        <p className="mt-2 text-gray-600">
          Welcome to your LMS dashboard.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-block rounded bg-black px-5 py-2 text-white"
          >
            Browse Courses
          </Link>
        </div>

        <section className="mt-10">

          <h2 className="text-2xl font-bold">
            My Courses
          </h2>

          {error && (
            <p className="mt-4 text-red-600">
              {error}
            </p>
          )}

          {!error && enrollments.length === 0 && (
            <p className="mt-4 text-gray-600">
              You have not enrolled in any courses yet.
            </p>
          )}

          {!error && enrollments.length > 0 && (
            <div className="mt-6 grid gap-6 md:grid-cols-2">

              {enrollments.map((enrollment) => {
                const course = enrollment.course;

                return (
                  <div
                    key={enrollment.documentId || enrollment.id}
                    className="rounded-lg bg-white p-6 shadow"
                  >
                    {course ? (
                      <>
                        <h3 className="text-xl font-bold">
                          {course.title}
                        </h3>

                        <p className="mt-2 text-gray-600">
                          {course.description}
                        </p>

                        <Link
                          href={`/courses/${course.documentId}`}
                          className="mt-5 inline-block rounded bg-black px-4 py-2 text-white"
                        >
                          Continue Learning
                        </Link>
                      </>
                    ) : (
                      <p className="text-gray-600">
                        Course information not available.
                      </p>
                    )}
                  </div>
                );
              })}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}