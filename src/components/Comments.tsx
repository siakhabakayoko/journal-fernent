"use client";

import { useEffect, useState } from "react";
import type { Comment } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function Comments({
  articleId,
  enabled,
}: {
  articleId: string;
  enabled: boolean;
}) {
  const { t } = useLanguage();
  const [comments, setComments] = useState<Comment[]>([]);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    fetch(`/api/comments?articleId=${encodeURIComponent(articleId)}`)
      .then((r) => r.json())
      .then((data) => setComments(data.comments || []))
      .catch(() => setComments([]));
  }, [articleId, enabled]);

  if (!enabled) {
    return (
      <section className="mt-10 border-t border-neutral-200 pt-6">
        <h2 className="font-serif text-xl font-bold">{t.article.comments}</h2>
        <p className="mt-2 text-sm text-neutral-600">{t.article.commentsOff}</p>
      </section>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, author, body }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setBody("");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mt-10 border-t border-neutral-200 pt-6">
      <h2 className="font-serif text-xl font-bold">{t.article.comments}</h2>
      <ul className="mt-4 space-y-3">
        {comments.length === 0 && (
          <li className="text-sm text-neutral-500">{t.article.noComments}</li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="border border-neutral-200 bg-neutral-50 p-3">
            <div className="text-xs font-semibold text-fernent-red">{c.author}</div>
            <p className="mt-1 text-sm text-neutral-800 whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide">{t.article.leaveComment}</h3>
        <div>
          <label className="block text-xs text-neutral-600 mb-1" htmlFor="c-name">
            {t.article.name}
          </label>
          <input
            id="c-name"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-fernent-red"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-600 mb-1" htmlFor="c-body">
            {t.article.message}
          </label>
          <textarea
            id="c-body"
            required
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-fernent-red"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-fernent-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {t.article.publish}
        </button>
      </form>
    </section>
  );
}
