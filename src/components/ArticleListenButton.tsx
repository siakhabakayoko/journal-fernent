"use client";

import { useEffect, useRef, useState } from "react";
import { buildArticleListenText } from "@/lib/article-audio";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LoadingDots } from "@/components/LoadingDots";

type Props = {
  title: string;
  excerpt: string;
  body: string;
  /** Pre-generated public audio URL — skips /api/tts when present. */
  audioUrl?: string;
};

type SpeakState = "idle" | "loading" | "speaking" | "paused" | "error";

/** Tiny silent WAV (~0.05s) — unlocks HTMLAudioElement within a user gesture. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function isNotAllowedError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === "NotAllowedError") return true;
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.name === "NotAllowedError" ||
    msg.includes("notallowederror") ||
    msg.includes("not allowed by the user agent") ||
    msg.includes("user denied permission") ||
    msg.includes("play() failed because the user") ||
    msg.includes("the request is not allowed")
  );
}

const btnClass =
  "inline-flex items-center gap-1.5 rounded-sm border border-rule-strong bg-paper-elevated px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink transition hover:border-fernent-red hover:text-fernent-red disabled:cursor-not-allowed disabled:opacity-50";

export function ArticleListenButton({
  title,
  excerpt,
  body,
  audioUrl,
}: Props) {
  const { t } = useLanguage();
  const [state, setState] = useState<SpeakState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  function permissionDeniedMessage(): string {
    return (
      t.article.listenPermissionDenied ||
      "La lecture audio a été bloquée par le navigateur. Réessayez en cliquant à nouveau sur Écouter."
    );
  }

  function mapErrorMessage(err: unknown): string {
    if (isNotAllowedError(err)) return permissionDeniedMessage();
    if (err instanceof Error && err.message) {
      const lower = err.message.toLowerCase();
      if (
        lower.includes("not allowed by the user agent") ||
        lower.includes("user denied permission") ||
        lower.includes("the request is not allowed")
      ) {
        return permissionDeniedMessage();
      }
      return err.message;
    }
    return t.article.listenError;
  }

  /**
   * Unlock autoplay within the click gesture: resume AudioContext and
   * briefly play a silent WAV on the same HTMLAudioElement used later.
   */
  async function unlockAudioPlayback(): Promise<void> {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (AC) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AC();
        }
        if (audioCtxRef.current.state === "suspended") {
          await audioCtxRef.current.resume();
        }
      }
    } catch {
      // AudioContext optional — silent WAV unlock is the primary path.
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.setAttribute("playsinline", "true");
    audio.setAttribute("webkit-playsinline", "true");
    audio.src = SILENT_WAV;
    audio.currentTime = 0;
    try {
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // If unlock fails here, real play may still work or surface NotAllowedError.
    }
  }

  function cleanupPlayback() {
    abortRef.current?.abort();
    abortRef.current = null;
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.onended = null;
      audio.onerror = null;
      audio.removeAttribute("src");
      audio.load();
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      cleanupPlayback();
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      if (ctx && ctx.state !== "closed") {
        void ctx.close().catch(() => undefined);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset when article content / stored audio changes
  useEffect(() => {
    cleanupPlayback();
    setState("idle");
    setErrorMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, excerpt, body, audioUrl]);

  async function playFromUrl(url: string): Promise<void> {
    const audio = audioRef.current;
    if (!audio) {
      throw new Error(t.article.unsupported || t.article.listenError);
    }

    audio.src = url;
    audio.load();

    audio.onended = () => {
      setState("idle");
    };
    audio.onerror = () => {
      setState("error");
      setErrorMsg(t.article.listenError);
    };

    await audio.play();
    setState("speaking");
  }

  async function startFromStoredUrl(storedUrl: string) {
    cleanupPlayback();
    setErrorMsg("");
    setState("loading");
    await unlockAudioPlayback();

    try {
      await playFromUrl(storedUrl);
    } catch (err) {
      setState("error");
      setErrorMsg(mapErrorMessage(err));
    }
  }

  async function startFromTts() {
    cleanupPlayback();
    setErrorMsg("");
    setState("loading");

    // Critical: unlock within the user gesture BEFORE the long TTS await.
    await unlockAudioPlayback();

    const controller = new AbortController();
    abortRef.current = controller;
    const text = buildArticleListenText(title, excerpt, body);

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
      await playFromUrl(url);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setState("idle");
        return;
      }
      setState("error");
      setErrorMsg(mapErrorMessage(err));
    }
  }

  async function start() {
    const stored = audioUrl?.trim();
    if (stored) {
      await startFromStoredUrl(stored);
      return;
    }
    await startFromTts();
  }

  function pause() {
    audioRef.current?.pause();
    setState("paused");
  }

  function resume() {
    void audioRef.current
      ?.play()
      .then(() => setState("speaking"))
      .catch((err) => {
        setState("error");
        setErrorMsg(mapErrorMessage(err));
      });
  }

  function stop() {
    cleanupPlayback();
    setState("idle");
    setErrorMsg("");
  }

  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label={t.article.listen}>
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        className="hidden"
        aria-hidden
      />
      <div className="flex flex-wrap items-center gap-2">
        {state === "idle" && (
          <button type="button" onClick={() => void start()} className={btnClass}>
            <ListenIcon />
            {t.article.listen}
          </button>
        )}
        {state === "loading" && (
          <button type="button" disabled className={btnClass} aria-busy="true">
            <LoadingDots label={t.article.listenLoading} tone="red" size="sm" />
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
