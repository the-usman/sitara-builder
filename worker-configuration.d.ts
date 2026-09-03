/*
 * Careful — `bindings.sh` scrapes the names below to build `wrangler --binding` flags when no
 * .env.local is present (the Docker/Dokploy path). A variable missing here is never
 * forwarded into the worker, so anything the server code requires MUST be listed.
 */
interface Env {
  RUNNING_IN_DOCKER: Settings;

  // Required by the server — requests throw without these.
  MONGODB_URI: string;
  JWT_SECRET: string;
  DEFAULT_NUM_CTX: Settings;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  GROQ_API_KEY: string;
  HuggingFace_API_KEY: string;
  OPEN_ROUTER_API_KEY: string;
  OLLAMA_API_BASE_URL: string;
  OPENAI_LIKE_API_KEY: string;
  OPENAI_LIKE_API_BASE_URL: string;
  TOGETHER_API_KEY: string;
  TOGETHER_API_BASE_URL: string;
  TOKENGO_API_KEY: string;
  TOKENGO_API_BASE_URL: string;
  TOKENGO_REASONING_EFFORT: string;
  DEEPSEEK_API_KEY: string;
  LMSTUDIO_API_BASE_URL: string;
  GOOGLE_GENERATIVE_AI_API_KEY: string;
  MISTRAL_API_KEY: string;
  XAI_API_KEY: string;
  PERPLEXITY_API_KEY: string;
  AWS_BEDROCK_CONFIG: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;

  // Shared deploy credentials — see ENV_FALLBACKS in provider-tokens.server.ts for the precedence order.
  NETLIFY_TOKEN: string;
  NETLIFY_AUTH_TOKEN: string;
  VITE_NETLIFY_ACCESS_TOKEN: string;
  VERCEL_TOKEN: string;
  VITE_VERCEL_ACCESS_TOKEN: string;
}
