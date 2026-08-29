"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e, customId, customPass) {
    if (e) e.preventDefault();

    const loginId = customId || identifier;
    const loginPass = customPass || password;

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/custom-auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: loginId,
            password: loginPass,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message || data?.message || "Invalid email or password"
        );
      }

      localStorage.setItem("jwt", data.jwt);
      localStorage.setItem("user", JSON.stringify(data.user));

      window.dispatchEvent(new Event("authChange"));

      const roleName = data.user?.role?.name;
      if (roleName === "Admin") {
        router.push("/admin");
      } else if (roleName === "Instructor" || roleName === "Content Manager") {
        router.push("/manage/courses");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function fillAndLogin(id, pass) {
    setIdentifier(id);
    setPassword(pass);
    handleLogin(null, id, pass);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md border border-gray-100">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in to access your LMS courses and dashboard
          </p>
        </div>

        {/* 1-Click Role Quick Login Section */}
        <div className="mb-6 rounded-lg bg-gray-50 p-3.5 border border-gray-200">
          <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2 text-center">
            🚀 Quick Demo Logins (Click to Test)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillAndLogin("student@test.com", "password123")}
              className="rounded bg-green-50 px-2 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 border border-green-200 text-left transition"
            >
              🎓 Student
            </button>
            <button
              type="button"
              onClick={() => fillAndLogin("instructor@test.com", "password123")}
              className="rounded bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 border border-amber-200 text-left transition"
            >
              👨‍🏫 Instructor
            </button>
            <button
              type="button"
              onClick={() => fillAndLogin("content@test.com", "password123")}
              className="rounded bg-blue-50 px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200 text-left transition"
            >
              ✍️ Content Manager
            </button>
            <button
              type="button"
              onClick={() => fillAndLogin("admin@test.com", "password123")}
              className="rounded bg-purple-50 px-2 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 border border-purple-200 text-left transition"
            >
              👑 Admin
            </button>
          </div>
        </div>

        <form onSubmit={(e) => handleLogin(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="student@test.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
              placeholder="password123"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition disabled:bg-gray-400"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <Link href="/register" className="font-semibold text-black hover:underline">
            Register here
          </Link>
        </p>

      </div>
    </main>
  );
}