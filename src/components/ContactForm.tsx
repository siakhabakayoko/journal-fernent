"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Props = {
  /** Compact layout for homepage aside */
  compact?: boolean;
};

export function ContactForm({ compact = false }: Props) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "ok" | "err" | "invalid">(
    "idle",
  );
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, body, website }),
      });
      if (res.status === 400) setStatus("invalid");
      else if (!res.ok) setStatus("err");
      else {
        setStatus("ok");
        setName("");
        setEmail("");
        setSubject("");
        setBody("");
        setWebsite("");
      }
    } catch {
      setStatus("err");
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full border border-rule-strong bg-paper-elevated px-3 py-2 text-sm outline-none focus:border-fernent-red transition-colors";

  return (
    <section
      className={
        compact
          ? "relative border border-rule bg-paper-elevated p-5 sm:p-6"
          : "relative border border-rule bg-paper-elevated p-6 sm:p-8"
      }
    >
      {!compact && <p className="kicker mb-1">{t.contact.formKicker}</p>}
      <h2
        className={
          compact
            ? "font-serif text-lg font-bold"
            : "font-serif text-xl sm:text-2xl font-bold"
        }
      >
        {t.contact.formTitle}
      </h2>
      {compact && (
        <p className="mt-1.5 text-sm text-muted leading-relaxed">
          {t.contact.formIntroCompact}
        </p>
      )}
      <form onSubmit={onSubmit} className={compact ? "mt-4 space-y-3" : "mt-5 space-y-3"}>
        {/* Honeypot — hidden from users */}
        <div className="absolute -left-[9999px] opacity-0 h-0 overflow-hidden" aria-hidden>
          <label htmlFor={compact ? "cf-website-c" : "cf-website"}>
            Website
          </label>
          <input
            id={compact ? "cf-website-c" : "cf-website"}
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </div>
        <div className={compact ? "space-y-3" : "grid gap-3 sm:grid-cols-2"}>
          <div>
            <label
              className="block text-xs font-semibold mb-1"
              htmlFor={compact ? "cf-name-c" : "cf-name"}
            >
              {t.contact.name}
            </label>
            <input
              id={compact ? "cf-name-c" : "cf-name"}
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label
              className="block text-xs font-semibold mb-1"
              htmlFor={compact ? "cf-email-c" : "cf-email"}
            >
              {t.contact.email}
            </label>
            <input
              id={compact ? "cf-email-c" : "cf-email"}
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        {!compact && (
          <div>
            <label className="block text-xs font-semibold mb-1" htmlFor="cf-subject">
              {t.contact.subject}{" "}
              <span className="font-normal text-muted">({t.contact.optional})</span>
            </label>
            <input
              id="cf-subject"
              type="text"
              maxLength={200}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
        <div>
          <label
            className="block text-xs font-semibold mb-1"
            htmlFor={compact ? "cf-body-c" : "cf-body"}
          >
            {t.contact.message}
          </label>
          <textarea
            id={compact ? "cf-body-c" : "cf-body"}
            required
            rows={compact ? 3 : 5}
            maxLength={5000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-fernent-red px-4 py-2.5 text-sm font-bold uppercase tracking-wider text-white hover:bg-fernent-red-deep active:scale-[0.98] disabled:opacity-60 transition-all"
        >
          {pending ? "…" : t.contact.submit}
        </button>
      </form>
      {status === "ok" && (
        <p className="mt-2 text-sm text-green-800" role="status">
          {t.contact.success}
        </p>
      )}
      {status === "invalid" && (
        <p className="mt-2 text-sm text-fernent-red" role="alert">
          {t.contact.invalid}
        </p>
      )}
      {status === "err" && (
        <p className="mt-2 text-sm text-fernent-red" role="alert">
          {t.contact.error}
        </p>
      )}
    </section>
  );
}
