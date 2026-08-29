"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);

  useEffect(() => {
    function loadUser() {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    }

    loadUser();
    window.addEventListener("authChange", loadUser);
    return () => {
      window.removeEventListener("authChange", loadUser);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");
    setUser(null);
    window.dispatchEvent(new Event("authChange"));
    router.push("/login");
  }

  const roleName = user?.role?.name || "Student";
  const isAdmin = roleName === "Admin";
  const isContentManager = roleName === "Content Manager";
  const isInstructor = roleName === "Instructor";
  const isStudent = roleName === "Student" || roleName === "Authenticated";

  return (
    <nav className="border-b bg-white px-6 py-3 sticky top-0 z-50 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-black text-gray-900 tracking-tight">
            <span className="bg-black text-white px-2.5 py-1 rounded text-sm font-bold">LMS</span>
            <span>Academy</span>
          </Link>

          {/* Primary Nav Links */}
          <div className="hidden md:flex items-center gap-5 text-sm font-medium text-gray-700">
            <Link
              href="/"
              className={`hover:text-black transition ${pathname === "/" ? "text-black font-bold" : ""}`}
            >
              Courses
            </Link>

            <Link
              href="/blog"
              className={`hover:text-black transition ${pathname.startsWith("/blog") ? "text-black font-bold" : ""}`}
            >
              Blog
            </Link>

            {user && (
              <Link
                href="/dashboard"
                className={`hover:text-black transition ${pathname === "/dashboard" ? "text-black font-bold" : ""}`}
              >
                Dashboard
              </Link>
            )}

            {/* Instructor Links */}
            {(isInstructor || isContentManager || isAdmin) && (
              <Link
                href="/manage/courses"
                className={`hover:text-black transition ${pathname.startsWith("/manage/courses") || pathname.startsWith("/instructor") ? "text-black font-bold" : ""}`}
              >
                Manage Courses
              </Link>
            )}

            {/* Content Manager & Admin Blog Management */}
            {(isContentManager || isAdmin) && (
              <Link
                href="/manage/blogs"
                className={`hover:text-black transition ${pathname.startsWith("/manage/blogs") ? "text-black font-bold" : ""}`}
              >
                Manage Blogs
              </Link>
            )}

            {/* Admin Panel */}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1 text-purple-700 font-bold hover:text-purple-900 transition ${pathname === "/admin" ? "underline" : ""}`}
              >
                <span>⚡ Admin Panel</span>
              </Link>
            )}
          </div>
        </div>

        {/* User Auth Section */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              {/* Role Badge */}
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-gray-900 leading-none">{user.username}</div>
                <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  isAdmin ? "bg-purple-100 text-purple-800" :
                  isContentManager ? "bg-blue-100 text-blue-800" :
                  isInstructor ? "bg-amber-100 text-amber-800" :
                  "bg-green-100 text-green-800"
                }`}>
                  {roleName}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-black px-3.5 py-1.5 text-sm font-medium text-white hover:bg-gray-800 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>

      </div>
    </nav>
  );
}