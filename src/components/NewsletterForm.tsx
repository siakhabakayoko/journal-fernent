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
    <section className="border border-fernent-red bg-gradient-to-br from-fernent-red/[0.07] to-paper-elevated p-5 sm:p-6">
      <p className="kicker mb-1">Newsletter</p>
      <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink">
        {t.home.newsletterTitle}
      </h2>
      <p className="mt-1.5 text-sm text-muted leading-relaxed">
        {t.home.newsletterText}
      </p>
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
          className="flex-1 border border-rule-strong bg-paper-elevated px-3 py-2.5 text-sm outline-none focus:border-fernent-red transition-colors"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-fernent-red px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-fernent-red-deep active:scale-[0.98] disabled:opacity-60 transition-all"
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
        <p className="mt-2 text-sm text-fernent-red" role="alert">
          {t.newsletter.invalid}
        </p>
      )}
      {status === "err" && (
        <p className="mt-2 text-sm text-fernent-red" role="alert">
          {t.newsletter.error}
        </p>
      )}
    </section>
  );
}
