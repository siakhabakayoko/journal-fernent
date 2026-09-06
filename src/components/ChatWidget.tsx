"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { RagSource } from "@/lib/rag/types";
import { LoadingDots } from "@/components/LoadingDots";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
  weak?: boolean;
};

const WELCOME =
  "Bonjour — je suis l'assistant Ferñent. Posez une question sur nos articles, le mensuel, les capsules ou qui nous sommes. Je ne réponds qu'à partir du contenu du journal.";

function typeLabel(t: RagSource["type"]): string {
  switch (t) {
    case "article":
      return "Article";
    case "issue":
      return "Mensuel";
    case "video":
      return "Capsule";
    case "about":
      return "À propos";
    default:
      return t;
  }
}

export function ChatWidget() {
  const pathname = usePathname();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([
    { id: "welcome", role: "assistant", content: WELCOME },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const hidden = pathname?.startsWith("/admin");

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setError(null);
    setInput("");
    const userMsg: UiMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setBusy(true);

    const history = [...messages, userMsg]
      .filter((m) => m.id !== "welcome")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = (await res.json()) as {
        answer?: string;
        sources?: RagSource[];
        weak?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.message || "Erreur réseau.");
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.answer || "Réponse vide.",
          sources: data.sources,
          weak: data.weak,
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Impossible de contacter l'assistant.";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `Désolé — ${msg}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, input, messages]);

  if (hidden) return null;

  return (
    <div
      className="pointer-events-none fixed z-[60] flex max-h-[calc(100dvh-max(0.75rem,env(safe-area-inset-top,0px))-max(0.75rem,env(safe-area-inset-bottom,0px)))] flex-col gap-3 left-[max(0.75rem,env(safe-area-inset-left,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))] bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:left-auto sm:right-[max(1.5rem,env(safe-area-inset-right,0px))] sm:bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:w-[380px] sm:max-w-[calc(100dvw-3rem)] sm:items-end"
    >
      {open && (
        <section
          id={panelId}
          role="dialog"
          aria-label="Assistant Ferñent"
          className="pointer-events-auto flex w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-rule bg-paper-elevated shadow-[0_12px_40px_rgba(20,17,15,0.18)] max-h-[min(70dvh,calc(100dvh-5.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))] h-[min(560px,calc(100dvh-5.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)))]"
        >
          <header className="flex shrink-0 items-center gap-3 border-b border-rule bg-fernent-red px-4 py-3 text-white">
            {/* Site favicon — same asset as layout metadata icons.icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/favicon.ico"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full bg-white/15 object-contain p-1.5"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-base font-bold leading-tight">
                Assistant Ferñent
              </p>
              <p className="truncate text-[11px] text-white/85">
                Réponses depuis le contenu du journal uniquement
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-white/90 hover:bg-white/15"
              aria-label="Fermer le chat"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain bg-paper px-3 py-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-fernent-red text-white"
                      : "border border-rule bg-paper-elevated text-ink"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  {m.sources && m.sources.length > 0 && (
                    <ul className="mt-2 space-y-1 border-t border-rule/80 pt-2 text-[11px]">
                      {m.sources.map((s) => (
                        <li key={`${s.url}-${s.title}`}>
                          <span className="mr-1 font-semibold text-fernent-red">
                            {typeLabel(s.type)}
                          </span>
                          <Link
                            href={s.url}
                            className="text-ink underline decoration-fernent-red/40 underline-offset-2 hover:decoration-fernent-red"
                            onClick={() => setOpen(false)}
                          >
                            {s.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-rule bg-paper-elevated px-3 py-2 text-sm text-muted">
                  <LoadingDots
                    label="Recherche dans Ferñent"
                    tone="red"
                    size="sm"
                  />
                </div>
              </div>
            )}
          </div>

          <form
            className="shrink-0 border-t border-rule bg-paper-elevated p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            {error && (
              <p className="mb-2 text-[11px] text-fernent-red" role="alert">
                {error}
              </p>
            )}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="Votre question…"
                disabled={busy}
                className="min-h-[44px] max-h-28 flex-1 resize-none rounded-xl border border-rule bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-fernent-red focus:outline-none"
                aria-label="Message à l'assistant"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-fernent-red px-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-fernent-red-deep"
              >
                Envoyer
              </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        className="pointer-events-auto ml-auto inline-flex h-14 shrink-0 items-center gap-2 rounded-full bg-fernent-red px-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(225,6,0,0.35)] hover:bg-fernent-red-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fernent-red"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7A2.5 2.5 0 0 1 17.5 16H9l-4 3.5V6.5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
        <span className="pr-1">{open ? "Fermer" : "Discuter"}</span>
      </button>
    </div>
  );
}
