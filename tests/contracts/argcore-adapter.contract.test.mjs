import assert from "node:assert/strict";
import test from "node:test";

import { executeThroughArgCore } from "../../src/runtime/argcore-adapter.js";

const validInput = {
  request: {
    sessionId: "session-task1-001",
    principalId: "argos",
    correlationId: "corr-task1-001",
    prompt: "bounded execution",
    providers: ["test-provider"],
    budget: { maxCalls: 1, maxTokens: 100 },
  },
  principal: { id: "argos" },
  authority: {
    principalId: "argos",
    action: "intelligence.execute",
    resource: "session-task1-001",
    consumed: false,
    expiresAt: "2099-01-01T00:00:00.000Z",
  },
  policy: { allow: true },
  budget: { remainingCalls: 1, remainingTokens: 100 },
  executor: async (execution) => ({
    ok: true,
    correlationId: execution.correlationId,
    principalId: execution.principalId,
    grantId: execution.grantId,
  }),
};

test("ArgOS adapter exposes one governed ArgCore execution boundary", () => {
  assert.equal(typeof executeThroughArgCore, "function");
});

test("adapter rejects missing input", () => {
  assert.throws(() => executeThroughArgCore(undefined), /input|required|invalid/i);
});

test("adapter rejects malformed input before Core execution", () => {
  assert.throws(
    () => executeThroughArgCore({ request: validInput.request }),
    /principal|authority|policy|budget|executor|required|invalid/i,
  );
});

test("adapter preserves Core denial semantics for a mismatched principal", async () => {
  const input = structuredClone(validInput);
  input.principal.id = "other-principal";
  const result = await executeThroughArgCore(input);
  assert.equal(result.status, "DENIED");
  assert.equal(result.outcome.reason, "PRINCIPAL_MISMATCH");
});

test("adapter preserves identity and provenance through Core", async () => {
  const result = await executeThroughArgCore(validInput);
  assert.equal(result.status, "COMPLETED");
  assert.equal(result.outcome.correlationId, validInput.request.correlationId);
  assert.equal(result.outcome.principalId, validInput.request.principalId);
  assert.ok(result.grantId);
  assert.ok(Array.isArray(result.events));
  assert.ok(result.events.some((event) => event.eventType === "EXECUTION_OUTCOME"));
});

test("adapter exposes no competing execution surface", async () => {
  const module = await import("../../src/runtime/argcore-adapter.js");
  assert.deepEqual(Object.keys(module), ["executeThroughArgCore"]);
});
