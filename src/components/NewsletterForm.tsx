"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function NewsletterForm() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "err" | "invalid">("idle");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.status === 400) setStatus("invalid");
      else if (!res.ok) setStatus("err");
      else {
        setStatus("ok");
        setEmail("");
      }
    } catch {
      setStatus("err");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="border-2 border-fernent-red bg-fernent-red/5 p-5 sm:p-6">
      <h2 className="font-serif text-xl sm:text-2xl font-bold text-black">
        {t.home.newsletterTitle}
      </h2>
      <p className="mt-1 text-sm text-neutral-700">{t.home.newsletterText}</p>
      <form onSubmit={onSubmit} className="mt-4 flex flex-col sm:flex-row gap-2">
        <label className="sr-only" htmlFor="newsletter-email">
          {t.home.newsletterPlaceholder}
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t.home.newsletterPlaceholder}
          className="flex-1 border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-fernent-red"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-fernent-red px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
        >
          {t.home.newsletterSubmit}
        </button>
      </form>
      {status === "ok" && (
        <p className="mt-2 text-sm text-green-800" role="status">
          {t.newsletter.success}
        </p>
      )}
      {status === "invalid" && (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {t.newsletter.invalid}
        </p>
      )}
      {status === "err" && (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {t.newsletter.error}
        </p>
      )}
    </section>
  );
}
