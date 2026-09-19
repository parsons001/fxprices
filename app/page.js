import { redirect } from "next/navigation";

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (Array.isArray(value)) value.forEach((entry) => query.append(key, entry));
    else if (value !== undefined) query.set(key, value);
  }
  redirect(query.size ? `/convert?${query}` : "/convert");
}
