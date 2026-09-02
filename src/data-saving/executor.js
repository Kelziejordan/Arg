function assertFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} must be a function`);
}

function assertDisposition(disposition) {
  if (!['reusable', 'local', 'external'].includes(disposition)) {
    throw new TypeError('classifier must return reusable, local, or external');
  }
}

export function createDataSavingExecutor({
  classify,
  externalExecutor,
  localExecutor,
  cache = new Map(),
} = {}) {
  assertFunction(classify, 'classify');
  assertFunction(externalExecutor, 'externalExecutor');
  assertFunction(localExecutor, 'localExecutor');

  if (!cache || typeof cache.has !== 'function' || typeof cache.get !== 'function') {
    throw new TypeError('cache must implement has/get');
  }

  return {
    async execute(workload) {
      if (!workload || typeof workload !== 'object' || workload.id == null) {
        throw new TypeError('workload must be an object with an id');
      }

      const decision = classify(workload, { cache });
      const disposition = typeof decision === 'string' ? decision : decision?.kind;
      assertDisposition(disposition);

      if (disposition === 'reusable') {
        if (!cache.has(workload.key)) {
          throw new Error(`classifier selected reusable work without cached state: ${workload.id}`);
        }
        return {
          id: workload.id,
          result: cache.get(workload.key),
          disposition,
          externalExecuted: false,
        };
      }

      if (disposition === 'local') {
        const result = await localExecutor(workload);
        return {
          id: workload.id,
          result,
          disposition,
          externalExecuted: false,
        };
      }

      const externalResult = await externalExecutor(workload);
      return {
        id: workload.id,
        result: externalResult?.result ?? externalResult,
        disposition,
        externalExecuted: true,
      };
    },
  };
}
