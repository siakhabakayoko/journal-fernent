"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Props = {
  title: string;
  excerpt: string;
  body: string;
};

type SpeakState = "idle" | "speaking" | "paused";

function preferFrenchVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const frFR = voices.find((v) => /^fr-FR$/i.test(v.lang));
  const frCA = voices.find((v) => /^fr-CA$/i.test(v.lang));
  const frAny = voices.find((v) => /^fr\b/i.test(v.lang));
  return frFR || frCA || frAny || null;
}

function buildPlainText(title: string, excerpt: string, body: string): string {
  const paragraphs = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  return [title.trim(), excerpt.trim(), ...paragraphs]
    .filter(Boolean)
    .join("\n\n");
}

/** Split long text into utterance-sized chunks (browser limits). */
function chunkText(text: string, maxLen = 220): string[] {
  const chunks: string[] = [];
  const paragraphs = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  for (const para of paragraphs) {
    if (para.length <= maxLen) {
      chunks.push(para);
      continue;
    }
    const sentences =
      para.match(/[^.!?…]+[.!?…]+(?:\s|$)|[^.!?…]+$/g) ?? [para];
    let current = "";
    for (const raw of sentences) {
      const s = raw.trim();
      if (!s) continue;
      if (current && `${current} ${s}`.length > maxLen) {
        chunks.push(current);
        current = s;
      } else {
        current = current ? `${current} ${s}` : s;
      }
    }
    if (current) chunks.push(current);
  }
  return chunks;
}

const btnClass =
  "inline-flex items-center gap-1.5 rounded-sm border border-rule-strong bg-paper-elevated px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-ink transition hover:border-fernent-red hover:text-fernent-red disabled:cursor-not-allowed disabled:opacity-50";

export function ArticleListenButton({ title, excerpt, body }: Props) {
  const { t } = useLanguage();
  const [supported, setSupported] = useState<boolean | null>(null);
  const [state, setState] = useState<SpeakState>("idle");
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const queueRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const cancelledRef = useRef(false);
  const speakNextRef = useRef<() => void>(() => {});

  speakNextRef.current = () => {
    if (cancelledRef.current || typeof window === "undefined") return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (indexRef.current >= queueRef.current.length) {
      setState("idle");
      return;
    }

    const text = queueRef.current[indexRef.current];
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.pitch = 1;
    utter.lang = "fr-FR";
    if (voiceRef.current) utter.voice = voiceRef.current;

    utter.onend = () => {
      if (cancelledRef.current) return;
      indexRef.current += 1;
      speakNextRef.current();
    };
    utter.onerror = () => {
      if (cancelledRef.current) return;
      setState("idle");
    };

    synth.speak(utter);
  };

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const loadVoices = () => {
      voiceRef.current = preferFrenchVoice(window.speechSynthesis.getVoices());
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);

    return () => {
      cancelledRef.current = true;
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, []);

  // Cancel when article content changes (client navigation between articles)
  useEffect(() => {
    cancelledRef.current = true;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    queueRef.current = [];
    indexRef.current = 0;
    setState("idle");
    cancelledRef.current = false;
  }, [title, excerpt, body]);

  function start() {
    if (!window.speechSynthesis) return;
    cancelledRef.current = false;
    window.speechSynthesis.cancel();
    queueRef.current = chunkText(buildPlainText(title, excerpt, body));
    indexRef.current = 0;
    setState("speaking");
    // Let cancel settle before speaking (Chrome quirk)
    window.setTimeout(() => speakNextRef.current(), 40);
  }

  function pause() {
    window.speechSynthesis?.pause();
    setState("paused");
  }

  function resume() {
    window.speechSynthesis?.resume();
    setState("speaking");
  }

  function stop() {
    cancelledRef.current = true;
    window.speechSynthesis?.cancel();
    queueRef.current = [];
    indexRef.current = 0;
    setState("idle");
    cancelledRef.current = false;
  }

  if (supported === null) return null;

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        className={btnClass}
        title={t.article.unsupported}
      >
        {t.article.listen}
      </button>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      role="group"
      aria-label={t.article.listen}
    >
      {state === "idle" && (
        <button type="button" onClick={start} className={btnClass}>
          <ListenIcon />
          {t.article.listen}
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
