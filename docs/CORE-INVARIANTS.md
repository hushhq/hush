# Hush Core Product Invariants

This document defines the product surfaces that must not regress in Hush. It is intentionally cross-repository: Hush is a Discord-like private communications system, so user trust depends on flows spanning web, server, desktop, crypto, and ops.

Before changing any referenced area, the agent must identify which invariants are in scope, inspect the listed components, and run targeted verification. If a change cannot preserve an invariant, stop and escalate before editing.

## Prime Invariants

1. **Users must be able to communicate.** Messages, attachments, voice rooms, invites, and device linking must work without refresh rituals, stale state, or hidden error recovery.
2. **Users must know who they are talking to.** Display names, usernames, member lists, system logs, voice tiles, DMs, and profile popovers must resolve identity consistently.
3. **E2EE state must not be lost or silently invalidated.** No cache clear, service worker update, desktop update, normal logout, device link, or migration may wipe identity, vault, OpenMLS, or transcript state. Explicit destructive flows are different: device revoke, local account removal, and confirmed compromise recovery must destroy or invalidate the affected local state by design.
4. **Instance boundaries must never leak credentials.** JWTs, MLS calls, voice MLS calls, attachment calls, LiveKit tokens, and device-link export calls must route to the owning instance, not `window.location.origin` by accident.
5. **Realtime state must converge without manual reload.** Membership changes, MLS commits, system events, voice state, presence, and reconnect catch-up must update the current UI promptly.
6. **Errors must be actionable.** User-facing failures for auth, voice, message decrypt, attachment upload/download, update, and device linking must distinguish expected recoverable states from corruption or server mismatch.
7. **Desktop and web must behave as one product.** The Electron shell may use a local protocol, tray, native menus, and updater IPC, but user-facing links, API calls, and security decisions must still use the public instance identity.

## Critical Surfaces

### Authentication, Vault, and Device Identity

User impact:

- users can log in, unlock the vault, link devices, and recover sessions;
- PIN policy and vault session policy remain enforceable;
- identity keys remain available to MLS, voice, attachments, and instance boot.

Canonical model:

- **Account identity** is the user's root identity, recoverable from the 12-word phrase. Users understand this phrase; they do not interact with raw private/public keys.
- **Device identity** is a per-device credential bound to the account. It is the unit that can be listed, named, linked, revoked, and audited.
- **Session tokens** are short-lived authorization artifacts for API/WS calls. Revoking or expiring a token is not the same as revoking a device.
- **Local vault state** stores account/device material needed for PIN unlock and encrypted local operation. PIN unlock may only restore a device that is still authorized.
- **Device registry** on the server is the source of truth for authorized/revoked devices. Client caches and IndexedDB mirrors must converge to it, not override it.
- **User-facing identity** is display name first, username second. Public keys, private keys, device public keys, and opaque user ids are never normal UI labels.

Core files:

- `hush-web/src/hooks/useAuth.js`
- `hush-web/src/hooks/useInstances.js`
- `hush-web/src/lib/identityVault.js`
- `hush-web/src/lib/vaultSessionKey.ts`
- `hush-web/src/lib/vaultInactivityDeadline.js`
- `hush-web/src/lib/deviceLinking.js`
- `hush-web/src/components/devices/ApproveDeviceLinkFlow.jsx`
- `hush-server/internal/api/auth.go`
- `hush-server/internal/api/devices.go`
- `hush-server/internal/api/link_archives.go`
- `hush-server/internal/db/users.go`
- `hush-server/internal/db/sessions.go`

Never break:

- no generic `localStorage.clear()`, `indexedDB.deleteDatabase()`, cache wipe, or service worker cleanup that touches auth/vault/MLS stores;
- no "non-destructive" cleanup policy applied to a device-revoke or confirmed-compromise flow. Revoke is intentionally destructive for the revoked device;
- no auth fallback that produces `publicKey: null` or boots an instance without valid identity keys;
- no PIN-unlock path that can reactivate a server-revoked device from local vault state alone;
- no conflation of logout, session expiration, and device revoke. They are separate lifecycle transitions with separate persistence rules;
- no device-list UI that treats stale local cache as authoritative after link, logout, revoke, or recovery;
- no device registration path without a human-readable device label. Sign-up,
  challenge verification/recovery, and device-link approval must all supply the
  label. The server may backfill a missing row with that label, but must not
  overwrite an already-certified device row during `/verify`;
