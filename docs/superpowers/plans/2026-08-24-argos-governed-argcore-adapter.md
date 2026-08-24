# ArgOS Governed ArgCore Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one governed ArgOS adapter boundary to the frozen `@kelziejordan/argcore@1.0.0-argcore-004` package without copying or reimplementing ArgCore.

**Architecture:** ArgOS will expose one small adapter module that accepts an already-formed governed execution request, validates the adapter boundary, invokes the published ArgCore runtime entrypoint, and returns the bounded execution result. The adapter owns translation and boundary enforcement only; ArgCore remains the authority for governed execution, admission, grants, provenance, audit, and lifecycle semantics.

**Tech Stack:** Node.js ESM, npm, `@kelziejordan/argcore@1.0.0-argcore-004`, Node built-in test runner, GitHub Actions.

**Spec:** `ARGOS_CURRENT_ARCHITECTURAL_BASELINE.md` plus the approved ArgOS Runtime Task 1 design in the working conversation.

## Global Constraints

- ArgCore-004 remains frozen and must not be modified.
- ArgOS must consume exactly `@kelziejordan/argcore@1.0.0-argcore-004`.
- ArgOS must not copy any ArgCore runtime source.
- ArgOS must not implement a competing Core execution engine.
- The adapter is the single ArgOS integration point to ArgCore.
- The adapter must fail closed on malformed or unauthorized input.
- Identity, execution-grant, and provenance linkage must cross the boundary intact.
- The 94% data-saver capsule invariant remains an ecosystem requirement.
- The existing security boundary remains an ecosystem requirement.
- No AI/provider SDKs, multi-agent orchestration, branch implementations, or unrelated refactoring are part of this tranche.

---

### Task 1: Establish the failing governed-adapter contract

**Files:**
- Create: `tests/contracts/argcore-adapter.contract.test.mjs`
- Create: `src/runtime/argcore-adapter.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `createGovernedExecutionRequest` from `@kelziejordan/argcore` and the frozen package's governed execution entrypoint.
- Produces: `executeThroughArgCore(request)` from `src/runtime/argcore-adapter.js`.

- [ ] **Step 1: Add the adapter contract test.**

The contract must assert all of the following:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { executeThroughArgCore } from "../../src/runtime/argcore-adapter.js";

const validRequest = {
  requestId: "req-task1-001",
  actorId: "argos",
  action: "inspect",
  payload: { value: "bounded" },
  authority: { source: "argos" },
  governance: { policy: "default" },
};

test("ArgOS adapter exposes one governed ArgCore execution boundary", () => {
  assert.equal(typeof executeThroughArgCore, "function");
});

test("adapter rejects missing requests", () => {
  assert.throws(() => executeThroughArgCore(undefined), /request|required|invalid/i);
});

test("adapter rejects malformed requests before Core execution", () => {
  assert.throws(
    () => executeThroughArgCore({ requestId: "req-task1-002" }),
    /invalid|required|govern/i,
  );
});

test("adapter preserves request identity and returns Core result", async () => {
  const result = await executeThroughArgCore(validRequest);
  assert.equal(result.requestId, validRequest.requestId);
  assert.ok(result.provenance);
});

test("adapter does not expose a second execution engine", async () => {
  const module = await import("../../src/runtime/argcore-adapter.js");
  assert.deepEqual(Object.keys(module), ["executeThroughArgCore"]);
});
```

Adjust only the exact request shape and exported Core entrypoint after inspecting the published package's actual API; do not invent a parallel ArgOS contract that bypasses Core.

- [ ] **Step 2: Run the new contract and confirm RED.**

Run:

```bash
node --test tests/contracts/argcore-adapter.contract.test.mjs
```

Expected: FAIL because `src/runtime/argcore-adapter.js` does not yet exist.

- [ ] **Step 3: Add the smallest adapter implementation.**

Implement only:

```js
export async function executeThroughArgCore(request) {
  // Validate the adapter boundary.
  // Delegate to the exact published ArgCore governed execution entrypoint.
  // Return the bounded Core result without rewriting Core semantics.
}
```

The implementation must import the published package, not a relative path into an ArgCore source tree.

