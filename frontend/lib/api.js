const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL;

export async function strapiFetch(endpoint, options = {}) {
  const response = await fetch(`${STRAPI_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || "Something went wrong");
  }

  return data;
}