- no device-link endpoint that can return the SPA HTML fallback where JSON is required;
- no reset of PIN failure counters or vault lock deadlines on refresh;
- no device-link export route that trusts untrusted claim URLs for bearer-token requests.

Required verification when touched:

- auth restore from existing vault;
- PIN wrong-attempt persistence across refresh;
- device link from an existing logged-in device;
- second-device boot with correct identity key and current user profile;
- revoke device B from device A, then confirm device B cannot PIN-unlock back into the account;
- logout from one device and confirm the authorized-device list converges without manual reload;
- linked and non-linked device rows show stable human device labels or an explicit, bounded fallback;
- challenge verification/recovery-created device rows show the submitted human
  label and do not rewrite labels on existing certified devices;
- cross-tab logout and server-session invalidation.

### MLS, Messages, and Realtime Catch-up

User impact:

- messages sent from one device become readable on other devices without refresh;
- reconnect catches up commits in order;
- wrong-epoch and too-distant errors are either recovered or clearly bounded;
- protocol/ciphersuite mismatches fail closed before durable corruption.

Core files:

- `hush-web/src/hooks/useChannelMessages.ts`
- `hush-web/src/hooks/useMLS.js`
- `hush-web/src/hooks/useTextChannelMLSCommitListener.ts`
- `hush-web/src/lib/mlsGroup.js`
- `hush-web/src/lib/mlsStore.js`
- `hush-web/src/lib/messageEnvelope.ts`
- `hush-web/src/lib/preDecryptForLinkExport.js`
- `hush-web/src/lib/handshakeCompatibility.ts`
- `hush-web/src/lib/api.js`
- `hush-web/src/lib/instanceApi.js`
- `hush-server/internal/api/mls.go`
- `hush-server/internal/ws/handlers.go`
- `hush-server/internal/db/mls.go`
- `hush-server/internal/db/mls_groups.go`
- `hush-crypto/`
- `openmls-book/`

Never break:

- no raw API dependency that silently falls back to current origin for MLS catch-up or commits;
- no message send path that succeeds locally while failing to publish required MLS state;
- no ciphersuite migration without explicit compatibility gate and state migration plan;
- no swallowing of `WrongEpoch`, `TooDistantInThePast`, or handshake mismatch as generic UI noise;
- text-channel MLS removals must use the device-scoped credential identity
  (`userId:deviceId`), never a bare application user id. Server-originated
  `mls.add_request action=remove` frames must carry `requester_device_id`
  derived from the authenticated WS client. Clients must refuse to call
  `removeMemberFromChannel` / `removeMembers` with a bare user id and must
  fall back to catch-up instead. `unknown member` from a remove path is not
  benign; it indicates an identity mismatch and must be surfaced.

Required verification when touched:

- two-device same-user send/read in both directions;
- second user sends while first user is offline, then reconnects;
- page refresh after several messages still decrypts history;
- incompatible handshake blocks auth/WS before MLS processing;
- catch-up requests use the owning instance base URL.

### User Identity, Profiles, Members, and System Logs

User impact:

- member lists update when someone joins/leaves/is moderated;
- system logs show human-readable actor/target labels;
- profile popovers show real user fields and dates;
- UI separates display names from `@username` handles.

Core files:

- `hush-web/src/adapters/useMembersForServer.ts`
- `hush-web/src/adapters/useServerJoinEvents.ts`
- `hush-web/src/adapters/useServerModerationEvents.ts`
- `hush-web/src/components/realtime/PerServerListeners.tsx`
- `hush-web/src/components/members-sidebar.tsx`
- `hush-web/src/components/system-channel-view.tsx`
- `hush-web/src/lib/systemActorLabel.ts`
- `hush-web/src/lib/userLabel.ts`
- `hush-server/internal/api/servers.go`
- `hush-server/internal/api/invites.go`
- `hush-server/internal/db/server_members.go`
- `hush-server/internal/db/system_messages.go`

Never break:

