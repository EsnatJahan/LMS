"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function CourseDetails() {
  const { id } = useParams(); // This is likely the course documentId
  const router = useRouter();

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  useEffect(() => {
    async function loadCourseAndEnrollment() {
      try {
        // 1. Fetch Course details
        const courseRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${id}?populate=*`
        );
        const courseData = await courseRes.json();
        setCourse(courseData.data);

        // 2. Check Enrollment Status (if user is logged in)
        const jwt = localStorage.getItem("jwt");
        const userStr = localStorage.getItem("user");

        if (jwt && userStr) {
          const user = JSON.parse(userStr);
          
          // Filter enrollments by both the Course ID and the User ID
          const enrollRes = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments?filters[course][documentId][$eq]=${id}&filters[users_permissions_user][id][$eq]=${user.id}`,
            {
              headers: {
                Authorization: `Bearer ${jwt}`,
              },
            }
          );
          
          const enrollData = await enrollRes.json();
          
          // If the data array has items, the user is already enrolled
          if (enrollData?.data && enrollData.data.length > 0) {
            setIsEnrolled(true);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }

    if (id) loadCourseAndEnrollment();
  }, [id]);

  const handleEnroll = async () => {
    const jwt = localStorage.getItem("jwt");

    if (!jwt) {
      alert("Please login first to enroll.");
      router.push("/login");
      return;
    }

    setEnrolling(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/enrollments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify({
            data: {
              course: id, // Using numeric ID for relation creation
            },
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result?.error?.message || "Failed to enroll");
      }

      alert("Successfully enrolled in the course!");
      setIsEnrolled(true); // Update state instantly so button disappears
      
    } catch (error) {
      console.error("ENROLL ERROR:", error);
      alert(error.message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className="p-10">Loading...</div>;
  }

  if (!course) {
    return <div className="p-10">Course not found</div>;
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">{course.title}</h1>

      <p className="mt-3 text-gray-600">
        {course.description}
      </p>

      <h2 className="mt-8 text-2xl font-bold">
        Lessons
      </h2>

      <div className="mt-4 space-y-3">
        {course.lessons?.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/lessons/${lesson.documentId}`}
            className="block rounded bg-gray-100 p-4 hover:bg-gray-200"
          >
            {lesson.title}
          </Link>
        ))}
      </div>

      {/* Conditionally render the button based on enrollment status */}
      {!isEnrolled ? (
        <button
          onClick={handleEnroll}
          disabled={enrolling}
          className="mt-8 rounded bg-black px-6 py-3 text-white disabled:bg-gray-500"
        >
          {enrolling ? "Enrolling..." : "Enroll"}
        </button>
      ) : (
        <div className="mt-8 inline-block rounded bg-green-100 px-6 py-3 text-green-800 font-semibold">
          ✅ You are enrolled in this course
        </div>
      )}
    </main>
  );
}