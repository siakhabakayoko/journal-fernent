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
      <section className="mt-12 border-t border-rule pt-8">
        <h2 className="font-serif text-xl font-bold">{t.article.comments}</h2>
        <p className="mt-2 text-sm text-muted">{t.article.commentsOff}</p>
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
    <section className="mt-12 border-t border-rule pt-8">
      <p className="kicker mb-1">Débat</p>
      <h2 className="font-serif text-xl font-bold">{t.article.comments}</h2>
      <ul className="mt-5 space-y-3">
        {comments.length === 0 && (
          <li className="text-sm text-muted">{t.article.noComments}</li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="border border-rule bg-paper-elevated p-4">
            <div className="kicker !text-[0.65rem]">{c.author}</div>
            <p className="mt-1.5 text-sm text-ink whitespace-pre-wrap leading-relaxed">
              {c.body}
            </p>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="mt-8 space-y-3 border border-rule bg-paper-elevated p-5">
        <h3 className="kicker">{t.article.leaveComment}</h3>
        <div>
          <label className="block text-xs text-muted mb-1" htmlFor="c-name">
            {t.article.name}
          </label>
          <input
            id="c-name"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full border border-rule-strong bg-paper px-3 py-2 text-sm outline-none focus:border-fernent-red transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1" htmlFor="c-body">
            {t.article.message}
          </label>
          <textarea
            id="c-body"
            required
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full border border-rule-strong bg-paper px-3 py-2 text-sm outline-none focus:border-fernent-red transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-fernent-red px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-fernent-red-deep disabled:opacity-60 transition-colors"
        >
          {t.article.publish}
        </button>
      </form>
    </section>
  );
}