- no `Actor: abcd...1234` for normal member joins after roster data is available;
- no `@@username` or `@Display Name`;
- no public key, device key, opaque account id, or transport identity as a normal display label;
- no persisted username values with presentation prefixes such as `@`;
- no single-label user surface that shows username when a display name is available;
- no hardcoded profile dates;
- no stale active roster after `member_joined`, kick, ban, mute, or role change;
- no UI model that drops fields already returned by the server.

Required verification when touched:

- invite a second user into a server and observe roster/system log without refresh;
- open profile cards for self and another user;
- validate display name blank, display name set, display name equal to username, username fallback, and federated member cases;
- validate historical messages, current messages, member rows, profile cards, voice tiles, and system logs use the same identity priority;
- voice participant labels match profile identity.

### Voice Rooms and LiveKit

User impact:

- joining, leaving, mute, deafen, device selection, screen share, and reconnect work predictably;
- participant labels are not generic unless profile data is truly unavailable;
- voice MLS state and LiveKit tokens never leak across instances.

Core files:

- `hush-web/src/components/voice-channel-view.tsx`
- `hush-web/src/components/voice/voice-participant-tile.tsx`
- `hush-web/src/hooks/useRoom.js`
- `hush-web/src/hooks/useVoiceChannelPresence.ts`
- `hush-web/src/lib/livekitUrl.ts`
- `hush-server/internal/api/livekit.go`
- `hush-server/internal/livekit/`
- `hush-server/internal/ws/handlers.go`
- public RTC capacity and routing documentation for the deployed topology

Never break:

- no empty participant name that becomes `Participant`;
- no unmute while staying deafened;
- no mic test that leaves the user in the wrong mute/deafen state;
- no Safari/iCloud Private Relay regression by routing RTC through Cloudflare proxy paths incorrectly;
- no `autoSubscribe` or subscribe behavior change without explicit performance/privacy review;
- no LiveKit URL trust change that breaks split API/RTC host topology;
- voice MLS removals must use the device-scoped credential identity
  (`userId:deviceId`), never a bare application user id. LiveKit
  `participant.identity` stays user-scoped for moderation
  (`RemoveParticipant(room, userID)`) and UI labels, and is NOT a
  valid MLS removal target. The MLS device identity travels through
  the LiveKit access-token `metadata` claim (stamped server-side in
  `internal/api/livekit.go` and parsed client-side via
  `voiceParticipantMetadata.parseVoiceParticipantMlsIdentity`). On
  `RoomEvent.ParticipantDisconnected`, the remaining clients must
  call `mlsGroup.removeMemberFromVoiceGroup` with that exact
  `userId:deviceId` or skip the eviction; they must never fall back
  to `participant.identity`. A LiveKit token must not be issued to
  a session whose authenticated device id is empty.

Known intentional behavior:

- `hush-web/src/hooks/useRoom.js` currently keeps `autoSubscribe: true`
  intentionally for the LiveKit prebuilt participant grid path. Do not flip it
  casually. Any change to this setting requires a replacement selective-
  subscription design, performance/privacy review, and two-participant voice
  smoke testing.

Required verification when touched:

- join voice from two clients, including web plus desktop;
- mute/deafen/unmute transitions;
- mic test while already in voice;
- leave/rejoin without stale LiveKit room state;
- Safari macOS with Private Relay path, when RTC routing changes;
- LiveKit token and MLS voice API calls hit the intended instance/RTC origin.

### Attachments and Media

User impact:

- users can upload, send, download, and decrypt allowed attachments;
- server never sees plaintext bytes or AES-GCM keys;
- MIME and URL policy remain defensive without blocking valid core usage.

Core files:

- `hush-web/src/hooks/useAttachmentUploader.ts`
- `hush-web/src/hooks/useAttachmentDownloader.ts`
- `hush-web/src/components/chat/attachment-download-helper.ts`
- `hush-web/src/lib/attachmentCrypto.ts`
- `hush-web/src/lib/attachmentLimits.ts`
- `hush-web/src/lib/attachmentTransport.ts`
- `hush-web/src/lib/messageEnvelope.ts`
- `hush-server/internal/api/attachments.go`
- `hush-server/internal/storage/`
- `hush-server/internal/db/attachments.go`
- `hush-server/docs/ATTACHMENTS.md`

