import { ERROR_CODES } from './provider-adapter.js';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

function classifyHttpError(status, body) {
  if (status === 401 || status === 403) {
    return { code: ERROR_CODES.AUTHENTICATION, retryable: false };
  }
  if (status === 429) {
    return { code: ERROR_CODES.RATE_LIMITED, retryable: true };
  }
  if (status >= 500) {
    return { code: ERROR_CODES.PROVIDER_ERROR, retryable: true };
  }
  return { code: ERROR_CODES.PROVIDER_ERROR, retryable: false };
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;

  const parts = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('');
}

export class OpenAIAdapter {
  constructor({
    id = 'openai',
    model,
    apiKey = process.env.OPENAI_API_KEY,
    baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL,
    maxOutputTokens = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS ?? 128),
    fetchImpl = globalThis.fetch,
  } = {}) {
    if (!model) throw new TypeError('OpenAIAdapter model is required');
    if (!apiKey) throw new TypeError('OpenAIAdapter apiKey is required');
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');

    this.id = id;
    this.modelId = model;
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.maxOutputTokens = Math.max(1, Math.min(Number(maxOutputTokens) || 128, 1024));
    this.fetchImpl = fetchImpl;
  }

  async execute(task, { requestId, signal } = {}) {
    const startedAt = Date.now();
    const input = task?.input ?? task?.prompt;

    if (typeof input !== 'string' || input.length === 0) {
      const error = new Error('task must provide a non-empty input or prompt');
      error.code = ERROR_CODES.INVALID_TASK;
      error.retryable = false;
      throw error;
    }

    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'X-ArgOS-Request-Id': requestId ?? '',
        },
        body: JSON.stringify({
          model: this.modelId,
          input,
          max_output_tokens: this.maxOutputTokens,
        }),
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      error.code ??= ERROR_CODES.EXECUTION_ERROR;
      error.retryable ??= true;
      throw error;
    }

    const rawText = await response.text();
    let payload = null;
    try {
      payload = rawText ? JSON.parse(rawText) : null;
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const classification = classifyHttpError(response.status, payload);
      const message = payload?.error?.message ?? `OpenAI request failed with HTTP ${response.status}`;
      const error = new Error(message);
      error.code = classification.code;
      error.retryable = classification.retryable;
      throw error;
    }

    const output = extractOutputText(payload);
    if (!output && !payload?.output) {
      const error = new Error('OpenAI returned an invalid response payload');
      error.code = ERROR_CODES.INVALID_RESPONSE;
      error.retryable = false;
      throw error;
    }

    return {
      providerId: this.id,
      modelId: this.modelId,
      status: 'success',
      output,
      latencyMs: Date.now() - startedAt,
      usage: payload?.usage
        ? {
            inputTokens: payload.usage.input_tokens,
            outputTokens: payload.usage.output_tokens,
          }
        : undefined,
      timestamp: new Date().toISOString(),
    };
  }
}