- [ ] **Step 4: Run the focused contract and confirm GREEN.**

Run:

```bash
node --test tests/contracts/argcore-adapter.contract.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Add the contract to the ArgOS verification command.**

Modify the existing test command only as necessary so the adapter contract is executed by the repository's normal verification path.

Run:

```bash
npm test
```

Expected: existing checks plus the adapter contract pass.

- [ ] **Step 6: Commit the bounded implementation.**

```bash
git add tests/contracts/argcore-adapter.contract.test.mjs src/runtime/argcore-adapter.js package.json
git commit -m "feat: establish governed ArgCore adapter boundary"
```

### Task 2: Prove the repository dependency boundary

**Files:**
- Create: `tests/contracts/argcore-source-boundary.contract.test.mjs`
- Modify: `package.json` only if required to register the contract.

**Interfaces:**
- Consumes: repository filesystem and package metadata.
- Produces: a deterministic proof that ArgOS contains no copied ArgCore runtime source and references the exact frozen package version.

- [ ] **Step 1: Write the failing boundary test.**

The test must assert:

```js
packageJson.dependencies["@kelziejordan/argcore"] === "1.0.0-argcore-004"
```

and recursively reject any ArgOS path matching a copied Core runtime tree such as `src/runtime` when that tree contains Core implementation files.

- [ ] **Step 2: Run it and confirm RED if the repository metadata is incomplete.**

Run:

```bash
node --test tests/contracts/argcore-source-boundary.contract.test.mjs
```

- [ ] **Step 3: Make only the minimum dependency-boundary correction.**

Do not copy ArgCore source. If the exact dependency metadata is already present, only implement the test.

- [ ] **Step 4: Run the focused boundary test and the complete ArgOS test suite.**

```bash
node --test tests/contracts/argcore-source-boundary.contract.test.mjs
npm test
```

Expected: PASS with no copied Core source.

- [ ] **Step 5: Commit the boundary proof.**

```bash
git add tests/contracts/argcore-source-boundary.contract.test.mjs package.json
 git commit -m "test: enforce ArgCore dependency boundary"
```

### Task 3: Freeze and review the adapter tranche

**Files:**
- Modify: `docs/ARGOS_CURRENT_ARCHITECTURAL_BASELINE.md` only if the current baseline needs a precise adapter-boundary statement.
- Create: `docs/ARGOS-RUNTIME-TASK-1-GOVERNED-ARGCORE-ADAPTER.md`

**Interfaces:**
- Consumes: GREEN adapter and source-boundary contracts.
- Produces: a reviewable Task 1 record naming the exact dependency, adapter entrypoint, prohibited shortcuts, and verification commands.

- [ ] **Step 1: Record the verified boundary.**

Document:

```text
Dependency: @kelziejordan/argcore@1.0.0-argcore-004
Adapter: src/runtime/argcore-adapter.js
ArgCore source copied into ArgOS: NO
Competing Core implementation: NO
Provider SDKs in ArgCore: NO
Focused adapter contract: GREEN
Repository boundary contract: GREEN
```

- [ ] **Step 2: Run the complete verification command.**

```bash
npm test
```

Expected: GREEN with the adapter and all pre-existing ArgOS checks.

- [ ] **Step 3: Commit the Task 1 record.**

```bash
git add docs/ARGOS-RUNTIME-TASK-1-GOVERNED-ARGCORE-ADAPTER.md docs/ARGOS_CURRENT_ARCHITECTURAL_BASELINE.md
 git commit -m "docs: freeze ArgOS governed ArgCore adapter boundary"
```

- [ ] **Step 4: Stop.**

Do not begin AI provider integration, multi-agent orchestration, branch implementation, or additional runtime services until this tranche has been reviewed and frozen.

## Verification Summary

The tranche is GREEN only when all of the following are true:

```text
ArgCore-004 package:              unchanged
Exact ArgCore dependency:         1.0.0-argcore-004
Copied ArgCore source:            none
Single adapter boundary:          proven
Malformed input:                  rejected
Unauthorized input:               rejected/fails closed
Identity linkage:                 preserved
Grant/provenance linkage:         preserved
Focused adapter contract:         PASS
Full ArgOS verification:          PASS
```