Never break:

- no relative upload/download URL fetched against `app://localhost`;
- no bearer token sent to absolute S3/R2/MinIO presigned URLs;
- no attachment MIME broadening to `image/` or `text/` without explicit XSS review;
- no server/client allowlist drift without tests and documentation;
- no S3-only assumption if `postgres_bytea` is documented as supported;
- no attachment error that hides whether failure was presign, PUT, GET, decrypt, or policy.

Required verification when touched:

- upload and download `image/png`, `image/jpeg`, and at least one non-image allowed type;
- test hosted/default `postgres_bytea` fallback and S3/R2 path if config changes;
- verify desktop `app://localhost` path;
- verify invalid MIME is rejected before upload;
- verify decrypt failure renders as attachment failure, not broken UI.

### Federation, Instance Routing, and Credential Boundaries

User impact:

- a selected instance owns its JWT, MLS state, voice state, attachments, and invites;
- desktop/web origins never override instance origins;
- federated users do not leak credentials to the app origin or attacker-controlled claim URLs.

Core files:

- `hush-web/src/lib/api.js`
- `hush-web/src/lib/instanceApi.js`
- `hush-web/src/lib/authInstanceStore.js`
- `hush-web/src/hooks/useInstances.js`
- `hush-web/src/contexts/InstanceContext.jsx`
- `hush-web/src/lib/inviteLinks.js`
- `hush-web/src/components/authenticated-app.tsx`
- `hush-server/internal/api/invites.go`
- `hush-server/internal/api/discover.go`
- `hush-server/internal/api/instance.go`

Never break:

- no JWT-bearing relative call to the wrong origin;
- no desktop `app://localhost` in generated invite links;
- no user-controlled claim URL used as trusted API base;
- no build-wide `VITE_*` override that overrides per-instance server data in federation;
- no same-host assumption for supported split-host API/RTC topologies.

Required verification when touched:

- generate invite from browser and desktop;
- claim invite on another device;
- run cross-instance/federated base URL tests;
- inspect fetch mocks for correct base URL on auth, MLS, voice MLS, attachments, and link export.

### Desktop Runtime, Updates, and Native Shell

User impact:

- desktop app launches into the same product state as web;
- update checks do not expose PIN/vault before update decision;
- close-to-tray preserves live state where expected;
- native shell never rewrites public links or API origins.

Core files:

- `hush-desktop/src/main/index.ts`
- `hush-desktop/src/main/update/`
- `hush-desktop/src/main/tray.ts`
- `hush-desktop/src/main/appMenu.ts`
- `hush-desktop/src/preload/index.ts`
- `hush-desktop/src/shared/`
- `hush-desktop/electron-builder.config.js`
- `hush-web/src/components/desktop/`
- `hush-web/src/hooks/useDesktopUpdateState.js`
- `hush-web/src/components/desktop/useInstancePing.js`
- `hush-web/src/App.jsx`

Never break:

- no PIN/auth UI before desktop update availability decision;
- no service worker registration on unsupported `app://` origins;
- no desktop API ping blocked by CORS/COEP because it should use the proper bridge or same-origin-safe path;
- no app close that destroys voice/session unexpectedly when product intent is hide-to-tray;
- no release package with stale renderer assets or stale icon assets.

Required verification when touched:

- packaged `.app` launched via Finder/`open`, not only dev mode;
- update check no-update feedback and update-available flow;
- close/reopen preserving voice/session expectation;
- tray/menu bar icon, native menus, Check for Updates;
- generated desktop invite links are public URLs;
- mic/camera/screen permissions still work after packaging.

### Service Worker, PWA, and Web Update Gate

User impact:

- web app updates cannot strand users on incompatible client code;
- cache/update flows must not destroy E2EE state;
- offline access to local history remains possible when update check is unavailable.

Core files:

- `hush-web/src/lib/pwaUpdate.ts`
- `hush-web/src/components/UpdateRequiredDialog.tsx`
- `hush-web/src/components/desktop/DesktopUpdateGate.tsx`
- `hush-web/src/components/desktop/DesktopUpdateBoundary.jsx`
- `hush-web/vite.config.*`
- `hush-web/public/`

