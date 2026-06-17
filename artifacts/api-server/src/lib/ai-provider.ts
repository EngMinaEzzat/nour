/**
 * Server-side AI provider abstraction.
 *
 * Provider keys stay in the API server. In production, mock mode is disabled;
 * in development/test, deterministic mocks require AI_USE_MOCK=true.
 */

import { anthropic } from "@workspace/integrations-anthropic-ai";
import { ai as gemini } from "@workspace/integrations-gemini-ai";
import { assertAiProviderConfigured, isAiMockEnabled } from "./ai-safety.js";

export type AiProviderName = "anthropic" | "gemini" | "openai";

export interface AiGenerateOptions {
  provider?: AiProviderName;
  model?: string;
  systemPrompt?: string;
  userPrompt: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface AiGenerateResult {
  text: string;
  provider: AiProviderName;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface AiStreamOptions extends AiGenerateOptions {
  onChunk: (text: string) => void;
}

const DEFAULT_MAX_TOKENS = 2000;

export function resolveAiProvider(requested?: AiProviderName): AiProviderName {
  if (requested) return requested;
  const envProvider = process.env.AI_PROVIDER?.toLowerCase();
  if (envProvider === "gemini") return "gemini";
  if (envProvider === "openai") return "openai";
  return "anthropic";
}

export function requestedModelToProvider(model?: string): AiProviderName | undefined {
  if (model === "gemini") return "gemini";
  if (model === "openai" || model === "gpt") return "openai";
  if (model === "claude") return "anthropic";
  return undefined;
}

export function providerToClientModel(provider: AiProviderName): "claude" | "gemini" | "openai" {
  return provider === "anthropic" ? "claude" : provider;
}

export function resolveAiModel(provider: AiProviderName, requested?: string): string {
  if (requested && !["claude", "gemini", "openai", "gpt"].includes(requested)) {
    return requested;
  }
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  if (provider === "openai") return "gpt-4o-mini";
  return provider === "gemini" ? "gemini-3.5-flash" : "claude-sonnet-4-6";
}

type OpenAiMessage = { role: "system" | "user" | "assistant"; content: string };

async function callOpenAiChat(opts: {
  model: string;
  messages: OpenAiMessage[];
  maxTokens: number;
  temperature?: number;
}): Promise<AiGenerateResult> {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI provider returned HTTP ${response.status}`);
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  return {
    text: payload.choices?.[0]?.message?.content ?? "",
    provider: "openai",
    model: opts.model,
    inputTokens: payload.usage?.prompt_tokens,
    outputTokens: payload.usage?.completion_tokens,
  };
}

export async function generateContent(opts: AiGenerateOptions): Promise<AiGenerateResult> {
  const provider = resolveAiProvider(opts.provider);
  const model = resolveAiModel(provider, opts.model);
  const maxTokens = opts.maxOutputTokens ?? DEFAULT_MAX_TOKENS;

  if (isAiMockEnabled()) {
    return {
      text: `[MOCK AI] Provider: ${provider}, Model: ${model}, Input: ${opts.userPrompt.slice(0, 100)}`,
      provider,
      model,
      inputTokens: Math.ceil(opts.userPrompt.length / 4),
      outputTokens: 20,
    };
  }

  assertAiProviderConfigured(provider);

  if (provider === "openai") {
    return callOpenAiChat({
      model,
      messages: [
        ...(opts.systemPrompt ? [{ role: "system" as const, content: opts.systemPrompt }] : []),
        { role: "user", content: opts.userPrompt },
      ],
      maxTokens,
      temperature: opts.temperature,
    });
  }

  if (provider === "gemini") {
    const result = await gemini.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
      config: {
        maxOutputTokens: maxTokens,
        temperature: opts.temperature,
        ...(opts.systemPrompt ? { systemInstruction: opts.systemPrompt } : {}),
      },
    });

    return {
      text: result.text ?? "",
      provider,
      model,
      inputTokens: result.usageMetadata?.promptTokenCount ?? undefined,
      outputTokens: result.usageMetadata?.candidatesTokenCount ?? undefined,
    };
  }

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
    messages: [{ role: "user", content: opts.userPrompt }],
  });

  return {
    text: response.content.map((c) => ("text" in c ? c.text : "")).join(""),
    provider,
    model,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
  };
}

export async function streamContent(opts: AiStreamOptions): Promise<AiGenerateResult> {
  const provider = resolveAiProvider(opts.provider);
  const model = resolveAiModel(provider, opts.model);
  const maxTokens = opts.maxOutputTokens ?? DEFAULT_MAX_TOKENS;

  if (isAiMockEnabled()) {
    const mockText = `[MOCK AI] Streaming response for: ${opts.userPrompt.slice(0, 100)}`;
    opts.onChunk(mockText);
    return {
      text: mockText,
      provider,
      model,
      inputTokens: Math.ceil(opts.userPrompt.length / 4),
      outputTokens: 15,
    };
  }

  assertAiProviderConfigured(provider);

  if (provider === "openai") {
    const result = await callOpenAiChat({
      model,
      messages: [
        ...(opts.systemPrompt ? [{ role: "system" as const, content: opts.systemPrompt }] : []),
        { role: "user", content: opts.userPrompt },
      ],
      maxTokens,
      temperature: opts.temperature,
    });
    if (result.text) opts.onChunk(result.text);
    return result;
  }

  if (provider === "gemini") {
    const result = await gemini.models.generateContent({
      model,
      contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
      config: {
        maxOutputTokens: maxTokens,
        temperature: opts.temperature,
        ...(opts.systemPrompt ? { systemInstruction: opts.systemPrompt } : {}),
      },
    });

    const text = result.text ?? "";
    if (text) opts.onChunk(text);
    return {
      text,
      provider,
      model,
      inputTokens: result.usageMetadata?.promptTokenCount ?? undefined,
      outputTokens: result.usageMetadata?.candidatesTokenCount ?? undefined,
    };
  }

  let fullResponse = "";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  const stream = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    ...(opts.systemPrompt ? { system: opts.systemPrompt } : {}),
    messages: [{ role: "user", content: opts.userPrompt }],
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullResponse += event.delta.text;
      opts.onChunk(event.delta.text);
    }
    if (event.type === "message_delta" && "usage" in event) {
      outputTokens = (event as { usage?: { output_tokens?: number } }).usage?.output_tokens;
    }
    if (event.type === "message_start" && "message" in event) {
      inputTokens = (event as { message?: { usage?: { input_tokens?: number } } }).message?.usage?.input_tokens;
    }
  }

  return { text: fullResponse, provider, model, inputTokens, outputTokens };
}

export async function streamChatWithHistory(opts: {
  provider?: AiProviderName;
  model?: string;
  systemPrompt: string;
  history: Array<{ role: string; content: string }>;
  userMessage: string;
  maxOutputTokens?: number;
  onChunk: (text: string) => void;
}): Promise<AiGenerateResult> {
  const provider = resolveAiProvider(opts.provider);
  const model = resolveAiModel(provider, opts.model);
  const maxTokens = opts.maxOutputTokens ?? DEFAULT_MAX_TOKENS;

  if (isAiMockEnabled()) {
    const mockText = `[MOCK AI] Chat response for: ${opts.userMessage.slice(0, 100)}`;
    opts.onChunk(mockText);
    return {
      text: mockText,
      provider,
      model,
      inputTokens: Math.ceil(opts.userMessage.length / 4),
      outputTokens: 15,
    };
  }

  assertAiProviderConfigured(provider);

  if (provider === "openai") {
    const result = await callOpenAiChat({
      model,
      messages: [
        { role: "system", content: opts.systemPrompt },
        ...opts.history.map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
          content: m.content,
        })),
        { role: "user", content: opts.userMessage },
      ],
      maxTokens,
    });
    if (result.text) opts.onChunk(result.text);
    return result;
  }

  if (provider === "gemini") {
    const result = await gemini.models.generateContent({
      model,
      contents: [
        { role: "user", parts: [{ text: opts.systemPrompt }] },
        { role: "model", parts: [{ text: "Hello, I am Nour's merchant assistant." }] },
        ...opts.history.map((m) => ({
          role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
          parts: [{ text: m.content }],
        })),
        { role: "user", parts: [{ text: opts.userMessage }] },
      ],
      config: { maxOutputTokens: maxTokens },
    });

    const text = result.text ?? "";
    if (text) opts.onChunk(text);
    return {
      text,
      provider,
      model,
      inputTokens: result.usageMetadata?.promptTokenCount ?? undefined,
      outputTokens: result.usageMetadata?.candidatesTokenCount ?? undefined,
    };
  }

  let fullResponse = "";
  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  const stream = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    system: opts.systemPrompt,
    messages: [
      ...opts.history.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: m.content,
      })),
      { role: "user", content: opts.userMessage },
    ],
    stream: true,
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullResponse += event.delta.text;
      opts.onChunk(event.delta.text);
    }
    if (event.type === "message_delta" && "usage" in event) {
      outputTokens = (event as { usage?: { output_tokens?: number } }).usage?.output_tokens;
    }
    if (event.type === "message_start" && "message" in event) {
      inputTokens = (event as { message?: { usage?: { input_tokens?: number } } }).message?.usage?.input_tokens;
    }
  }

  return { text: fullResponse, provider, model, inputTokens, outputTokens };
}
