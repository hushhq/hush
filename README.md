<div align="center">
  <img src="https://raw.githubusercontent.com/hushhq/hush/main/.github/assets/hush-logo.svg" width="96" height="96" alt="Hush" />

# Hush

**End-to-end encrypted messaging, voice, and video.**

[Website](https://gethush.live) · [Web app](https://github.com/hushhq/hush-web) · [Server](https://github.com/hushhq/hush-server) · [Crypto](https://github.com/hushhq/hush-crypto) · [Desktop](https://github.com/hushhq/hush-desktop)

</div>

---

Hush is a self-hostable communication platform built around the **Messaging Layer Security** protocol (RFC 9420). Every message, voice frame, and video frame is encrypted end-to-end on the client. Servers move bytes; they do not read them.

This repository is the **umbrella entry point** for the project: vision, architecture, and a one-command `docker compose` quickstart that wires every public sub-repo together. The actual code lives in the per-component repositories listed below.

## Why Hush

- **Real E2EE for groups.** MLS group keys, forward secrecy, and post-compromise security, not the "encrypted in transit, plaintext on the server" pattern most chat apps ship.
- **Self-hostable.** A single `docker compose up` brings the stack up locally. Production is the same stack, scaled.
- **Voice + video too.** LiveKit-based SFU with E2EE keys derived from the same MLS group state.
- **Federation on the roadmap.** Server-to-server federation is in design; today every account lives on a single instance.
- **Auditable.** Every component is open source under AGPL-3.0.

## Architecture

The cross-repository product contract lives in
[`docs/CORE-INVARIANTS.md`](./docs/CORE-INVARIANTS.md). Before changing auth,
vault, device linking, MLS, messaging, voice, identity labels, desktop runtime,
deploy, or release flows, agents and maintainers must identify the impacted
invariants and run the targeted checks listed there.

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

## Quickstart

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
devices are added through **Settings → Devices → Link a new device**.

For deeper local development (running components from your own
checkouts, attaching debuggers, mobile simulators), see
[`docs/local-development.md`](./docs/local-development.md).

## Repositories

| Repo | What it is | Status |
|-|-|-|
| [`hush-web`](https://github.com/hushhq/hush-web) | Browser client. React + Vite. Loads the WASM crypto core. | Active |
| [`hush-server`](https://github.com/hushhq/hush-server) | Backend relay + storage. Go, Postgres, Redis, LiveKit. | Active |
| [`hush-crypto`](https://github.com/hushhq/hush-crypto) | MLS implementation. Rust + OpenMLS, compiled to WASM. | Active |
| [`hush-desktop`](https://github.com/hushhq/hush-desktop) | Native desktop app. Electron shell over the web bundle. | Active |
| [`hush-mobile`](https://github.com/hushhq/hush-mobile) | iOS + Android client. React Native. | Planned |
| [`hush-directory`](https://github.com/hushhq/hush-directory) | Decentralized guild discovery service. | Planned |

## Security model

The short version: the client encrypts. The server does not have the keys.

- Every channel is its own MLS group. Adding, removing, or rotating a member is an MLS commit; downstream membership and forward-secrecy guarantees follow from the protocol.
- Voice and video keys are derived from the channel's MLS exporter secret. The LiveKit SFU sees opaque SRTP payloads only.
- Devices are added via a per-account device-linking ceremony that hands the new device a sealed bundle (history snapshot + transcript blob + key material). The transfer goes through a chunked, encrypted relay; no plaintext touches the server.
- A transparency log records every device-key change so a returning user can verify their own account has not been tampered with.

For a deeper read, the design notes live in each component's README.

## Contributing

The project is early. Issues, discussion threads, and well-scoped pull requests are welcome on the per-component repos. For cross-cutting proposals (protocol, federation, architecture), open an issue here.

## License

[AGPL-3.0](./LICENSE). The same license applies to every component repository.
