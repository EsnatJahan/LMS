"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../components/Toast";

export default function CreateCourse() {
  const router = useRouter();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

async function handleSubmit(e) {
  e.preventDefault();

  try {
    const jwt = localStorage.getItem("jwt");

    if (!jwt) {
      toast.info("Please log in first.");
      return;
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            title: title,
            description: description,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error?.message || "Course creation failed"
      );
    }

    toast.success("Course created successfully!");

    setTitle("");
    setDescription("");
  } catch (error) {
    console.error("CREATE COURSE ERROR:", error);
    toast.error(error.message);
  }
}

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="mx-auto max-w-xl rounded bg-white p-8 shadow">

        <h1 className="text-3xl font-bold">
          Create Course
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">

          <div>
            <label className="font-semibold">
              Course Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-2 w-full rounded border p-3"
              placeholder="Enter course title"
              required
            />
          </div>

          <div>
            <label className="font-semibold">
              Description
            </label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 w-full rounded border p-3"
              placeholder="Enter course description"
              rows="5"
              required
            />
          </div>

          <button
            type="submit"
            className="rounded bg-black px-6 py-3 text-white"
          >
            Create Course
          </button>

        </form>
      </div>
    </main>
  );
}