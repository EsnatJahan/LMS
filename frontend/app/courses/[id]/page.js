"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function CourseDetails() {
  const params = useParams();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [enrolling, setEnrolling] = useState(false);
  const [enrollMessage, setEnrollMessage] = useState("");

  useEffect(() => {
    async function fetchCourse() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${params.id}?populate=*`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error("Failed to load course");
        }

        setCourse(data.data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchCourse();
    }
  }, [params.id]);

  async function handleEnroll() {
  setEnrollMessage("");

  const jwt = localStorage.getItem("jwt");
  const storedUser = localStorage.getItem("user");

  if (!jwt || !storedUser) {
    setEnrollMessage("Please login first.");
    return;
  }

  const user = JSON.parse(storedUser);

  setEnrolling(true);

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            users_permissions_user: user.id,
            course: course.id,
          },
        }),
      }
    );

    const data = await response.json();

    console.log("Enrollment response:", data);

    // if (!response.ok) {
    //   throw new Error(
    //     data?.error?.message || "Enrollment failed"
    //   );
    // }

//    setEnrollMessage("Successfully enrolled!");
  } catch (error) {
    console.error("Enrollment error:", error);
    setEnrollMessage(error.message);
  } finally {
    setEnrolling(false);
  }
}

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

  if (!course) {
    return <main className="p-10">Course not found.</main>;
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-4xl">

        <h1 className="text-4xl font-bold">
          {course.title}
        </h1>

        <p className="mt-4 text-gray-600">
          {course.description}
        </p>

        <section className="mt-8">
          <h2 className="text-2xl font-bold">
            Lessons
          </h2>

          <div className="mt-4 space-y-3">
            {(course.lessons || []).map((lesson, index) => (
              <div
                key={lesson.documentId || lesson.id}
                className="rounded bg-white p-4 shadow"
              >
                <p className="font-semibold">
                  {index + 1}. {lesson.title}
                </p>

                <p className="mt-2 text-gray-600">
                  {lesson.content}
                </p>
              </div>
            ))}
          </div>
        </section>

        <button
          onClick={handleEnroll}
          disabled={enrolling}
          className="mt-8 rounded bg-black px-6 py-3 text-white disabled:opacity-50"
        >
          {enrolling ? "Enrolling..." : "Enroll"}
        </button>

        {enrollMessage && (
          <p className="mt-4 font-medium">
            {enrollMessage}
          </p>
        )}

      </div>
    </main>
  );
}