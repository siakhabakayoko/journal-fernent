"use client";

import { useMemo, useState } from "react";
import type { Article, Rubric } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const RUBRIC_OPTIONS: Rubric[] = [
  "senegal",
  "afrique",
  "international",
  "economie",
  "social",
  "notre-journal",
];

type Draft = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  rubric: Rubric;
  author: string;
  publishedAt: string;
  featured: boolean;
  commentsEnabled: boolean;
};

const emptyDraft = (): Draft => ({
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  rubric: "senegal",
  author: "Rédaction Ferñent",
  publishedAt: new Date().toISOString().slice(0, 10),
  featured: false,
  commentsEnabled: true,
});

export function AdminPanel({
  initialAuthed,
  initialArticles,
}: {
  initialAuthed: boolean;
  initialArticles: Article[];
}) {
  const { t } = useLanguage();
  const [authed, setAuthed] = useState(initialAuthed);
  const [password, setPassword] = useState("");
  const [articles, setArticles] = useState(initialArticles);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [modeNote, setModeNote] = useState("");
  const [pending, setPending] = useState(false);

  const sorted = useMemo(
    () => [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [articles],
  );

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError(t.admin.unauthorized);
        return;
      }
      setAuthed(true);
      setPassword("");
      const list = await fetch("/api/admin/articles");
      if (list.ok) {
        const data = await list.json();
        setArticles(data.articles || []);
      }
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setArticles([]);
    setDraft(null);
  }

  async function saveDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) {
        setError("Erreur d'enregistrement");
        return;
      }
      const data = await res.json();
      setModeNote(
        data.mode === "memory"
          ? "Demo mode (mémoire) — persistance limitée sur Vercel."
          : "Enregistré sur disque.",
      );
      setArticles((prev) => {
        const next = prev.filter((a) => a.id !== data.article.id);
        next.unshift(data.article);
        return next;
      });
      setDraft(null);
    } finally {
      setPending(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cet article ?")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/articles?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        setArticles((prev) => prev.filter((a) => a.id !== id));
        setModeNote(
          data.mode === "memory"
            ? "Demo mode (mémoire)."
            : "Supprimé sur disque.",
        );
      }
    } finally {
      setPending(false);
    }
  }

  if (!authed) {
    return (
      <div className="max-w-md">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
          {t.admin.title}
        </h1>
        <p className="mt-3 text-sm text-muted">{t.admin.demoNote}</p>
        <form onSubmit={login} className="mt-6 space-y-3">
          <label className="block text-sm font-semibold" htmlFor="admin-pass">
            {t.admin.password}
          </label>
          <input
            id="admin-pass"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-rule-strong bg-paper-elevated px-3 py-2 text-sm outline-none focus:border-fernent-red transition-colors"
            required
          />
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="bg-fernent-red px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-fernent-red-deep disabled:opacity-60 transition-colors"
          >
            {t.admin.login}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-ink">
          {t.admin.title}
        </h1>
        <button
          type="button"
          onClick={logout}
          className="text-sm font-semibold border border-rule-strong px-3 py-1.5 hover:bg-rule transition-colors"
        >
          {t.admin.logout}
        </button>
      </div>
      <p className="mt-3 text-sm text-muted">{t.admin.demoNote}</p>
      {modeNote && <p className="mt-2 text-sm text-fernent-red">{modeNote}</p>}

      {draft ? (
        <form onSubmit={saveDraft} className="mt-6 space-y-3 border border-rule p-4 bg-paper-elevated">
          <h2 className="font-serif text-xl font-bold">
            {draft.id ? t.admin.edit : t.admin.newArticle}
          </h2>
          {(
            [
              ["title", t.admin.fields.title],
              ["slug", t.admin.fields.slug],
              ["author", t.admin.fields.author],
              ["publishedAt", t.admin.fields.publishedAt],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs font-semibold mb-1">{label}</label>
              <input
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                className="w-full border border-rule-strong px-3 py-2 text-sm"
                required={key === "title"}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold mb-1">{t.admin.fields.rubric}</label>
            <select
              value={draft.rubric}
              onChange={(e) =>
                setDraft({ ...draft, rubric: e.target.value as Rubric })
              }
              className="w-full border border-rule-strong px-3 py-2 text-sm"
            >
              {RUBRIC_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {t.nav[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">{t.admin.fields.excerpt}</label>
            <textarea
              rows={2}
              value={draft.excerpt}
              onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
              className="w-full border border-rule-strong px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">{t.admin.fields.body}</label>
            <textarea
              rows={10}
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              className="w-full border border-rule-strong px-3 py-2 text-sm font-mono"
              required
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => setDraft({ ...draft, featured: e.target.checked })}
              />
              {t.admin.fields.featured}
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.commentsEnabled}
                onChange={(e) =>
                  setDraft({ ...draft, commentsEnabled: e.target.checked })
                }
              />
              {t.admin.fields.commentsEnabled}
            </label>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="bg-fernent-red px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-fernent-red-deep disabled:opacity-60 transition-colors"
            >
              {t.admin.save}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="border border-rule-strong px-4 py-2 text-sm font-semibold"
            >
              {t.admin.cancel}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setDraft(emptyDraft())}
            className="bg-fernent-red px-4 py-2 text-sm font-semibold text-white hover:bg-fernent-red-deep"
          >
            {t.admin.newArticle}
          </button>
          <h2 className="mt-6 font-serif text-xl font-bold">{t.admin.articles}</h2>
          <ul className="mt-3 divide-y divide-neutral-200 border border-rule">
            {sorted.map((a) => (
              <li key={a.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                <div>
                  <div className="font-semibold">{a.title}</div>
                  <div className="text-xs text-neutral-500">
                    {a.publishedAt} · {t.nav[a.rubric]} · /article/{a.slug}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-sm border border-rule-strong px-2 py-1 hover:bg-paper-elevated"
                    onClick={() =>
                      setDraft({
                        id: a.id,
                        title: a.title,
                        slug: a.slug,
                        excerpt: a.excerpt,
                        body: a.body,
                        rubric: a.rubric,
                        author: a.author,
                        publishedAt: a.publishedAt,
                        featured: a.featured,
                        commentsEnabled: a.commentsEnabled,
                      })
                    }
                  >
                    {t.admin.edit}
                  </button>
                  <button
                    type="button"
                    className="text-sm border border-red-300 text-red-800 px-2 py-1 hover:bg-red-50"
                    onClick={() => remove(a.id)}
                  >
                    {t.admin.delete}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
