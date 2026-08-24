import { createHash } from 'node:crypto';
import {
  assertProviderAdapter,
  ERROR_CODES,
  normalizeProviderResult,
} from './provider-adapter.js';

function deterministicRequestId(taskId, providerId, slot) {
  return createHash('sha256')
    .update(`${String(taskId)}:${providerId}:${slot}`)
    .digest('hex')
    .slice(0, 32);
}

function delay(ms, signal) {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
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
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORT_ERR';
}

function normalizeThrownError(error) {
  return {
    code: error?.code ?? ERROR_CODES.EXECUTION_ERROR,
    message: error?.message ?? String(error),
    retryable: Boolean(error?.retryable),
  };
}

async function executeAttempt(adapter, task, options, requestId, externalSignal) {
  const controller = new AbortController();
  let timedOut = false;
  let externalAbort = false;

  const onExternalAbort = () => {
    externalAbort = true;
    controller.abort(externalSignal.reason ?? new Error('Operation cancelled'));
  };

  if (externalSignal) {
    if (externalSignal.aborted) onExternalAbort();
    else externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`Provider timeout after ${options.timeoutMs}ms`));
  }, options.timeoutMs);

  const startedAt = Date.now();
  try {
    const result = await adapter.execute(task, {
      requestId,
      signal: controller.signal,
    });
    return normalizeProviderResult(result, {
      providerId: adapter.id,
      modelId: result?.modelId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (timedOut) {
      return {
        providerId: adapter.id,
        status: 'timeout',
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        error: {
          code: ERROR_CODES.TIMEOUT,
          message: `Provider timeout after ${options.timeoutMs}ms`,
          retryable: true,
        },
      };
    }

    if (externalAbort || controller.signal.aborted || isAbortError(error)) {
      return {
        providerId: adapter.id,
        status: 'cancelled',
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        error: {
          code: ERROR_CODES.CANCELLED,
          message: 'Provider execution cancelled',
          retryable: false,
        },
      };
    }

    return {
      providerId: adapter.id,
      status: 'error',
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      error: normalizeThrownError(error),
    };
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

export function createExecutionCore({
  providers,
  concurrency = providers?.length ?? 1,
  timeoutMs = 30_000,
  retries = 0,
  retryDelayMs = 25,
  retryBackoff = 2,
} = {}) {
  if (!Array.isArray(providers) || providers.length === 0) {
    throw new TypeError('providers must be a non-empty array');
  }
  providers.forEach(assertProviderAdapter);

  const limit = Math.max(1, Math.min(Number(concurrency) || 1, providers.length));
  const configuredTimeout = Math.max(1, Number(timeoutMs) || 30_000);
  const configuredRetries = Math.max(0, Number(retries) || 0);

  return {
    async execute(task, { signal, concurrency: runtimeConcurrency } = {}) {
      if (!task || typeof task !== 'object' || task.id == null) {
        throw new TypeError('task must be an object with an id');
      }

      const executionId = createHash('sha256')
        .update(`execution:${String(task.id)}`)
        .digest('hex')
        .slice(0, 32);

      const maxConcurrent = Math.max(1, Math.min(
        Number(runtimeConcurrency) || limit,
        providers.length,
      ));

      const results = new Array(providers.length);
      let cursor = 0;

      const worker = async () => {
        while (true) {
          if (signal?.aborted) return;
          const index = cursor++;
          if (index >= providers.length) return;

          const adapter = providers[index];
          const requestId = deterministicRequestId(task.id, adapter.id, index + 1);
          let result;

          for (let attempt = 0; attempt <= configuredRetries; attempt += 1) {
            result = await executeAttempt(
              adapter,
              task,
              { timeoutMs: configuredTimeout },
              requestId,
              signal,
            );

            if (result.status === 'success' || result.status === 'cancelled') break;
            if (!result.error?.retryable || attempt === configuredRetries) break;

            await delay(retryDelayMs * (retryBackoff ** attempt), signal).catch(() => {});
            if (signal?.aborted) break;
          }

          results[index] = {
            ...result,
            requestId,
            attempts: Math.min(configuredRetries + 1, result.status === 'success' ? configuredRetries + 1 : configuredRetries + 1),
          };
        }
      };

      await Promise.all(Array.from({ length: maxConcurrent }, () => worker()));

      const successful = results.filter((result) => result?.status === 'success').length;
      const failed = results.length - successful;

      return {
        taskId: task.id,
        executionId,
        results,
        summary: {
          requested: providers.length,
          succeeded: successful,
          failed,
        },
        independent: true,
        peerVisibility: false,
        consensusRequired: false,
        userInterfaceSlot: 5,
      };
    },
  };
}
