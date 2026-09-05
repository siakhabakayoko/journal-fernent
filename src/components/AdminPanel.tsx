"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import type { Article, MonthlyIssue, Rubric } from "@/lib/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const RUBRIC_OPTIONS: Rubric[] = [
  "senegal",
  "afrique",
  "international",
  "economie",
  "social",
  "notre-journal",
];

type ArticleDraft = {
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
  coverImage: string;
};

type IssueDraft = {
  id?: string;
  title: string;
  slug: string;
  month: number;
  year: number;
  description: string;
  pdfUrl: string;
  coverImage: string;
  publishedAt: string;
};

const emptyArticleDraft = (): ArticleDraft => ({
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  rubric: "senegal",
  author: "Rédaction Ferñent",
  publishedAt: new Date().toISOString().slice(0, 10),
  featured: false,
  commentsEnabled: true,
  coverImage: "",
});

const emptyIssueDraft = (): IssueDraft => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return {
    title: "",
    slug: "",
    month,
    year,
    description: "",
    pdfUrl: "",
    coverImage: "",
    publishedAt: `${year}-${String(month).padStart(2, "0")}-01`,
  };
};

async function uploadFile(file: File): Promise<{ url?: string; error?: string }> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      error:
        data.message ||
        data.error ||
        "Échec de l'upload — collez une URL à la place.",
    };
  }
  return { url: data.url as string };
}

