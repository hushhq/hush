# In-app bug reporting

The Hush client will eventually grow a built-in "Report a bug" surface.
This document fixes the intended architecture so the eventual
implementation cannot drift into something privacy-hostile. Nothing here
is implemented in product code yet.

## Goals

- The user can report a bug without leaving the app.
- The report is **anonymous by default**.
- The app shows the user the *exact* payload that will leave the device
  before they submit.
- No information that identifies the user or their conversations ever
  reaches a public tracker.

## What the client must never submit

The client-side reporter is forbidden from including any of:

- seed phrases or mnemonic recovery strings,
- private keys (identity, vault, MLS, device, anything),
- public keys (treated as identifiers even though they look generic),
- usernames, display names, email addresses, instance handles,
- channel names, server names, room names, voice room IDs,
- decrypted message contents, attachments, transcripts, or media,
- contents of any encrypted payload after the client has decrypted it,
- tokens (JWTs, capability tokens, upload tokens, session cookies).

This list is part of the contract, not a guideline. The client must hard
reject, not redact, a report payload that would carry any of the above.

## What the user enters

Three free-text fields, all optional but at least one required so empty
submissions are filtered:

- **Type**: short categorical pick (UI bug, crash, performance, voice,
  device linking, "other").
- **Description**: what happened.
- **Reproduction steps**: how to reproduce, if known.

## Anonymous metadata the client may submit

The reporter may include the following automatically. None of it
identifies the user.

- App version (build hash + semver tag from the build manifest).
- Platform (desktop / web / mobile).
- OS family + version (e.g. "macOS 14.5", "Windows 11 23H2", "Linux 6.6").
- CPU architecture (x86_64 / arm64).
- App surface where the report was opened (channel view, settings,
  device linking, voice room, etc.).
- A coarse, *non-PII* lifecycle state from the central auth state machine
  (e.g. `vault-locked`, `device-linked-pending-verify`) only when the
  state machine already exposes this label and only by name. The actual
  state machine payload is never sent.

The submission UI must display this metadata block to the user before
submission so the user can see what is leaving the device.

## Submission target

The client submits to a **server-side proxy**, not to a third-party
tracker directly. Reasons:

- Rotating credentials, rate-limiting, abuse mitigation, and schema
  enforcement live on the proxy, not in shipped client code.
- The client does not need to carry a tracker API key.
- The proxy can reject malformed or oversized payloads, normalize
  metadata, and tag the eventual ticket with whatever fields the triage
  workflow needs.

The proxy creates a **private** ticket in the maintainers' triage system
(planned: Linear). Tickets do not auto-publish anywhere. If a maintainer
later decides the report is safe and useful as a public GitHub issue,
they open it by hand on
<https://github.com/hushhq/hush/issues/new/choose>, with the reporter's
consent if they identified themselves.

## Surface inside the app

The "Report a bug" entry point lives in Settings (or an equivalent
non-time-sensitive surface). It shows two paths:

1. **In-app anonymous report**: opens the form described above.
2. **Public GitHub issue**: link to
   <https://github.com/hushhq/hush/issues/new/choose>. This path is
   useful when the reporter wants a public discussion thread, has logs
   to attach, or wants to be notified about progress.

## Open questions / follow-ups

- Linear workspace/team/project IDs are not in place yet; the proxy
  cannot be configured until they exist.
- The metadata block needs a written schema so the proxy can validate it
  on every submission and reject anything outside the allowed set.
- Rate-limiting policy (per-IP, per-instance, exponential backoff) is
  not specified yet.

These belong in follow-up issues filed in this repo once the proxy
implementation starts.
