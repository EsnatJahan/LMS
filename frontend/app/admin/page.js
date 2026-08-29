"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadAdminData() {
      try {
        const storedUser = localStorage.getItem("user");
        const jwt = localStorage.getItem("jwt");

        if (!storedUser || !jwt) {
          router.push("/login");
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        setCurrentUser(parsedUser);

        if (parsedUser.role?.name !== "Admin") {
          setError("Access Denied: Only administrators have access to this page.");
          setLoading(false);
          return;
        }

        // Fetch Stats
        const statsRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const statsData = await statsRes.json();
        if (statsRes.ok) {
          setStats(statsData.data);
        }

        // Fetch Users
        const usersRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const usersData = await usersRes.json();
        if (usersRes.ok) {
          setUsers(usersData.data || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, [router]);

  async function handleRoleChange(userId, newRoleName) {
    setUpdatingUserId(userId);
    setSuccessMessage("");
    setError("");

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ roleName: newRoleName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to update role");
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.data.role } : u))
      );

      setSuccessMessage(data.message || `Role updated to ${newRoleName}`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-lg font-semibold text-gray-600 animate-pulse">
          Loading Admin Control Center...
        </div>
      </main>
    );
  }

  if (error && currentUser?.role?.name !== "Admin") {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="max-w-md rounded-xl bg-white p-8 shadow text-center border border-red-100">
          <div className="text-4xl mb-3">⛔</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 text-sm mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-700 text-white text-xs font-black uppercase px-2.5 py-1 rounded">
                Admin Panel
              </span>
              <span className="text-xs text-gray-500 font-mono">Platform Control</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              System Administration
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/manage/courses"
              className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 transition"
            >
              📚 Manage Courses
            </Link>
            <Link
              href="/manage/blogs"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 transition"
            >
              ✍️ Manage Blogs
            </Link>
          </div>
        </div>

        {successMessage && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 text-sm font-semibold text-green-800 border border-green-200">
            ✅ {successMessage}
          </div>
        )}

        {/* Platform Analytics Cards */}
        {stats && (
          <section className="mb-10">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">
              Platform Analytics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              
              <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="text-xs font-semibold text-gray-500">Total Users</div>
                <div className="text-3xl font-black text-gray-900 mt-2">{stats.totalUsers}</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Students: {stats.usersByRole?.Student || 0}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="text-xs font-semibold text-gray-500">Instructors</div>
                <div className="text-3xl font-black text-amber-600 mt-2">
                  {stats.usersByRole?.Instructor || 0}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Content Mgrs: {stats.usersByRole?.['Content Manager'] || 0}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="text-xs font-semibold text-gray-500">Total Courses</div>
                <div className="text-3xl font-black text-blue-600 mt-2">{stats.totalCourses}</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Lessons: {stats.totalLessons}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="text-xs font-semibold text-gray-500">Enrollments</div>
                <div className="text-3xl font-black text-green-600 mt-2">{stats.totalEnrollments}</div>
                <div className="text-[11px] text-gray-400 mt-1">Student enrollments</div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="text-xs font-semibold text-gray-500">MCQ Quizzes</div>
                <div className="text-3xl font-black text-indigo-600 mt-2">{stats.totalQuizzes}</div>
                <div className="text-[11px] text-gray-400 mt-1">
                  Submissions: {stats.totalQuizResults}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="text-xs font-semibold text-gray-500">Blog Posts</div>
                <div className="text-3xl font-black text-purple-600 mt-2">{stats.totalBlogPosts}</div>
                <div className="text-[11px] text-gray-400 mt-1">Draft & Published</div>
              </div>

            </div>
          </section>
        )}

        {/* User Role Management Table */}
        <section className="rounded-xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">User Role Management</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign and modify user roles in real-time per the LMS permission matrix
              </p>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-y border-gray-200">
                <tr>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Current Role</th>
                  <th className="py-3.5 px-4">Assign New Role</th>
                  <th className="py-3.5 px-4">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleName = u.role?.name || "Student";
                    const isSelf = u.id === currentUser.id;

                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          {u.username}
                          {isSelf && (
                            <span className="ml-2 text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{u.email}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                              roleName === "Admin"
                                ? "bg-purple-100 text-purple-800"
                                : roleName === "Content Manager"
                                ? "bg-blue-100 text-blue-800"
                                : roleName === "Instructor"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {roleName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={roleName}
                            disabled={updatingUserId === u.id}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="rounded-lg border border-gray-300 p-1.5 text-xs bg-white focus:border-black focus:outline-none disabled:bg-gray-100 cursor-pointer font-medium"
                          >
                            <option value="Student">Student</option>
                            <option value="Instructor">Instructor</option>
                            <option value="Content Manager">Content Manager</option>
                            <option value="Admin">Admin</option>
                          </select>
                          {updatingUserId === u.id && (
                            <span className="ml-2 text-xs text-gray-400">Saving...</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-gray-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}

