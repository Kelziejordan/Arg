import assert from 'node:assert/strict';
import { OpenAIAdapter } from '../src/orchestration/openai-adapter.js';
import { createExecutionCore } from '../src/orchestration/execution-core.js';

if (process.env.LIVE_PROVIDER_TEST !== '1') {
  console.log('[SKIP] V2.3 live provider test is opt-in; set LIVE_PROVIDER_TEST=1');
  process.exit(0);
}

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error('OPENAI_API_KEY is required for V2.3 live provider test');

const model = process.env.OPENAI_MODEL ?? 'gpt-5.6-luna';
const timeoutMs = Math.max(1000, Math.min(Number(process.env.OPENAI_LIVE_TIMEOUT_MS) || 15000, 30000));
const maxOutputTokens = Math.max(1, Math.min(Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 128, 256));

const adapter = new OpenAIAdapter({
  id: 'openai-live',
  model,
  apiKey,
  maxOutputTokens,
});

const core = createExecutionCore({
  providers: [adapter],
  concurrency: 1,
  timeoutMs,
  retries: 0,
});

const result = await core.execute({
  id: `v2.3-live-${Date.now()}`,
  prompt: 'Reply with exactly: ARGOS V2.3 LIVE OK',
});

assert.equal(result.summary.requested, 1);
assert.equal(result.summary.succeeded, 1);
assert.equal(result.results[0].status, 'success');
assert.match(result.results[0].output, /ARGOS V2\.3 LIVE OK/);
assert.ok(result.results[0].requestId);
assert.equal(result.results[0].attempts, 1);

console.log('[GREEN] V2.3 live OpenAI provider execution verified');
console.log(JSON.stringify({
  model,
  status: result.results[0].status,
  latencyMs: result.results[0].latencyMs,
  attempts: result.results[0].attempts,
  usage: result.results[0].usage,
}, null, 2));
