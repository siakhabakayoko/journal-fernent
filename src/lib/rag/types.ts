export type RagDocType = "article" | "issue" | "video" | "about";

export type RagSource = {
  title: string;
  url: string;
  type: RagDocType;
};

export type RagChunk = {
  id: string;
  text: string;
  title: string;
  url: string;
  type: RagDocType;
  /** Extra metadata for display / filtering */
  meta?: Record<string, string>;
};

export type RagEmbeddedChunk = RagChunk & {
  embedding: number[];
};

export type RagIndexFile = {
  version: 1;
  model: string;
  dimensions: number;
  createdAt: string;
  fingerprint: string;
  chunks: RagEmbeddedChunk[];
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatApiResponse = {
  answer: string;
  sources: RagSource[];
  weak?: boolean;
};
