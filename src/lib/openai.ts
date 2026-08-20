import OpenAI from 'openai';

/**
 * Thin wrapper around the OpenAI SDK that:
 *  - Enforces JSON Mode / Structured Outputs on every call (so responses
 *    are always valid JSON matching a schema — no wasted completion
 *    tokens re-explaining format, no client-side parsing failures).
 *  - Reads the model from OPENAI_MODEL (default "gpt-5.6-luna" per spec)
 *    and silently retries with OPENAI_FALLBACK_MODEL if the primary model
 *    name is rejected by the API, so the app degrades gracefully if that
 *    model string turns out to be wrong for a given account/region.
 *  - Never runs client-side: the API key only ever lives on the server
 *    (Next.js route handlers / server actions), never shipped to the
 *    browser.
 */

const PRIMARY_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
const FALLBACK_MODEL = process.env.OPENAI_FALLBACK_MODEL || 'gpt-4o-mini';

let client: OpenAI | null | undefined;

export function getOpenAIClient(): OpenAI | null {
  if (client !== undefined) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  client = apiKey ? new OpenAI({ apiKey }) : null;
  return client;
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export class AiNotConfiguredError extends Error {
  constructor() {
    super('OPENAI_API_KEY is not set — AI features are disabled.');
    this.name = 'AiNotConfiguredError';
  }
}

interface StructuredCallParams {
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  temperature?: number;
}

function isModelError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  const code = (err as { code?: string })?.code;
  return status === 404 || code === 'model_not_found';
}

/**
 * Calls the chat completions API with Structured Outputs enforced, trying
 * the primary model first and transparently falling back once if the
 * model name itself is the problem.
 */
export async function callStructured<T>(params: StructuredCallParams): Promise<T> {
  const openai = getOpenAIClient();
  if (!openai) throw new AiNotConfiguredError();

  const request = (model: string) =>
    openai.chat.completions.create({
      model,
      temperature: params.temperature ?? 0.6,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: params.schemaName,
          strict: true,
          schema: params.schema,
        },
      },
    });

  let completion;
  try {
    completion = await request(PRIMARY_MODEL);
  } catch (err) {
    if (!isModelError(err) || FALLBACK_MODEL === PRIMARY_MODEL) throw err;
    completion = await request(FALLBACK_MODEL);
  }

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error('AI response was empty.');
  return JSON.parse(content) as T;
}

export const AI_MODEL_INFO = { primary: PRIMARY_MODEL, fallback: FALLBACK_MODEL };
