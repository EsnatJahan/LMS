"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function BlogListPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPosts() {
      try {
        const jwt = localStorage.getItem("jwt");
        const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blog-posts?populate=users_permissions_user&sort=createdAt:desc`,
          { headers }
        );

        const data = await res.json();
        if (res.ok) {
          setPosts(data.data || []);
        } else {
          throw new Error(data?.error?.message || "Failed to load blog posts");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-semibold animate-pulse">Loading LMS Articles & Blog...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-widest bg-black text-white px-3 py-1 rounded-full">
            Knowledge Base
          </span>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight mt-3">
            LMS Educational Blog
          </h1>
          <p className="text-base text-gray-600 mt-2">
            Articles, tutorials, learning strategies, and updates from our instructors & editors.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200 mb-6 text-center">
            {error}
          </div>
        )}

        {posts.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center text-gray-400 border border-gray-100 max-w-md mx-auto">
            <div className="text-4xl mb-2">📝</div>
            <h2 className="text-lg font-bold text-gray-700">No published articles yet</h2>
            <p className="text-xs text-gray-400 mt-1">Check back later for new learning content!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => {
              const author = post.users_permissions_user?.username || "Editorial Team";
              const cover = post.coverImage || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=60";

              return (
                <article
                  key={post.id}
                  className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col"
                >
                  <div className="aspect-[16/9] w-full bg-gray-100 relative overflow-hidden">
                    <img
                      src={cover}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-105 transition duration-300"
                    />
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-2 font-medium">
                        <span>✍️ {author}</span>
                        <span>•</span>
                        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                      </div>

                      <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-snug line-clamp-2 hover:text-blue-600 transition">
                        <Link href={`/blog/${post.documentId || post.id}`}>
                          {post.title}
                        </Link>
                      </h2>

                      <p className="text-sm text-gray-600 mt-2 line-clamp-3 leading-relaxed">
                        {post.body}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <Link
                        href={`/blog/${post.documentId || post.id}`}
                        className="text-xs font-bold text-black hover:underline"
                      >
                        Read Article →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}

