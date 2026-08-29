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

  async function handleLogin(e) {
    if (e) e.preventDefault();

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
            identifier,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error?.message || data?.message || "Invalid email/username or password"
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 sm:p-10 shadow-sm border border-gray-200">
        
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black text-gray-900 tracking-tight mb-2">
            <span className="bg-black text-white px-3 py-1 rounded-lg text-base font-bold">LMS</span>
            <span>Academy</span>
          </Link>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-3">
            Sign In to Your Account
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Access your courses, dashboard, and learning materials
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
              Email or Username
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
              placeholder="Enter your email or username"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                Password
              </label>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
              placeholder="Enter your password"
              required
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 p-3.5 text-xs font-semibold text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black py-3.5 text-sm font-bold text-white hover:bg-gray-800 transition disabled:bg-gray-400 shadow-sm mt-2"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/register" className="font-bold text-black hover:underline">
              Sign up free →
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}