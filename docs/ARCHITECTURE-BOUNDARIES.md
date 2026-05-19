# Hush Architecture Boundaries

This document defines the state ownership boundaries and runtime contracts that
protect Hush's core product invariants. The goal is not to add fashionable
libraries. The goal is to make ownership explicit enough that auth, device
state, realtime state, and local encrypted state cannot drift silently.

## State Ownership

| State kind | Owner | Tooling | Rule |
|-|-|-|-|
| Server state | API/WS backend | TanStack Query | Anything fetched from the server must have cache keys, invalidation, and refetch policy. |
| Local UI state | React components or small stores | React state / Zustand | UI-only state may be local. It must not become durable truth. |
| Auth/device lifecycle | Explicit lifecycle module | Reducer or state machine | Login, lock, logout, session expiry, revoke, and recovery are distinct transitions. |
| Encrypted local data | Vault/MLS/transcript services | Dedicated storage services | No UI component owns vault, MLS, or transcript persistence directly. |
| Boundary payloads | API/WS/IPC boundary | Zod or equivalent schemas | Untrusted payloads are parsed before business logic consumes them. |
| Failures and telemetry | Error/diagnostic layer | Structured logging plus telemetry | Expected states and corruption states must be distinguishable. |

## Mandatory Rules

1. Server state must not be hand-cached in random hooks. Use TanStack Query for
   device lists, members, invites, channels, settings, and other API-backed
   resources as those surfaces are migrated.
2. Zustand is allowed only for client-owned state that is not a server cache:
   open panels, selected local device, composer draft state, transient media
   device preferences, and similar UI state.
3. Auth/device lifecycle must be modeled as named transitions. A generic
   "clear auth" helper must not handle logout, token expiry, and device revoke
   identically.
4. Device revoke is destructive for the revoked device. Session expiry and
   normal logout are not.
5. Runtime schemas must guard API, WebSocket, desktop IPC, and device-link
   bundle boundaries. TypeScript types alone are insufficient at runtime.
6. Cross-device behavior needs executable tests. Any change to auth, device
   linking, roster identity, invites, or voice key flow must add or update a
   Playwright smoke where a browser-only unit test cannot catch the failure.
7. Networked UI flows should have MSW tests before broad refactors. If a flow
   needs a live backend to unit test, the boundary is too coupled.
8. Errors must carry category, operation, instance origin, and recoverability.
   The UI can simplify the text, but diagnostics must retain the structured
   cause.
9. Successful API responses must never be parsed with best-effort JSON
   fallbacks. A 2xx response with HTML, empty text, or malformed JSON is an API
   boundary failure and must surface as a typed diagnostic. Best-effort JSON
   parsing is allowed only for non-2xx error bodies where the HTTP status
   remains the source of truth.
10. Device-link and archive-transfer payloads are security-sensitive runtime
    contracts. Every successful response in those flows must pass a runtime
    schema before crypto, vault, archive import, or auth-state mutation runs.
    Security-sensitive ready/manifest payloads should reject unexpected fields
    unless there is an explicit compatibility reason not to.
11. A persisted `device_revoked` invalidation is a local tombstone. Startup must
    never reinterpret leftover IndexedDB vault data as a recoverable PIN flow
    while that tombstone exists. It must wipe again and remain unauthenticated.

## Current Coverage

Implemented now:

- strict JSON parsing for the touched device-link and archive-transfer HTTP
  success responses;
- runtime schemas for device-link request, resolve, result, archive init,
  archive transfer windows, finalize missing-list responses, and archive
  manifests;
- strict schemas for device-link ready results and archive manifests;
- TanStack Query ownership for the settings device list and active-server
  member list;
- the first auth/device lifecycle planner for revoked-device tombstones and
  invalidated-session transitions.

Not yet implemented:

- runtime schema coverage for WebSocket messages;
- runtime schema coverage for desktop IPC messages;
- runtime schema coverage for the full device-link import bundle;
- a complete auth/device lifecycle state machine covering all boot, unlock,
  lock, recovery, logout, and revoke transitions;
- Playwright two-device smoke tests for revoke, device link, invite join, and
  identity labels.

## Implementation Order

1. Add runtime schemas for auth/device API responses and device-link payloads.
   Initial coverage exists for device-link request/resolve/result and
   archive-transfer init/window/finalize/manifest responses. New endpoints must
   follow the same boundary pattern before UI integration.
2. Migrate device list and member list reads to TanStack Query with explicit
   invalidation on link, revoke, logout, and membership events. Initial coverage
   exists for settings devices and the active-server member list; remaining
   server-backed surfaces must follow the same query-key and invalidation model.
3. Extract auth/device lifecycle transitions from the main auth hook into a
   small testable module. The first lifecycle planner now covers only
   revoked-device tombstones and invalidated-session transitions; most side
   effects and most boot decisions still live in `useAuth` and must be moved
   behind named lifecycle actions.
4. Add Playwright two-device smoke tests for revoke, device link, invite join,
   and identity labels.
5. Add structured telemetry for auth, device link, WS reconnect, MLS catch-up,
   and desktop updater transitions.
6. Introduce Zustand only where a client-owned store removes prop drilling or
   duplicated UI state. Do not use it as a server cache.

## Review Gate

Every PR touching auth, devices, invites, members, voice, MLS, or desktop
updates must answer:

- Which state kind does this change touch?
- Who owns that state?
- What invalidates it?
- What happens if the operation runs twice?
- What happens if the browser refreshes halfway through?
- Which automated test proves the cross-device behavior?