export function AdminPanel({
  initialAuthed,
  initialArticles,
  initialIssues,
}: {
  initialAuthed: boolean;
  initialArticles: Article[];
  initialIssues: MonthlyIssue[];
}) {
  const { t } = useLanguage();
  const [authed, setAuthed] = useState(initialAuthed);
  const [password, setPassword] = useState("");
  const [articles, setArticles] = useState(initialArticles);
  const [issues, setIssues] = useState(initialIssues);
  const [tab, setTab] = useState<"articles" | "issues">("articles");
  const [draft, setDraft] = useState<ArticleDraft | null>(null);
  const [issueDraft, setIssueDraft] = useState<IssueDraft | null>(null);
  const [error, setError] = useState("");
  const [modeNote, setModeNote] = useState("");
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const sorted = useMemo(
    () => [...articles].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [articles],
  );
  const sortedIssues = useMemo(
    () =>
      [...issues].sort(
        (a, b) => b.year - a.year || b.month - a.month,
      ),
    [issues],
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
      const [list, iss] = await Promise.all([
        fetch("/api/admin/articles"),
        fetch("/api/admin/issues"),
      ]);
      if (list.ok) {
        const data = await list.json();
        setArticles(data.articles || []);
      }
      if (iss.ok) {
        const data = await iss.json();
        setIssues(data.issues || []);
      }
    } finally {
      setPending(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthed(false);
    setArticles([]);
    setIssues([]);
    setDraft(null);
    setIssueDraft(null);
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
          : data.mode === "turso"
            ? "Enregistré sur Turso."
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

  async function saveIssueDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!issueDraft) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(issueDraft),
      });
      if (!res.ok) {
        setError("Erreur d'enregistrement");
        return;
      }
      const data = await res.json();
      setModeNote(
        data.mode === "memory"
          ? "Demo mode (mémoire)."
          : data.mode === "turso"
            ? "Enregistré sur Turso."
            : "Enregistré sur disque.",
      );
      setIssues((prev) => {
        const next = prev.filter((i) => i.id !== data.issue.id);
        next.unshift(data.issue);
        return next;
      });
      setIssueDraft(null);
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
          data.mode === "memory" ? "Demo mode (mémoire)." : "Supprimé.",
        );
      }
    } finally {
      setPending(false);
    }
  }

  async function removeIssue(id: string) {
    if (!confirm("Supprimer ce numéro ?")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/admin/issues?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setIssues((prev) => prev.filter((i) => i.id !== id));
        setModeNote("Supprimé.");
      }
    } finally {
      setPending(false);
    }
  }

  async function handleUpload(
    file: File | null,
    onUrl: (url: string) => void,
  ) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const result = await uploadFile(file);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.url) onUrl(result.url);
    } finally {
      setUploading(false);
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

      <div className="mt-6 flex gap-2 border-b border-rule">
        <button
          type="button"
          onClick={() => {
            setTab("articles");
            setIssueDraft(null);
          }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === "articles"
              ? "border-fernent-red text-fernent-red"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.admin.articles}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("issues");
            setDraft(null);
          }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            tab === "issues"
              ? "border-fernent-red text-fernent-red"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {t.admin.issues}
        </button>
      </div>

      {tab === "articles" && (
        <>
          {draft ? (
            <form
              onSubmit={saveDraft}
              className="mt-6 space-y-3 border border-rule p-4 bg-paper-elevated"
            >
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
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.rubric}
                </label>
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
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.coverImage}
                </label>
                <input
                  value={draft.coverImage}
                  onChange={(e) =>
                    setDraft({ ...draft, coverImage: e.target.value })
                  }
                  placeholder="https://… ou /uploads/…"
                  className="w-full border border-rule-strong px-3 py-2 text-sm"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer border border-rule-strong px-3 py-1.5 hover:bg-rule">
                    {uploading ? "…" : t.admin.upload}
                    <input
                      type="file"
                      accept="image/*,.svg"
                      className="sr-only"
                      disabled={uploading}
                      onChange={(e) =>
                        handleUpload(e.target.files?.[0] ?? null, (url) =>
                          setDraft((d) => (d ? { ...d, coverImage: url } : d)),
                        )
                      }
                    />
                  </label>
                  {draft.coverImage && (
                    <div className="relative h-16 w-28 border border-rule overflow-hidden bg-rule">
                      <Image
                        src={draft.coverImage}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized={draft.coverImage.endsWith(".svg")}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.excerpt}
                </label>
                <textarea
                  rows={2}
                  value={draft.excerpt}
                  onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })}
                  className="w-full border border-rule-strong px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.body}
                </label>
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
                    onChange={(e) =>
                      setDraft({ ...draft, featured: e.target.checked })
                    }
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
                onClick={() => setDraft(emptyArticleDraft())}
                className="bg-fernent-red px-4 py-2 text-sm font-semibold text-white hover:bg-fernent-red-deep"
              >
                {t.admin.newArticle}
              </button>
              <h2 className="mt-6 font-serif text-xl font-bold">{t.admin.articles}</h2>
              <ul className="mt-3 divide-y divide-neutral-200 border border-rule">
                {sorted.map((a) => (
                  <li
                    key={a.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between"
                  >
                    <div className="flex gap-3 items-start">
                      {a.coverImage && (
                        <div className="relative h-12 w-20 shrink-0 border border-rule overflow-hidden bg-rule">
                          <Image
                            src={a.coverImage}
                            alt=""
                            fill
                            className="object-cover"
                            unoptimized={a.coverImage.endsWith(".svg")}
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold">{a.title}</div>
                        <div className="text-xs text-neutral-500">
                          {a.publishedAt} · {t.nav[a.rubric]} · /article/{a.slug}
                        </div>
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
                            coverImage: a.coverImage || "",
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
        </>
      )}

      {tab === "issues" && (
        <>
          {issueDraft ? (
            <form
              onSubmit={saveIssueDraft}
              className="mt-6 space-y-3 border border-rule p-4 bg-paper-elevated"
            >
              <h2 className="font-serif text-xl font-bold">
                {issueDraft.id ? t.admin.edit : t.admin.newIssue}
              </h2>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.title}
                </label>
                <input
                  value={issueDraft.title}
                  onChange={(e) =>
                    setIssueDraft({ ...issueDraft, title: e.target.value })
                  }
                  className="w-full border border-rule-strong px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.slug}
                </label>
                <input
                  value={issueDraft.slug}
                  onChange={(e) =>
                    setIssueDraft({ ...issueDraft, slug: e.target.value })
                  }
                  className="w-full border border-rule-strong px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t.admin.fields.month}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={issueDraft.month}
                    onChange={(e) =>
                      setIssueDraft({
                        ...issueDraft,
                        month: Number(e.target.value) || 1,
                      })
                    }
                    className="w-full border border-rule-strong px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    {t.admin.fields.year}
                  </label>
                  <input
                    type="number"
                    min={2020}
                    max={2100}
                    value={issueDraft.year}
                    onChange={(e) =>
                      setIssueDraft({
                        ...issueDraft,
                        year: Number(e.target.value) || new Date().getFullYear(),
                      })
                    }
                    className="w-full border border-rule-strong px-3 py-2 text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.description}
                </label>
                <textarea
                  rows={2}
                  value={issueDraft.description}
                  onChange={(e) =>
                    setIssueDraft({ ...issueDraft, description: e.target.value })
                  }
                  className="w-full border border-rule-strong px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.pdfUrl}
                </label>
                <input
                  value={issueDraft.pdfUrl}
                  onChange={(e) =>
                    setIssueDraft({ ...issueDraft, pdfUrl: e.target.value })
                  }
                  placeholder="https://… ou /uploads/…/numero.pdf"
                  className="w-full border border-rule-strong px-3 py-2 text-sm"
                />
                <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold cursor-pointer border border-rule-strong px-3 py-1.5 hover:bg-rule">
                  {uploading ? "…" : t.admin.uploadPdf}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    disabled={uploading}
                    onChange={(e) =>
                      handleUpload(e.target.files?.[0] ?? null, (url) =>
                        setIssueDraft((d) => (d ? { ...d, pdfUrl: url } : d)),
                      )
                    }
                  />
                </label>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.coverImage}
                </label>
                <input
                  value={issueDraft.coverImage}
                  onChange={(e) =>
                    setIssueDraft({ ...issueDraft, coverImage: e.target.value })
                  }
                  placeholder="https://… ou /covers/…"
                  className="w-full border border-rule-strong px-3 py-2 text-sm"
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer border border-rule-strong px-3 py-1.5 hover:bg-rule">
                    {uploading ? "…" : t.admin.upload}
                    <input
                      type="file"
                      accept="image/*,.svg"
                      className="sr-only"
                      disabled={uploading}
                      onChange={(e) =>
                        handleUpload(e.target.files?.[0] ?? null, (url) =>
                          setIssueDraft((d) =>
                            d ? { ...d, coverImage: url } : d,
                          ),
                        )
                      }
                    />
                  </label>
                  {issueDraft.coverImage && (
                    <div className="relative h-16 w-28 border border-rule overflow-hidden bg-rule">
                      <Image
                        src={issueDraft.coverImage}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized={issueDraft.coverImage.endsWith(".svg")}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  {t.admin.fields.publishedAt}
                </label>
                <input
                  value={issueDraft.publishedAt}
                  onChange={(e) =>
                    setIssueDraft({ ...issueDraft, publishedAt: e.target.value })
                  }
                  className="w-full border border-rule-strong px-3 py-2 text-sm"
                />
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
                  onClick={() => setIssueDraft(null)}
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
                onClick={() => setIssueDraft(emptyIssueDraft())}
                className="bg-fernent-red px-4 py-2 text-sm font-semibold text-white hover:bg-fernent-red-deep"
              >
                {t.admin.newIssue}
              </button>
              <h2 className="mt-6 font-serif text-xl font-bold">{t.admin.issues}</h2>
              <ul className="mt-3 divide-y divide-neutral-200 border border-rule">
                {sortedIssues.map((iss) => (
                  <li
                    key={iss.id}
                    className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between"
                  >
                    <div>
                      <div className="font-semibold">{iss.title}</div>
                      <div className="text-xs text-neutral-500">
                        {String(iss.month).padStart(2, "0")}/{iss.year}
                        {iss.pdfUrl ? " · PDF" : " · PDF manquant"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-sm border border-rule-strong px-2 py-1 hover:bg-paper-elevated"
                        onClick={() =>
                          setIssueDraft({
                            id: iss.id,
                            title: iss.title,
                            slug: iss.slug,
                            month: iss.month,
                            year: iss.year,
                            description: iss.description || "",
                            pdfUrl: iss.pdfUrl || "",
                            coverImage: iss.coverImage || "",
                            publishedAt: iss.publishedAt,
                          })
                        }
                      >
                        {t.admin.edit}
                      </button>
                      <button
                        type="button"
                        className="text-sm border border-red-300 text-red-800 px-2 py-1 hover:bg-red-50"
                        onClick={() => removeIssue(iss.id)}
                      >
                        {t.admin.delete}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
