import type { Metadata } from "next";
import { isAdminAuthenticated } from "@/lib/auth";
import { getArticles } from "@/lib/articles";
import { AdminPanel } from "@/components/AdminPanel";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  const articles = authed ? await getArticles() : [];
  return (
    <div className="mx-auto max-w-5xl px-3 sm:px-4 py-8 sm:py-10">
      <AdminPanel initialAuthed={authed} initialArticles={articles} />
    </div>
  );
}
