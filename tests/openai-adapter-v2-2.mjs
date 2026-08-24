import assert from 'node:assert/strict';
import http from 'node:http';
import { OpenAIAdapter } from '../src/orchestration/openai-adapter.js';
import { createExecutionCore } from '../src/orchestration/execution-core.js';

const requests = [];
let mode = 'success';

const server = http.createServer(async (req, res) => {
  requests.push({
    method: req.method,
    url: req.url,
    authorization: req.headers.authorization,
    requestId: req.headers['x-argos-request-id'],
  });

  let body = '';
  for await (const chunk of req) body += chunk;

  if (mode === 'rate-limit') {
    res.writeHead(429, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'simulated rate limit' } }));
    return;
  }

  if (mode === 'auth') {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'simulated authentication failure' } }));
    return;
  }

  if (mode === 'slow') {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const parsed = JSON.parse(body);
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({
    output_text: `response:${parsed.input}`,
    usage: { input_tokens: 7, output_tokens: 11 },
    output: [{ type: 'message', content: [{ type: 'output_text', text: `response:${parsed.input}` }] }],
  }));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const baseUrl = `http://127.0.0.1:${port}/v1`;

try {
  const adapter = new OpenAIAdapter({
    id: 'openai-test',
    model: 'test-model',
    apiKey: 'test-secret',
    baseUrl,
  });

  const success = await adapter.execute(
    { id: 'openai-success', prompt: 'hello' },
    { requestId: 'req-success' },
  );
  assert.equal(success.status, 'success');
  assert.equal(success.output, 'response:hello');
  assert.equal(success.usage.inputTokens, 7);
  assert.equal(success.usage.outputTokens, 11);
  assert.equal(requests[0].authorization, 'Bearer test-secret');
  assert.equal(requests[0].requestId, 'req-success');

  mode = 'rate-limit';
  await assert.rejects(
    () => adapter.execute({ id: 'openai-rate', prompt: 'retry me' }),
    (error) => error.code === 'RATE_LIMITED' && error.retryable === true,
  );

  mode = 'auth';
  await assert.rejects(
    () => adapter.execute({ id: 'openai-auth', prompt: 'do not retry' }),
    (error) => error.code === 'AUTHENTICATION' && error.retryable === false,
  );

  mode = 'success';
  const core = createExecutionCore({
    providers: [adapter],
    timeoutMs: 500,
    retries: 1,
    retryDelayMs: 1,
  });
  const integrated = await core.execute({ id: 'openai-integrated', prompt: 'through core' });
  assert.equal(integrated.summary.succeeded, 1);
  assert.equal(integrated.results[0].status, 'success');
  assert.equal(integrated.results[0].output, 'response:through core');

  mode = 'slow';
  const timeoutCore = createExecutionCore({
    providers: [adapter],
    timeoutMs: 10,
  });
  const timeout = await timeoutCore.execute({ id: 'openai-timeout', prompt: 'slow' });
  assert.equal(timeout.results[0].status, 'timeout');
  assert.equal(timeout.results[0].error.code, 'TIMEOUT');

  console.log('[GREEN] V2.2 OpenAI provider adapter contract satisfied');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
