import { createExecutionCore } from './execution-core.js';
import { assertProviderAdapter } from './provider-adapter.js';

function resolveProvider(model) {
  const provider = model?.adapter ?? model;
  assertProviderAdapter(provider);
  return provider;
}

function toPublicOutput(result) {
  return {
    providerId: result.providerId,
    modelId: result.modelId,
    status: result.status,
    output: result.output,
    latencyMs: result.latencyMs,
    usage: result.usage,
    error: result.error,
    requestId: result.requestId,
    attempts: result.attempts,
    timestamp: result.timestamp,
  };
}

export function createOrchestrator({
  models,
  providers,
  concurrency,
  timeoutMs,
  retries,
  retryDelayMs,
  retryBackoff,
  economicGate,
} = {}) {
  const configuredModels = providers ?? models;
  if (!Array.isArray(configuredModels) || configuredModels.length === 0) {
    throw new TypeError('models/providers must be a non-empty array');
  }

  const resolvedProviders = configuredModels.map(resolveProvider);
  const core = createExecutionCore({
    providers: resolvedProviders,
    concurrency,
    timeoutMs,
    retries,
    retryDelayMs,
    retryBackoff,
    economicGate,
  });

  async function execute(task, options = {}) {
    const result = await core.execute(task, options);
    return {
      ...result,
      outputs: result.results.map(toPublicOutput),
      modelCount: resolvedProviders.length,
      userInterfaceSlot: 5,
    };
  }

  return {
    execute,
    evaluate: execute,
  };
}
