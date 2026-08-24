export function createOrchestrator({ models }) {
  if (!Array.isArray(models)) {
    throw new TypeError('models must be an array');
  }

  return {
    async evaluate(task) {
      if (!task || typeof task !== 'object') {
        throw new TypeError('task must be an object');
      }

      const outputs = models.map((model) => ({
        modelId: model.id,
        taskId: task.id,
      }));

      return {
        modelCount: models.length,
        independent: true,
        userInterfaceSlot: 5,
        peerVisibility: false,
        consensusRequired: false,
        outputs,
      };
    },
  };
}
