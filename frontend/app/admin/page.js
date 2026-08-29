"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "../components/Toast";

export default function AdminDashboard() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState(null);
  const [updatingCourseId, setUpdatingCourseId] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [courseSearchQuery, setCourseSearchQuery] = useState("");

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

        // 1. Fetch Stats
        const statsRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/admin/stats`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const statsData = await statsRes.json();
        if (statsRes.ok) {
          setStats(statsData.data);
        }

        // 2. Fetch Users
        const usersRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/admin/users`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const usersData = await usersRes.json();
        if (usersRes.ok) {
          setUsers(usersData.data || []);
        }

        // 3. Fetch Courses
        const coursesRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses?populate=*`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        const coursesData = await coursesRes.json();
        if (coursesRes.ok) {
          setCourses(coursesData.data || []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAdminData();
  }, [router]);

  // Handle changing user role
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

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.data.role } : u))
      );

      setSuccessMessage(data.message || `Role updated to ${newRoleName}`);
      toast.success(data.message || `Role updated to ${newRoleName}`);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    } finally {
      setUpdatingUserId(null);
    }
  }

  // Handle assigning instructor to a course
  async function handleAssignInstructor(courseIdentifier, instructorId) {
    setUpdatingCourseId(courseIdentifier);
    setSuccessMessage("");
    setError("");

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/courses/${courseIdentifier}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            instructor: instructorId || null,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to assign instructor");
      }

      const assignedUser = users.find((u) => u.id === Number(instructorId) || u.documentId === instructorId);

      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseIdentifier || c.documentId === courseIdentifier
            ? {
                ...c,
                instructor: assignedUser
                  ? { id: assignedUser.id, documentId: assignedUser.documentId, username: assignedUser.username, email: assignedUser.email }
                  : null,
              }
            : c
        )
      );

      setSuccessMessage(
        assignedUser
          ? `Successfully assigned ${assignedUser.username} as instructor.`
          : "Course unassigned from instructor."
      );
      const msg = assignedUser
        ? `Successfully assigned ${assignedUser.username} as instructor.`
        : "Course unassigned from instructor.";
      setSuccessMessage(msg);
      toast.success(msg);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    } finally {
      setUpdatingCourseId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-sm font-semibold text-gray-500 animate-pulse">
          Loading Admin Control Center...
        </div>
      </main>
    );
  }

  if (error && currentUser?.role?.name !== "Admin") {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="max-w-md rounded-xl bg-white p-8 shadow text-center border border-red-100">
          <div className="text-3xl mb-3">⛔</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 text-xs mb-6">{error}</p>
          <Link
            href="/dashboard"
            className="rounded-lg bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const instructorsList = users.filter(
    (u) => u.role?.name === "Instructor" || u.role?.name === "Admin" || u.role?.name === "Content Manager"
  );

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCourses = courses.filter(
    (c) =>
      c.title?.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
      c.instructor?.username?.toLowerCase().includes(courseSearchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10 text-gray-900">
      <div className="mx-auto max-w-7xl space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-700 text-white text-xs font-bold uppercase px-2.5 py-0.5 rounded">
                Admin Panel
              </span>
              <span className="text-xs text-gray-500 font-mono">Platform Oversight & Role Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              System Administration
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/manage/courses"
              className="rounded-lg bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition"
            >
              📚 Manage Courses Hub
            </Link>
            <Link
              href="/manage/blogs"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
            >
              ✍️ Manage Blogs
            </Link>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-xl bg-green-50 p-4 text-xs font-bold text-green-800 border border-green-200">
            ✅ {successMessage}
          </div>
        )}

        {/* Platform Analytics Cards */}
        {stats && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
              Platform Analytics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              
              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200">
                <div className="text-[11px] font-semibold text-gray-500">Total Users</div>
                <div className="text-2xl font-black text-gray-900 mt-1">{stats.totalUsers}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Students: {stats.usersByRole?.Student || 0}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200">
                <div className="text-[11px] font-semibold text-gray-500">Instructors</div>
                <div className="text-2xl font-black text-amber-600 mt-1">
                  {stats.usersByRole?.Instructor || 0}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Content: {stats.usersByRole?.['Content Manager'] || 0}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200">
                <div className="text-[11px] font-semibold text-gray-500">Courses</div>
                <div className="text-2xl font-black text-blue-600 mt-1">{stats.totalCourses}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Lessons: {stats.totalLessons}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200">
                <div className="text-[11px] font-semibold text-gray-500">Enrollments</div>
                <div className="text-2xl font-black text-green-600 mt-1">{stats.totalEnrollments}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Active enrollments</div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200">
                <div className="text-[11px] font-semibold text-gray-500">Quizzes</div>
                <div className="text-2xl font-black text-indigo-600 mt-1">{stats.totalQuizzes}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  Results: {stats.totalQuizResults}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200">
                <div className="text-[11px] font-semibold text-gray-500">Blog Posts</div>
                <div className="text-2xl font-black text-purple-600 mt-1">{stats.totalBlogPosts}</div>
                <div className="text-[11px] text-gray-400 mt-0.5">Draft & Published</div>
              </div>

            </div>
          </section>
        )}

        {/* ========================================================
            1. COURSE & INSTRUCTOR ASSIGNMENT SECTION
        ======================================================== */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Admin Power
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-1">Course & Instructor Assignments</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign or change the instructor assigned to any course on the platform
              </p>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search courses or instructors..."
                value={courseSearchQuery}
                onChange={(e) => setCourseSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase text-gray-500 border-y border-gray-200">
                <tr>
                  <th className="py-3 px-4">Course Title</th>
                  <th className="py-3 px-4">Curriculum</th>
                  <th className="py-3 px-4">Current Instructor</th>
                  <th className="py-3 px-4">Assign / Change Instructor</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400">
                      No courses found.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => {
                    const currentInstructorId = course.instructor?.id || "";
                    const isSaving = updatingCourseId === course.id || updatingCourseId === course.documentId;

                    return (
                      <tr key={course.id || course.documentId} className="hover:bg-gray-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          {course.title}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500">
                          📖 {course.lessons?.length || 0} Lessons • ❓ {course.quizzes?.length || 0} Quizzes
                        </td>
                        <td className="py-3.5 px-4">
                          {course.instructor ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-gray-800 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full text-xs">
                              👨‍🏫 {course.instructor.username}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">
                              (Unassigned)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={currentInstructorId}
                              disabled={isSaving}
                              onChange={(e) => handleAssignInstructor(course.documentId || course.id, e.target.value)}
                              className="rounded-lg border border-gray-300 p-1.5 text-xs bg-white focus:border-black focus:outline-none disabled:bg-gray-100 cursor-pointer font-medium"
                            >
                              <option value="">-- Select Instructor --</option>
                              {instructorsList.map((inst) => (
                                <option key={inst.id} value={inst.id}>
                                  {inst.username} ({inst.role?.name})
                                </option>
                              ))}
                            </select>
                            {isSaving && (
                              <span className="text-[11px] text-blue-600 font-semibold animate-pulse">
                                Assigning...
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/courses/${course.documentId || course.id}`}
                            className="text-xs font-semibold text-black hover:underline"
                          >
                            View Course →
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ========================================================
            2. USER ROLE MANAGEMENT SECTION
        ======================================================== */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                Role Permissions
              </span>
              <h2 className="text-lg font-bold text-gray-900 mt-1">User Role Management</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Assign and modify user roles in real-time (Student, Instructor, Content Manager, Admin)
              </p>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2 text-xs focus:border-black focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[11px] font-semibold uppercase text-gray-500 border-y border-gray-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Current Role</th>
                  <th className="py-3 px-4">Assign New Role</th>
                  <th className="py-3 px-4">Registered Date</th>
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
                        <td className="py-3.5 px-4 font-bold text-gray-900">
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
                            className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
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
