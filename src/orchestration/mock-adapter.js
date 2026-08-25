import { ERROR_CODES } from './provider-adapter.js';

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) {
    reject(signal.reason ?? new Error('Operation cancelled'));
    return;
  }

  const timer = setTimeout(resolve, ms);
  signal?.addEventListener('abort', () => {
    clearTimeout(timer);
    reject(signal.reason ?? new Error('Operation cancelled'));
  }, { once: true });
});

export class MockAdapter {
  constructor({
    id,
    modelId = id,
    latencyMs = 0,
    output = null,
    failure = null,
    failureSequence = [],
    usage,
  } = {}) {
    if (!id) throw new TypeError('MockAdapter id is required');
    this.id = id;
    this.modelId = modelId;
    this.latencyMs = latencyMs;
    this.output = output ?? `mock-output:${id}`;
    this.failure = failure;
    this.failureSequence = [...failureSequence];
    this.usage = usage;
    this.calls = [];
  }

  async execute(task, { requestId, signal } = {}) {
    const startedAt = Date.now();
    this.calls.push({ requestId, taskId: task?.id });

    if (this.latencyMs > 0) await sleep(this.latencyMs, signal);

    const configuredFailure = this.failureSequence.length > 0
      ? this.failureSequence.shift()
      : this.failure;

    if (configuredFailure) {
      const error = new Error(configuredFailure.message ?? 'Mock provider failure');
      error.code = configuredFailure.code ?? ERROR_CODES.PROVIDER_ERROR;
      error.retryable = Boolean(configuredFailure.retryable);
      throw error;
    }

    const generatedOutput = typeof this.output === 'function'
      ? this.output(task)
      : this.output;
    const resolvedOutput = generatedOutput && typeof generatedOutput.then === 'function'
      ? await generatedOutput
      : generatedOutput;

    return {
      providerId: this.id,
      modelId: this.modelId,
      status: 'success',
      output: resolvedOutput,
      latencyMs: Date.now() - startedAt,
      usage: this.usage,
      timestamp: new Date().toISOString(),
    };
  }
}
