# ArgOS Current Architectural Baseline

Status: CURRENT DRAFT
Authority: Active ArgOS architecture for the new build
Repository: Kelziejordan/Arg
Parent ecosystem: ARG

## 1. Purpose

ArgOS is the operating system/runtime layer for the ARG ecosystem. It governs and composes capabilities that descend from ArgCore without replacing, copying, or redefining ArgCore.

ArgCore is the frozen foundational ancestor. ArgOS consumes ArgCore as a versioned external dependency.

## 2. Architectural lineage

ARG is the parent ecosystem and brand.

ArgCore is the foundational Core layer and canonical ancestor runtime.

ArgOS is the operating system/runtime layer for systems and branches that stem from ArgCore.

ArgAtlas is the ecosystem-level continuity and engineering-memory boundary. It supports continuity and provenance across ArgCore, ArgOS, and future branches; it does not replace their technical sources of truth.

## 3. ArgCore boundary

ArgOS MUST consume ArgCore through its published package boundary.

Current pinned dependency:

@kelziejordan/argcore@1.0.0-argcore-004

ArgOS MUST NOT copy ArgCore source into the ArgOS repository.

ArgOS MUST NOT modify the ArgCore runtime as part of ArgOS implementation.

ArgOS MUST NOT create a second competing implementation of ArgCore's governed execution contracts.

The ArgCore repository and ARGCORE-004 package remain independently frozen and governed.

## 4. ArgOS responsibility

ArgOS is responsible for runtime composition above the ArgCore boundary.

The first integration surface is a single governed adapter through which ArgOS invokes the published ArgCore runtime.

The adapter is an integration boundary, not a replacement for ArgCore.

## 5. Governance invariants

1. Core authority remains in ArgCore.
2. ArgOS cannot silently redefine ArgCore contracts.
3. Dependency versions are explicit and auditable.
4. Provenance must remain traceable from ArgOS execution to the exact ArgCore version used.
5. Cross-boundary data movement must preserve the established 94% data-saver capsule invariant.
6. Security boundaries established for the ecosystem remain mandatory.
7. Historical ArgOS material is evidence of prior intent, not current implementation authority.
8. Unknown or conflicting architectural state must block implementation rather than be silently reconciled.

## 6. Repository authority

This repository is the active home for the new ArgOS runtime.

Historical ArgOS repositories and prior builds remain available for preservation, comparison, and recovery. They do not become implementation dependencies unless explicitly adopted through a governed decision.

## 7. Superseded material

The July 2026 documents formerly stored at the repository root are preserved under:

ARCHIVE/SUPERSEDED/2026-07/

Those files retain historical value and provenance but do not govern current implementation.

## 8. Current implementation direction

The current implementation sequence is:

1. Establish and verify the ArgCore dependency boundary.
2. Implement one ArgOS-to-ArgCore governed runtime adapter.
3. Verify exact-version provenance and boundary integrity.
4. Compose ArgOS runtime capabilities above the adapter.
5. Establish end-to-end governed execution.
6. Only then expand into multi-AI orchestration and product branches.

## 9. Quality standard

“We Aim for Beyond the Next Level as a Minimal Standard for Quality and Build Standards Throughout the Entire Project”

This is the project-wide quality and build standard.
