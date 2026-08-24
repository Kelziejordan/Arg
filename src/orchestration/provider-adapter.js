export const PROVIDER_STATUSES = Object.freeze([
  'success',
  'error',
  'timeout',
  'cancelled',
]);

export const ERROR_CODES = Object.freeze({
  INVALID_ADAPTER: 'INVALID_ADAPTER',
  INVALID_TASK: 'INVALID_TASK',
  TIMEOUT: 'TIMEOUT',
  CANCELLED: 'CANCELLED',
  RATE_LIMITED: 'RATE_LIMITED',
  AUTHENTICATION: 'AUTHENTICATION',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  EXECUTION_ERROR: 'EXECUTION_ERROR',
});

export function assertProviderAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new TypeError('provider adapter must be an object');
  }

  if (typeof adapter.id !== 'string' || adapter.id.length === 0) {
    throw new TypeError('provider adapter id must be a non-empty string');
  }

  if (typeof adapter.execute !== 'function') {
    throw new TypeError(`provider adapter ${adapter.id} must implement execute()`);
  }

  return adapter;
}

export function normalizeProviderResult(result, { providerId, modelId, timestamp = new Date().toISOString() } = {}) {
  if (!result || typeof result !== 'object') {
    return {
      providerId,
      modelId,
      status: 'error',
      latencyMs: 0,
      timestamp,
      error: {
        code: ERROR_CODES.INVALID_RESPONSE,
        message: 'Provider returned an invalid result',
        retryable: false,
      },
    };
  }

  const status = PROVIDER_STATUSES.includes(result.status) ? result.status : 'error';

  return {
    providerId: result.providerId ?? providerId,
    modelId: result.modelId ?? modelId,
    status,
    output: result.output,
    latencyMs: Number.isFinite(result.latencyMs) ? result.latencyMs : 0,
    usage: result.usage,
    error: result.error,
    timestamp: result.timestamp ?? timestamp,
  };
}
