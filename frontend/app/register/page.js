"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/custom-auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || "Registration failed");
      }

      localStorage.setItem("jwt", data.jwt);
      localStorage.setItem("user", JSON.stringify(data.user));

      window.dispatchEvent(new Event("authChange"));
      router.push("/dashboard");
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
            Create Student Account
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign up for free to access all courses, lessons, and quizzes
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
              placeholder="e.g. johndoe"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
              placeholder="e.g. john@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black transition"
              placeholder="At least 6 characters"
              required
              minLength={6}
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
            {loading ? "Creating Account..." : "Create Student Account"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-black hover:underline">
              Sign in here →
            </Link>
          </p>
        </div>

      </div>
    </main>
  );
}