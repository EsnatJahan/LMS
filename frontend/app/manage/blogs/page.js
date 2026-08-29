"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "../../components/Toast";

export default function ManageBlogsPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentUser, setCurrentUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create/Edit Form States
  const [showModal, setShowModal] = useState(false);
  const [editingPostId, setEditingPostId] = useState(null);
  const [title, setTitle] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [body, setBody] = useState("");
  const [postStatus, setPostStatus] = useState("draft");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const storedUser = localStorage.getItem("user");
        const jwt = localStorage.getItem("jwt");

        if (!storedUser || !jwt) {
          router.push("/login");
          return;
        }

        const user = JSON.parse(storedUser);
        setCurrentUser(user);

        const roleName = user.role?.name;
        if (roleName !== "Admin" && roleName !== "Content Manager") {
          setError("Access Denied: Only Administrators and Content Managers can write and manage blog posts.");
          setLoading(false);
          return;
        }

        await fetchPosts(jwt);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function fetchPosts(jwt) {
    const token = jwt || localStorage.getItem("jwt");
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blog-posts?populate=users_permissions_user&sort=createdAt:desc`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const data = await res.json();
    if (res.ok) {
      setPosts(data.data || []);
    }
  }

  function handleOpenCreate() {
    setEditingPostId(null);
    setTitle("");
    setCoverImage("");
    setBody("");
    setPostStatus("draft");
    setShowModal(true);
  }

  function handleOpenEdit(post) {
    setEditingPostId(post.id);
    setTitle(post.title || "");
    setCoverImage(post.coverImage || "");
    setBody(post.body || "");
    setPostStatus(post.postStatus || "draft");
    setShowModal(true);
  }

  async function handleSavePost(e) {
    e.preventDefault();
    setSaving(true);

    try {
      const jwt = localStorage.getItem("jwt");
      const url = editingPostId
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blog-posts/${editingPostId}`
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blog-posts`;

      const method = editingPostId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            title,
            coverImage,
            body,
            postStatus,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Failed to save blog post");

      alert(editingPostId ? "Article updated successfully!" : "Article created successfully!");
      toast.success(editingPostId ? "Article updated successfully!" : "Article created successfully!");
      setShowModal(false);
      await fetchPosts();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(post) {
    const newStatus = post.postStatus === "published" ? "draft" : "published";

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blog-posts/${post.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: {
            postStatus: newStatus,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle status");
      toast.success(`Article ${newStatus === "published" ? "published" : "moved to draft"}!`);
      await fetchPosts();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    }
  }

  async function handleDeletePost(postId) {
    if (!confirm("Are you sure you want to delete this blog post?")) return;

    try {
      const jwt = localStorage.getItem("jwt");
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blog-posts/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) throw new Error("Failed to delete post");
      alert("Post deleted successfully!");
      toast.success("Post deleted successfully!");
      await fetchPosts();
    } catch (err) {
      alert(err.message);
      toast.error(err.message);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-semibold animate-pulse">Loading Blog Manager...</div>
      </main>
    );
  }

  if (error) {
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

  const isAdmin = currentUser?.role?.name === "Admin";

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-black uppercase px-2.5 py-1 rounded text-white ${
                isAdmin ? "bg-purple-700" : "bg-blue-600"
              }`}>
                {currentUser?.role?.name} Hub
              </span>
              <span className="text-xs text-gray-500 font-mono">Publishing & Editorial</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mt-1">
              Blog & Article Management
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/blog"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
            >
              👁️ View Public Blog
            </Link>
            <button
              onClick={handleOpenCreate}
              className="rounded-lg bg-black px-4 py-2 text-sm font-bold text-white hover:bg-gray-800 transition shadow-sm"
            >
              ✍️ Write New Article
            </button>
          </div>
        </div>

        {/* Create / Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-black text-gray-900 mb-6">
                {editingPostId ? "Edit Blog Post" : "Create New Blog Post"}
              </h2>

              <form onSubmit={handleSavePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Article Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 10 Proven Strategies to Master Programming in 2026"
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cover Image URL (Unsplash or Direct Image Link)
                  </label>
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Publication Status (Draft vs Published)
                  </label>
                  <select
                    value={postStatus}
                    onChange={(e) => setPostStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm bg-white focus:border-black focus:outline-none font-semibold"
                  >
                    <option value="draft">🟡 Draft (Hidden from students & public)</option>
                    <option value="published">🟢 Published (Live on public blog)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Article Content</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Write your article content here..."
                    rows={8}
                    className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-black focus:outline-none"
                    required
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-black px-6 py-2 text-sm font-bold text-white hover:bg-gray-800 disabled:bg-gray-400"
                  >
                    {saving ? "Saving..." : "Save Post"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Posts Table */}
        <section className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Articles ({posts.length})</h2>
            <div className="text-xs text-gray-500">
              Only <strong>Published</strong> articles are visible to students and guests.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="py-3.5 px-6">Title</th>
                  <th className="py-3.5 px-4">Author</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Published Date</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      No blog posts created yet. Click "Write New Article" above to create one.
                    </td>
                  </tr>
                ) : (
                  posts.map((post) => {
                    const isPublished = post.postStatus === "published";
                    const isOwn = post.users_permissions_user?.id === currentUser?.id;
                    const canEdit = isAdmin || isOwn;

                    return (
                      <tr key={post.id} className="hover:bg-gray-50/50 transition">
                        <td className="py-4 px-6 font-bold text-gray-900 max-w-xs truncate">
                          {post.title}
                        </td>
                        <td className="py-4 px-4 text-xs">
                          {post.users_permissions_user?.username || "Admin"}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => canEdit && handleToggleStatus(post)}
                            disabled={!canEdit}
                            className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full transition ${
                              isPublished
                                ? "bg-green-100 text-green-800 hover:bg-green-200"
                                : "bg-amber-100 text-amber-800 hover:bg-amber-200"
                            } ${!canEdit ? "cursor-not-allowed opacity-75" : "cursor-pointer"}`}
                            title="Click to toggle status"
                          >
                            <span>{isPublished ? "🟢 Published" : "🟡 Draft"}</span>
                          </button>
                        </td>
                        <td className="py-4 px-4 text-xs text-gray-400">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          {canEdit ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(post)}
                                className="text-xs font-bold text-blue-600 hover:underline"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="text-xs font-bold text-red-600 hover:underline"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-300">Read only</span>
                          )}
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

