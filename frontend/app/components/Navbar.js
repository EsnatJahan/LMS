"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    function loadUser() {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    }

    // Check when Navbar loads
    loadUser();

    // Listen for login/logout
    window.addEventListener("authChange", loadUser);

    return () => {
      window.removeEventListener("authChange", loadUser);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("user");

    // Immediately update Navbar
    setUser(null);

    window.dispatchEvent(new Event("authChange"));

    router.push("/login");
  }

  return (
    <nav className="border-b bg-white px-8 py-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between">

        <Link href="/" className="text-xl font-bold">
          LMS
        </Link>

        <div className="flex items-center gap-6">

          <Link href="/" className="hover:text-blue-600">
            Courses
          </Link>

          {user ? (
            <>
              <Link
                href="/dashboard"
                className="hover:text-blue-600"
              >
                Dashboard
              </Link>

              <span className="text-sm text-gray-600">
                {user.username}
              </span>

              <button
                onClick={handleLogout}
                className="rounded bg-black px-4 py-2 text-white"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded bg-black px-4 py-2 text-white"
            >
              Login
            </Link>
          )}

        </div>
      </div>
    </nav>
  );
}