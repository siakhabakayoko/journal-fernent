import { chatCompletion } from "./nvidia-client";
import { SYSTEM_PROMPT, WEAK_ANSWER, buildContextBlock } from "./prompt";
import {
  retrieveRelevantChunks,
  sourcesFromChunks,
} from "./retrieve";
import type { ChatApiResponse, ChatMessage } from "./types";

function lastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && messages[i].content.trim()) {
      return messages[i].content.trim();
    }
  }
  return "";
}

export async function answerWithRag(
  messages: ChatMessage[],
): Promise<ChatApiResponse> {
  const question = lastUserMessage(messages);
  if (!question) {
    return {
      answer: "Posez une question sur le contenu du Journal Ferñent.",
      sources: [],
      weak: true,
    };
  }

  const { chunks, weak } = await retrieveRelevantChunks(question);
  const sources = sourcesFromChunks(chunks);

  if (weak) {
    return { answer: WEAK_ANSWER, sources, weak: true };
  }

  const context = buildContextBlock(chunks);
  const history = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-6)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  // Ensure the latest user turn includes context
  const groundedMessages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(0, -1),
    {
      role: "user",
      content: [
        "Contexte Ferñent (extraits autorisés uniquement) :",
        context,
        "",
        "Question du lecteur :",
        question,
        "",
        "Réponds en français en t'appuyant uniquement sur le contexte. Si insuffisant, dis-le.",
      ].join("\n"),
    },
  ];

  const { content } = await chatCompletion({
    messages: groundedMessages,
    maxTokens: 700,
    temperature: 0.25,
  });

  return { answer: content, sources, weak: false };
}
