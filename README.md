<div align="center">
  <img src="https://raw.githubusercontent.com/hushhq/hush/main/.github/assets/hush-logo.svg" width="96" height="96" alt="Hush" />

# Hush

**End-to-end encrypted messaging, voice, and video.**

[Website](https://gethush.live) · [Report a bug](https://github.com/hushhq/hush/issues/new/choose) · [Discussions](https://github.com/hushhq/hush/discussions)

</div>

---

Hush is a self-hostable communication platform built around the **Messaging Layer Security** protocol (RFC 9420). Every message, voice frame, and video frame is encrypted end-to-end on the client. Servers move bytes; they do not read them.

This repository is the **public entry point** for the Hush project:

- **User-facing bug reports and feature requests** are filed here: <https://github.com/hushhq/hush/issues/new/choose>.
- **Self-hosting and architecture documentation** live here and link out to the component repos for code.
- **Community discussion** happens in [Discussions](https://github.com/hushhq/hush/discussions).
- **Ecosystem-wide stats** (combined GitHub stars across every public component repo) are surfaced in [Ecosystem](#ecosystem) below.

The component repositories listed under [Repositories](#repositories) are
implementation nodes: they exist for code review and source ownership, not
for end-user triage. If you are unsure where a problem belongs, open the
issue here and a maintainer will route it.

## Why Hush

- **Real E2EE for groups.** MLS group keys, forward secrecy, and post-compromise security, not the "encrypted in transit, plaintext on the server" pattern most chat apps ship.
- **Self-hostable as the trust path.** A single `docker compose up` brings the stack up locally. The hosted instance at [gethush.live](https://gethush.live) runs the same stack. Self-hosting is the way to verify the product end-to-end, not a secondary mode.
- **Voice + video too.** LiveKit-based SFU with E2EE keys derived from the same MLS group state.
- **Federation on the roadmap.** Server-to-server federation is in design; today every account lives on a single instance.
- **Auditable.** Every component is open source under AGPL-3.0.

## Reporting bugs and requesting features

All user-visible bug reports and feature requests belong in this repository:

- **Bug:** <https://github.com/hushhq/hush/issues/new?template=bug_report.yml>
- **Feature request:** <https://github.com/hushhq/hush/issues/new?template=feature_request.yml>

Component repos (`hush-web`, `hush-server`, `hush-crypto`, `hush-desktop`,
`hush-mobile`, `hush-directory`) are for implementation work and pull
requests. Issues opened there should be code-level: regressions reproducible
against a specific commit, internal refactors, build/CI breakage. User-level
problems get redirected to this repo.

Public GitHub issues are **not** for security disclosure. See
[`docs/TRIAGE.md`](./docs/TRIAGE.md) for the disclosure path and for how the
in-app anonymous bug reporter will hand off to a private tracker.

## Architecture

The cross-repository product contract lives in
[`docs/CORE-INVARIANTS.md`](./docs/CORE-INVARIANTS.md). Before changing auth,
vault, device linking, MLS, messaging, voice, identity labels, desktop runtime,
deploy, or release flows, agents and maintainers must identify the impacted
invariants and run the targeted checks listed there.

The implementation boundaries for state ownership, TanStack Query adoption,
runtime schemas, cross-device tests, and telemetry live in
[`docs/ARCHITECTURE-BOUNDARIES.md`](./docs/ARCHITECTURE-BOUNDARIES.md).

```
                     ┌──────────────────────┐
                     │     hush-web (PWA)   │  React + Vite + WASM
                     │   hush-desktop (Mac, │  Electron shell wrapping
                     │   Linux, Windows)    │  the same web bundle
                     │   hush-mobile (RN)   │  React Native (planned)
                     └──────────┬───────────┘
                                │
                       MLS ciphertext over WSS
                                │
                     ┌──────────▼───────────┐
                     │     hush-server      │  Go · Postgres · Redis
                     │   (relay + storage)  │  + LiveKit SFU adapter
                     └──────────┬───────────┘
                                │
                     ┌──────────▼───────────┐
                     │     hush-crypto      │  Rust · OpenMLS · WASM
                     │  (MLS group state)   │  shared by every client
                     └──────────────────────┘

                     ┌──────────────────────┐
                     │    hush-directory    │  Federated guild discovery
                     │      (planned)       │  opt-in, decentralized
                     └──────────────────────┘
```

## Self-hosting (the trust path)

> Requires Docker Engine 25+ and Docker Compose v2.

```bash
git clone https://github.com/hushhq/hush.git
cd hush
./scripts/bootstrap.sh
```

The bootstrap script clones every public component repository as a
sibling of this one and then runs `docker compose up` against
`hush-server/docker-compose.yml`. Re-running it leaves existing clones
untouched and just brings the stack up again.

When the stack is ready, open `http://localhost:8090` and follow the
sign-up flow. The first device registered owns the account; further
devices are added through **Settings > Devices > Link a new device**.

Self-hosting is the recommended way to verify the product end-to-end on
hardware you control, evaluate the codebase against your own threat model,
and run Hush inside a closed network.

## Repositories

Component repositories: code, tests, and PR review live here. User-facing
triage does not.

| Repo | What it is | Status |
|-|-|-|
| [`hush-web`](https://github.com/hushhq/hush-web) | Browser client. React + Vite. Loads the WASM crypto core. | Active |
| [`hush-server`](https://github.com/hushhq/hush-server) | Backend relay + storage. Go, Postgres, Redis, LiveKit. | Active |
| [`hush-crypto`](https://github.com/hushhq/hush-crypto) | MLS implementation. Rust + OpenMLS, compiled to WASM. | Active |
| [`hush-desktop`](https://github.com/hushhq/hush-desktop) | Native desktop app. Electron shell over the web bundle. | Active |
| [`hush-mobile`](https://github.com/hushhq/hush-mobile) | iOS + Android client. React Native. | Planned |
| [`hush-directory`](https://github.com/hushhq/hush-directory) | Decentralized guild discovery service. | Planned |

## Ecosystem

GitHub stars are scoped per repository, so this repo's `stargazers_count`
only reflects the umbrella. The block below is updated by
[`scripts/update-ecosystem-stats.mjs`](./scripts/update-ecosystem-stats.mjs)
on a schedule and aggregates stars across every public component repo. Do
not hand-edit the block. Automation owns it.

<!-- HUSH_ECOSYSTEM_STATS_START -->

**Hush ecosystem stars: 0**

| Repository | Stars |
|-|-|
| [`hushhq/hush`](https://github.com/hushhq/hush) | 0 |
| [`hushhq/hush-crypto`](https://github.com/hushhq/hush-crypto) | 0 |
| [`hushhq/hush-desktop`](https://github.com/hushhq/hush-desktop) | 0 |
| [`hushhq/hush-directory`](https://github.com/hushhq/hush-directory) | 0 |
| [`hushhq/hush-mobile`](https://github.com/hushhq/hush-mobile) | 0 |
| [`hushhq/hush-server`](https://github.com/hushhq/hush-server) | 0 |
| [`hushhq/hush-web`](https://github.com/hushhq/hush-web) | 0 |

_Run `node scripts/update-ecosystem-stats.mjs` to refresh._
<!-- HUSH_ECOSYSTEM_STATS_END -->

## Security model

The short version: the client encrypts. The server does not have the keys.

- Every channel is its own MLS group. Adding, removing, or rotating a member is an MLS commit; downstream membership and forward-secrecy guarantees follow from the protocol.
- Voice and video keys are derived from the channel's MLS exporter secret. The LiveKit SFU sees opaque SRTP payloads only.
- Devices are added via a per-account device-linking ceremony that hands the new device a sealed bundle (history snapshot + transcript blob + key material). The transfer goes through a chunked, encrypted relay; no plaintext touches the server.
- A transparency log records every device-key change so a returning user can verify their own account has not been tampered with.

For a deeper read, the design notes live in each component's README.

## Contributing

The project is early. For cross-cutting proposals (protocol, federation,
architecture, public docs), open an issue here. For implementation-level
changes (a regression in `hush-web`, a bug in `hush-server`, a fix to the
MLS code in `hush-crypto`), open a PR against the component repo.

## License

[AGPL-3.0](./LICENSE). The same license applies to every component repository.
