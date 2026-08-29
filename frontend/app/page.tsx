"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.instructor?.username?.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCategory === "all") return matchesSearch;
    if (selectedCategory === "frontend") {
      return (
        matchesSearch &&
        (c.title?.toLowerCase().includes("react") ||
          c.title?.toLowerCase().includes("javascript") ||
          c.title?.toLowerCase().includes("frontend"))
      );
    }
    if (selectedCategory === "backend") {
      return (
        matchesSearch &&
        (c.title?.toLowerCase().includes("api") ||
          c.title?.toLowerCase().includes("node") ||
          c.title?.toLowerCase().includes("strapi") ||
          c.title?.toLowerCase().includes("backend"))
      );
    }
    return matchesSearch;
  });

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      
      {/* ========================================================
          1. CLEAN & ELEGANT HERO SECTION
      ======================================================== */}
      <section className="bg-white border-b border-gray-200 py-14 sm:py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          
          <span className="inline-block bg-gray-100 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full mb-4 border border-gray-200">
            Online Learning Platform
          </span>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Learn Programming & Web Development
          </h1>

          <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Explore step-by-step video courses, interactive lessons, and auto-graded MCQ quizzes to build real-world software skills.
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-black px-6 py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
            >
              Sign Up Free →
            </Link>

            <a
              href="#courses"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition shadow-sm"
            >
              Browse Catalog
            </a>
          </div>

          {/* Feature Badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="text-green-600 font-bold">✓</span> Free Student Access
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-600 font-bold">✓</span> Auto-Graded Assessments
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-600 font-bold">✓</span> Real-Time Progress Tracking
            </span>
          </div>

        </div>
      </section>

      {/* ========================================================
          2. FEATURE HIGHLIGHTS (Clean & Compact)
      ======================================================== */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="rounded-xl bg-white p-5 border border-gray-200 shadow-sm">
            <div className="text-2xl mb-2">📺</div>
            <h3 className="font-bold text-sm text-gray-900">Video Lessons</h3>
            <p className="text-xs text-gray-500 mt-1">
              Curated HD video lectures embedded directly inside structured lessons.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 border border-gray-200 shadow-sm">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-bold text-sm text-gray-900">MCQ Quizzes</h3>
            <p className="text-xs text-gray-500 mt-1">
              Instant automated scoring with complete per-question answer breakdowns.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 border border-gray-200 shadow-sm">
            <div className="text-2xl mb-2">📈</div>
            <h3 className="font-bold text-sm text-gray-900">Progress Tracking</h3>
            <p className="text-xs text-gray-500 mt-1">
              Persistent lesson completion bars saved directly to your account.
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 border border-gray-200 shadow-sm">
            <div className="text-2xl mb-2">👥</div>
            <h3 className="font-bold text-sm text-gray-900">Dedicated Portals</h3>
            <p className="text-xs text-gray-500 mt-1">
              Tailored dashboards for students, instructors, and content managers.
            </p>
          </div>

        </div>
      </section>

      {/* ========================================================
          3. FEATURED COURSES CATALOG
      ======================================================== */}
      <section id="courses" className="py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Available Courses ({courses.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Select a course to view curriculum and enroll for free
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-52">
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-xs focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-xs text-gray-400 hover:text-black"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-gray-200/70 p-1 rounded-lg">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  selectedCategory === "all"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedCategory("frontend")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  selectedCategory === "frontend"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Frontend
              </button>
              <button
                onClick={() => setSelectedCategory("backend")}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  selectedCategory === "backend"
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-600 hover:text-black"
                }`}
              >
                Backend
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-white p-6 border border-gray-200 animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-12 bg-gray-100 rounded" />
                <div className="h-9 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="rounded-xl bg-white p-10 text-center text-gray-500 border border-gray-200 max-w-sm mx-auto">
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-bold text-gray-800 text-base">No courses found</h3>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              Try adjusting your search keywords or category.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="rounded-lg bg-black px-4 py-1.5 text-xs font-bold text-white hover:bg-gray-800 transition"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => {
              const lessonsCount = course.lessons?.length || 0;
              const hasQuiz = course.quizzes && course.quizzes.length > 0;
              const instructorName = course.instructor?.username || "LMS Faculty";

              return (
                <div
                  key={course.documentId || course.id}
                  className="rounded-xl bg-white p-6 shadow-sm border border-gray-200 hover:border-gray-400 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                        Course
                      </span>
                      {hasQuiz && (
                        <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          Quiz Included
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-gray-900 tracking-tight leading-snug line-clamp-2">
                      {course.title}
                    </h3>

                    <p className="mt-2 text-xs text-gray-600 line-clamp-3 leading-relaxed">
                      {course.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3 font-medium">
                      <span>👨‍🏫 {instructorName}</span>
                      <span>📖 {lessonsCount} Lessons</span>
                    </div>

                    <Link
                      href={`/courses/${course.documentId || course.id}`}
                      className="block w-full text-center rounded-lg bg-black py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition shadow-sm"
                    >
                      View Course →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================
          4. CLEAN BOTTOM CTA BANNER
      ======================================================== */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="rounded-2xl bg-white p-8 sm:p-10 border border-gray-200 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            Ready to Start Learning?
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm mt-1 max-w-lg mx-auto">
            Create your free student account in seconds to enroll in courses, take quizzes, and track your progress.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-lg bg-black px-6 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition shadow-sm"
            >
              Sign Up as Student Free →
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

    </main>
  );
}