Never break:

- no IndexedDB/vault/MLS deletion as part of web update;
- no permanent black screen when update service is offline;
- no incompatible client allowed past handshake compatibility gates;
- no stale service worker serving an incompatible crypto/client version silently.

Required verification when touched:

- old tab receives update-required state;
- offline/no-network boot fails open where required;
- no auth/vault/MLS stores are cleared;
- desktop `app://` path does not attempt unsupported service worker registration.

Known guardrail:

- `hush-web/src/lib/pwaUpdate.ts` must continue to skip service worker
  registration for desktop renderers via the `isDesktopRenderer()` check. That
  check covers `app:` protocol and the `window.hushDesktop.isDesktop` bridge.

### Build, Release, and Hosted Deploy

User impact:

- deployed web/server/desktop artifacts match the intended revision;
- automatic updates and manual downloads do not downgrade or ship stale assets;
- hosted smoke tests do not get confused with production releases.

Core files:

- `publish.md`
- `hush-desktop/.github/workflows/release.yml`
- `hush-web/scripts/deploy.sh`
- `gethush.live/scripts/deploy.sh`
- `hush-server/docker-compose*.yml`
- `hush-server/scripts/`
- host-local operator runbooks and deploy overrides, when present

Never break:

- no release without version bump for changed client/server/crypto compatibility;
- no GitHub Release with stale binaries;
- no desktop auto-update feed pointing to a different version than landing/download metadata;
- no hosted deploy from an accidental dirty branch;
- no public repo documentation that depends on non-public operational paths.

Required verification when touched:

- record deployed SHA for web and server;
- confirm `/api/health`, `/api/handshake`, and public SPA;
- confirm desktop package version, bundle id, embedded renderer, signature/notarization status;
- confirm whether build is smoke-only or release.

## Mandatory Change Protocol

When a task touches any critical surface:

1. **Declare impacted invariants.** In the prompt, PR description, or summary, list the sections from this document that apply.
2. **Inspect before editing.** Read the current files listed for those sections. Do not assume previous session knowledge is current.
3. **Prefer small fixes over subsystem rewrites.** If a central system is missing, document it as long-term unless the immediate bug truly requires it.
4. **Add regression tests at the boundary that broke.** Unit tests are not enough if the failure was wiring or route ownership. Add integration-style tests or testable seams.
5. **Run targeted checks.** At minimum run typecheck plus tests for each touched invariant. For server changes run relevant Go packages; for desktop changes build/package when runtime behavior is affected.
6. **Perform manual smoke for user-facing core flows before release.** For chat/voice/profile/attachments, use at least two clients when feasible.
7. **Update this document when the architecture changes.** If the fix reveals a missing invariant or an ambiguous lifecycle rule, update this file in the same workstream before shipping.
8. **Write a summary.** Every Claude/Codex handoff must say what invariants were touched, what tests were run, what remains unverified, and whether release/deploy happened.

## Minimum Smoke Matrix Before Public Release

Run this before promoting a release that changes any core communication path:

1. **Auth/vault:** log in, unlock PIN, refresh, relaunch desktop, no key loss.
2. **Device revoke:** device A revokes device B; B is forced out and cannot PIN-unlock back into the account from local vault state.
3. **Device list convergence:** link, logout, and revoke update the authorized-device list without manual reload.
4. **Two-device same-user:** device A and B both receive and decrypt current messages.
5. **Two-user server:** invite user B, roster updates, system log labels B correctly, profile card is populated.
6. **Chat:** send text both directions, reload both clients, history decrypts.
7. **Attachments:** upload/download allowed image and one non-image; verify failure UI for disallowed type.
8. **Voice:** two users join voice, labels correct, mute/deafen/mic test/leave/rejoin work.
9. **Desktop:** launch packaged app, close/reopen behavior, tray/menu, update check, public invite link.
10. **Instance routing:** inspect representative API calls for correct origin on desktop and browser.
11. **Hosted health:** `/`, `/api/health`, `/api/handshake`, `/ws`, and `/livekit` paths are reachable as applicable.

If any smoke step fails, do not release. Fix or explicitly downgrade the release scope.
