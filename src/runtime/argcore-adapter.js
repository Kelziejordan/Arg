import { executeGovernedLifecycle } from "@kelziejordan/argcore";

function assertObject(value, name) {
  if (!value || typeof value !== "object") {
    throw new TypeError(`${name} is required`);
  }
}

function validateAdapterInput(input) {
  assertObject(input, "input");
  assertObject(input.request, "request");
  assertObject(input.principal, "principal");
  assertObject(input.authority, "authority");
  assertObject(input.policy, "policy");
  assertObject(input.budget, "budget");
  if (typeof input.executor !== "function") {
    throw new TypeError("executor is required");
  }
}

async function executeThroughArgCore(input) {
  validateAdapterInput(input);
  return executeGovernedLifecycle(input);
}

export { executeThroughArgCore };
