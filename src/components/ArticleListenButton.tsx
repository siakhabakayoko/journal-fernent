"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Props = {
  title: string;
  excerpt: string;
  body: string;
};

type SpeakState = "idle" | "loading" | "speaking" | "paused" | "error";

function buildPlainText(title: string, excerpt: string, body: string): string {
  const paragraphs = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return [title.trim(), excerpt.trim(), ...paragraphs]
    .filter(Boolean)
    .join("\n\n");
}

const btnClass =
  "inline-flex items-center gap-1.5 rounded-sm border border-rule-strong bg-paper-elevated px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink transition hover:border-fernent-red hover:text-fernent-red disabled:cursor-not-allowed disabled:opacity-50";

export function ArticleListenButton({ title, excerpt, body }: Props) {
  const { t } = useLanguage();
  const [state, setState] = useState<SpeakState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  function cleanupAudio() {
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  useEffect(() => {
    return () => cleanupAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset when article content changes
  useEffect(() => {
    cleanupAudio();
    setState("idle");
    setErrorMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, excerpt, body]);

  async function start() {
    cleanupAudio();
    setErrorMsg("");
    setState("loading");

    const controller = new AbortController();
    abortRef.current = controller;
    const text = buildPlainText(title, excerpt, body);

    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
          error?: string;
        };
        const detail =
          (typeof data.message === "string" && data.message.trim()) ||
          (typeof data.error === "string" && data.error.trim()) ||
          "";
        throw new Error(
          detail || t.article.listenError || "Synthèse vocale indisponible.",
        );
      }

      const blob = await res.blob();
      if (!blob.size) {
        throw new Error(t.article.listenError);
      }

      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setState("idle");
      };
      audio.onerror = () => {
        setState("error");
        setErrorMsg(t.article.listenError);
      };

      await audio.play();
      setState("speaking");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setState("idle");
        return;
      }
      setState("error");
      setErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : t.article.listenError,
      );
    }
  }

  function pause() {
    audioRef.current?.pause();
    setState("paused");
  }

  function resume() {
    void audioRef.current?.play().then(() => setState("speaking"));
  }

  function stop() {
    cleanupAudio();
    setState("idle");
    setErrorMsg("");
  }

  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={t.article.listen}>
      <div className="flex flex-wrap items-center gap-2">
        {state === "idle" && (
          <button type="button" onClick={() => void start()} className={btnClass}>
            <ListenIcon />
            {t.article.listen}
          </button>
        )}
        {state === "loading" && (
          <button type="button" disabled className={btnClass}>
            {t.article.listenLoading}
          </button>
        )}
        {state === "speaking" && (
          <>
            <button type="button" onClick={pause} className={btnClass}>
              {t.article.pause}
            </button>
            <button type="button" onClick={stop} className={btnClass}>
              {t.article.stop}
            </button>
          </>
        )}
        {state === "paused" && (
          <>
            <button type="button" onClick={resume} className={btnClass}>
              {t.article.resume}
            </button>
            <button type="button" onClick={stop} className={btnClass}>
              {t.article.stop}
            </button>
          </>
        )}
        {state === "error" && (
          <>
            <button type="button" onClick={() => void start()} className={btnClass}>
              <ListenIcon />
              {t.article.listen}
            </button>
            <button type="button" onClick={stop} className={btnClass}>
              {t.article.stop}
            </button>
          </>
        )}
      </div>
      {state === "error" && errorMsg && (
        <p className="text-xs text-red-700 max-w-md" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

function ListenIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <path d="M9.383 3.076A1 1 0 0 1 10 4v12a1 1 0 0 1-1.707.707L4.586 13H2a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h2.586l3.707-3.707a1 1 0 0 1 1.09-.217Z" />
      <path d="M12.293 7.293a1 1 0 0 1 1.414 0A4.98 4.98 0 0 1 15 11a4.98 4.98 0 0 1-1.293 3.707 1 1 0 0 1-1.414-1.414A2.98 2.98 0 0 0 13 11c0-.796-.316-1.559-.879-2.121a1 1 0 0 1 0-1.414Z" />
    </svg>
  );
}
