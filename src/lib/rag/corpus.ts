import { createHash } from "crypto";
import { getArticles } from "@/lib/articles";
import { getIssues } from "@/lib/issues";
import { getVideos } from "@/lib/videos";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { chunkText } from "./chunk";
import type { RagChunk } from "./types";

const ABOUT_NOTRE_JOURNAL = [
  "Ferñent n'est pas une vitrine institutionnelle. C'est l'organe d'un courant politique qui affirme : union libre des peuples libres d'Afrique ; solidarité internationaliste des travailleurs.",
  "Nous publions des enquêtes, des analyses et des récits de luttes. Nous refusons la neutralité de façade qui, dans les rédactions dominantes, consiste à épouser le point de vue des créanciers, des ministères et des rédactions lointaines.",
  "Ce site est volontairement léger : lisible sur un téléphone à bas débit, imprimable, partageable. Les rubriques — Sénégal, Afrique, International, Économie, Social — ne sont pas des silos marketing. Elles sont des portes d'entrée vers le même conflit : qui produit, qui possède, qui décide.",
  "Proposez un texte, un témoignage, une correction. Un journal vivant se construit avec ses lecteurs — et avec ceux qui n'ont pas encore le droit à la parole.",
].join("\n\n");

function histoireCorpusText(): string {
  const h = dictionaries.fr.histoire;
  const parts: string[] = [
    h.title,
    h.subtitle,
    h.missionTitle,
    ...h.missionParagraphs,
    h.motto,
    h.principlesTitle,
    ...h.principles.map((p) => `${p.title}. ${p.body}`),
    h.cofoundersTitle,
    h.cofoundersIntro,
    `${h.assaneName} et ${h.biraneName} — ${h.cofounderRole}. ${h.cofoundersLegacy}`,
    h.teamTitle,
    `${h.dfrName} — ${h.dfrRole}. ${h.dfrBio}`,
    h.heritage,
  ];
  return parts.join("\n\n");
}

function pushChunks(
  out: RagChunk[],
  base: {
    type: RagChunk["type"];
    title: string;
    url: string;
    body: string;
    meta?: Record<string, string>;
  },
): void {
  const pieces = chunkText(base.body);
  pieces.forEach((text, i) => {
    out.push({
      id: `${base.type}:${base.url}:${i}`,
      text,
      title: base.title,
      url: base.url,
      type: base.type,
      meta: base.meta,
    });
  });
}

/**
 * Build the retrieval corpus strictly from Ferñent public content.
 * Excludes newsletter emails, banned keywords, contact messages, admin data.
 */
export async function buildCorpusChunks(): Promise<RagChunk[]> {
  const [articles, issues, videos] = await Promise.all([
    getArticles(),
    getIssues(),
    getVideos(),
  ]);

  const chunks: RagChunk[] = [];

  for (const a of articles) {
    const body = [
      `Titre: ${a.title}`,
      `Rubrique: ${a.rubric}`,
      `Auteur: ${a.author}`,
      `Date: ${a.publishedAt}`,
      a.excerpt ? `Chapô: ${a.excerpt}` : "",
      a.body,
    ]
      .filter(Boolean)
      .join("\n\n");
    pushChunks(chunks, {
      type: "article",
      title: a.title,
      url: `/article/${a.slug}`,
      body,
      meta: {
        slug: a.slug,
        rubric: a.rubric,
        date: a.publishedAt,
        author: a.author,
      },
    });
  }

  for (const iss of issues) {
    const body = [
      `Mensuel: ${iss.title}`,
      `Période: ${iss.month}/${iss.year}`,
      iss.description || "",
      `Slug: ${iss.slug}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    pushChunks(chunks, {
      type: "issue",
      title: iss.title,
      url: `/mensuel`,
      body,
      meta: {
        slug: iss.slug,
        month: String(iss.month),
        year: String(iss.year),
      },
    });
  }

  for (const v of videos) {
    const body = [
      `Capsule vidéo: ${v.title}`,
      v.description || "",
      v.rubric ? `Rubrique: ${v.rubric}` : "",
      v.publishedAt ? `Date: ${v.publishedAt}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    pushChunks(chunks, {
      type: "video",
      title: v.title,
      url: `/capsules`,
      body,
      meta: {
        id: v.id,
        date: v.publishedAt,
      },
    });
  }

  pushChunks(chunks, {
    type: "about",
    title: "Notre journal — Ce que veut dire Ferñent",
    url: "/qui-sommes-nous",
    body: ABOUT_NOTRE_JOURNAL,
  });

  pushChunks(chunks, {
    type: "about",
    title: "Notre histoire",
    url: "/qui-sommes-nous#notre-histoire",
    body: histoireCorpusText(),
  });

  return chunks;
}

/** Stable fingerprint of chunk ids + text lengths for cache invalidation. */
export function corpusFingerprint(chunks: RagChunk[]): string {
  const h = createHash("sha256");
  for (const c of chunks) {
    h.update(c.id);
    h.update("\0");
    h.update(String(c.text.length));
    h.update("\0");
    h.update(c.text.slice(0, 64));
    h.update("\n");
  }
  return h.digest("hex").slice(0, 24);
}
