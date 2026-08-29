"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function SingleBlogPostPage() {
  const { id } = useParams();
  const router = useRouter();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPost() {
      try {
        const jwt = localStorage.getItem("jwt");
        const headers = jwt ? { Authorization: `Bearer ${jwt}` } : {};

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/blog-posts/${id}?populate=users_permissions_user`,
          { headers }
        );

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error?.message || "Article not found or not published");
        }

        setPost(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) fetchPost();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500 font-semibold animate-pulse">Loading article...</div>
      </main>
    );
  }

  if (error || !post) {
    return (
      <main className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow border border-gray-100 max-w-md">
          <div className="text-4xl mb-2">📰</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Article Not Found</h1>
          <p className="text-xs text-gray-500 mb-4">{error || "This article may be a draft or has been removed."}</p>
          <Link href="/blog" className="text-xs font-bold text-black underline">
            ← Back to Blog
          </Link>
        </div>
      </main>
    );
  }

  const author = post.users_permissions_user?.username || "Editorial Team";
  const cover = post.coverImage;

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/blog" className="text-sm font-semibold text-gray-600 hover:text-black transition">
            ← Back to All Articles
          </Link>
        </div>

        {/* Article Container */}
        <article className="rounded-2xl bg-white p-6 sm:p-10 shadow-sm border border-gray-100">
          
          <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold mb-3">
            <span>✍️ Written by <strong>{author}</strong></span>
            <span>•</span>
            <span>📅 {new Date(post.createdAt).toLocaleDateString()}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
            {post.title}
          </h1>

          {cover && (
            <div className="mt-8 rounded-xl overflow-hidden shadow-sm aspect-[16/9] w-full bg-gray-100">
              <img
                src={cover}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="mt-8 text-base text-gray-800 leading-relaxed whitespace-pre-wrap font-normal">
            {post.body}
          </div>

          <div className="mt-10 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>LMS Academy Editorial</span>
            <Link href="/blog" className="font-bold text-black hover:underline">
              Read more articles →
            </Link>
          </div>

        </article>

      </div>
    </main>
  );
}

