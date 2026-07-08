/**
 * Chat-model registry for the assistant.
 *
 * The assistant chat can talk to any of these providers — pick one per message
 * from the model dropdown. Everything else in Semestra (nightly tagging,
 * embeddings, weekly insights, knowledge ingestion) stays LOCAL on Ollama and
 * is unaffected by this file.
 *
 * ─── To add a key ────────────────────────────────────────────────────────────
 * Put the provider's key in `.env.local` (same folder as this app), using the
 * `envKey` name below, then restart the dev server. Only providers with a key
 * set (or the keyless local one) are selectable in the UI.
 *
 * ─── To add / change a model ─────────────────────────────────────────────────
 * Edit CHAT_MODELS below. `id` is the exact model string the provider's API
 * expects — these move fast, so if a request 404s, update the id here. Most
 * providers speak the OpenAI Chat Completions API, so adding a new one is
 * usually just a new PROVIDERS entry with its base URL.
 */

export type ProviderStyle = "anthropic" | "openai";

export interface Provider {
  id: string;
  label: string;
  /** "anthropic" = native SDK; "openai" = OpenAI-compatible /chat/completions. */
  style: ProviderStyle;
  /** Env var holding the API key. Empty for keyless local providers. */
  envKey: string;
  /** Base URL for OpenAI-style providers (no trailing slash). */
  baseURL?: string;
  /** True for local providers that need no key (Ollama). */
  keyless?: boolean;
  /** Shown in the picker when the key is missing. */
  hint?: string;
}

export interface ChatModel {
  id: string;
  label: string;
  provider: string;
}

export const PROVIDERS: Provider[] = [
  {
    id: "anthropic",
    label: "Anthropic · Claude",
    style: "anthropic",
    envKey: "ANTHROPIC_API_KEY",
  },
  {
    id: "openai",
    label: "OpenAI",
    style: "openai",
    envKey: "OPENAI_API_KEY",
    baseURL: "https://api.openai.com/v1",
  },
  {
    id: "moonshot",
    label: "Moonshot · Kimi",
    style: "openai",
    envKey: "MOONSHOT_API_KEY",
    baseURL: "https://api.moonshot.ai/v1",
  },
  {
    id: "dashscope",
    label: "Alibaba · Qwen",
    style: "openai",
    envKey: "DASHSCOPE_API_KEY",
    baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    style: "openai",
    envKey: "DEEPSEEK_API_KEY",
    baseURL: "https://api.deepseek.com/v1",
  },
  {
    id: "google",
    label: "Google · Gemini",
    style: "openai",
    envKey: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  {
    id: "xai",
    label: "xAI · Grok",
    style: "openai",
    envKey: "XAI_API_KEY",
    baseURL: "https://api.x.ai/v1",
  },
  {
    id: "groq",
    label: "Groq",
    style: "openai",
    envKey: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    style: "openai",
    envKey: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
  },
  {
    // Free, cloud-hosted (runs on NVIDIA's GPUs, not yours). Key from
    // build.nvidia.com. Rate-limited free tier (~40 req/min + credits).
    id: "nvidia",
    label: "NVIDIA NIM",
    style: "openai",
    envKey: "NVIDIA_API_KEY",
    baseURL: "https://integrate.api.nvidia.com/v1",
  },
  {
    id: "ollama",
    label: "Local · Ollama",
    style: "openai",
    envKey: "",
    baseURL: (process.env.OLLAMA_URL ?? "http://localhost:11434") + "/v1",
    keyless: true,
    hint: "needs Ollama running",
  },
];

/**
 * Curated defaults. `id` strings are what each API expects at time of writing —
 * they change often, so treat this list as a starting point and edit freely.
 */
export const CHAT_MODELS: ChatModel[] = [
  // Anthropic
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", provider: "anthropic" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", provider: "anthropic" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", provider: "anthropic" },
  { id: "claude-fable-5", label: "Claude Fable 5", provider: "anthropic" },
  // OpenAI
  { id: "gpt-5", label: "GPT-5", provider: "openai" },
  { id: "gpt-5-mini", label: "GPT-5 mini", provider: "openai" },
  { id: "o3", label: "OpenAI o3", provider: "openai" },
  { id: "gpt-4.1", label: "GPT-4.1", provider: "openai" },
  // Moonshot / Kimi
  { id: "kimi-latest", label: "Kimi (latest)", provider: "moonshot" },
  { id: "moonshot-v1-128k", label: "Moonshot v1 128k", provider: "moonshot" },
  // Qwen
  { id: "qwen-max", label: "Qwen Max", provider: "dashscope" },
  { id: "qwen-plus", label: "Qwen Plus", provider: "dashscope" },
  { id: "qwen-turbo", label: "Qwen Turbo", provider: "dashscope" },
  // DeepSeek
  { id: "deepseek-chat", label: "DeepSeek V3", provider: "deepseek" },
  { id: "deepseek-reasoner", label: "DeepSeek R1", provider: "deepseek" },
  // Gemini
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "google" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "google" },
  // Grok
  { id: "grok-4", label: "Grok 4", provider: "xai" },
  { id: "grok-3-mini", label: "Grok 3 mini", provider: "xai" },
  // Groq (fast inference)
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "groq" },
  // OpenRouter (gateway — any model, or auto-route)
  { id: "openrouter/auto", label: "OpenRouter (auto)", provider: "openrouter" },
  // NVIDIA NIM (free, cloud-hosted). Mistral Nemotron first = the default when
  // NVIDIA is your only provider. Nemotron Super is a reasoning model — if its
  // answers get long-winded, tell me and I'll auto-append "detailed thinking
  // off" to Sem's system prompt for it.
  {
    id: "mistralai/mistral-nemotron",
    label: "Mistral Nemotron",
    provider: "nvidia",
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    provider: "nvidia",
  },
  {
    id: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
    label: "Nemotron Super 49B",
    provider: "nvidia",
  },
  { id: "qwen/qwen3-235b-a22b", label: "Qwen3 235B", provider: "nvidia" },
  // Local
  {
    id: process.env.OLLAMA_MODEL ?? "llama3.2:3b",
    label: "Llama 3.2 (local)",
    provider: "ollama",
  },
];

export function providerFor(modelId: string): Provider | undefined {
  const model = CHAT_MODELS.find((m) => m.id === modelId);
  if (!model) return undefined;
  return PROVIDERS.find((p) => p.id === model.provider);
}

/** Server-only: a provider is usable if it's keyless or its key env var is set. */
export function isProviderConfigured(provider: Provider): boolean {
  return provider.keyless || Boolean(process.env[provider.envKey]?.trim());
}

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  providerLabel: string;
  configured: boolean;
  envKey: string;
  hint?: string;
}

/** Server-only: the full model list annotated with configuration state. */
export function listModelOptions(): ModelOption[] {
  return CHAT_MODELS.map((m) => {
    const p = PROVIDERS.find((x) => x.id === m.provider)!;
    return {
      id: m.id,
      label: m.label,
      provider: p.id,
      providerLabel: p.label,
      configured: isProviderConfigured(p),
      envKey: p.envKey,
      hint: p.hint,
    };
  });
}

/** Server-only: preferred default — Claude if configured, else first available. */
export function defaultModelId(options: ModelOption[]): string {
  return (
    options.find((o) => o.configured && o.provider === "anthropic")?.id ??
    options.find((o) => o.configured)?.id ??
    "claude-opus-4-8"
  );
}
