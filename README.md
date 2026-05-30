<div align="center">
  <img src="https://raw.githubusercontent.com/hushhq/hush/main/.github/assets/hush-logo.svg" width="96" height="96" alt="Hush" />

# Hush

**End-to-end encrypted messaging, voice, and video.**

[Website](https://gethush.live) · [Report a bug](https://github.com/hushhq/hush/issues/new/choose) · [Discussions](https://github.com/hushhq/hush/discussions)

<img src=".github/assets/hush-demo.gif" width="900" alt="Hush desktop app preview" />

</div>

---

Hush is a self-hostable communication platform built around the **Messaging Layer Security** protocol (RFC 9420). Every message, voice frame, and video frame is encrypted end-to-end on the client. Servers move bytes; they do not read them.

This repository is the **public entry point** for the Hush project:

- **User-facing bug reports and feature requests** are filed here: <https://github.com/hushhq/hush/issues/new/choose>.
- **Self-hosting entry points and architecture documentation** live here and link out to the component repos for implementation details.
- **Community discussion** happens in [Discussions](https://github.com/hushhq/hush/discussions).

The component repositories listed under [Repositories](#repositories) are
implementation nodes: they exist for code review and source ownership, not
for end-user triage. If you are unsure where a problem belongs, open the
issue here and a maintainer will route it.

## Why Hush

- **Real E2EE for groups.** MLS group keys, forward secrecy, and post-compromise security, not the "encrypted in transit, plaintext on the server" pattern most chat apps ship.
- **Self-hostable as the trust path.** The backend and media stack can run on infrastructure you control. Self-hosting is the way to verify the product end-to-end, not a secondary mode.
- **Voice + video too.** LiveKit-based SFU with E2EE keys derived from the same MLS group state.
- **Federation on the roadmap.** Server-to-server federation is in design; today every account lives on a single instance.
- **Auditable.** Every component is open source under AGPL-3.0.

## Self-host Hush

The production self-host path lives in
[`hush-server`](https://github.com/hushhq/hush-server). It provisions the
backend and media plane: API, PostgreSQL, Redis, LiveKit, Caddy, and storage
where applicable.

It does **not** clone every Hush repository and it does **not** build the web
client. By default, self-hosted instances are used from the official web
client at <https://app.gethush.live>.

> Requires a Linux server, Docker Engine, Docker Compose, DNS for the app and
> RTC hostnames, and ports `80`, `443`, `7880-7881/tcp`, and
> `50020-50100/udp` open.

```bash
git clone https://github.com/hushhq/hush-server.git
cd hush-server
./scripts/setup.sh \
  --domain chat.example.com \
  --rtc-domain rtc.example.com \
  --email you@example.com
```

What those values mean:

| Argument | Meaning |
|-|-|
| `--domain` | Public hostname for the Hush API and admin dashboard. |
| `--rtc-domain` | Public LiveKit signaling hostname for voice and video. |
| `--email` | Email used by Let's Encrypt for TLS certificate registration and renewal. |

After setup:

1. Open the desktop client, or the webapp at <https://app.gethush.live>.
2. Add your instance URL, for example `https://chat.example.com`.
3. Register or sign in against that instance.
4. Open `https://chat.example.com/admin/` to bootstrap the admin dashboard with the secret printed by setup.

For IP-only development/LAN testing:

```bash
git clone https://github.com/hushhq/hush-server.git
cd hush-server
./scripts/setup.sh --ip 203.0.113.42
```

For the complete operational guide, read
[`hush-server/README.md`](https://github.com/hushhq/hush-server#quick-start-self-hosting)
and
[`hush-server/docs/RUNBOOK.md`](https://github.com/hushhq/hush-server/blob/main/docs/RUNBOOK.md).

If you also self-host `hush-web`, update `CORS_ORIGIN` in the generated
`hush-server` `.env` to your own web-client origin.

## Local development workspace

This repository also contains a convenience script for contributors who need
all public component repositories checked out side by side.

```bash
git clone https://github.com/hushhq/hush.git
cd hush
./scripts/bootstrap.sh
```

`scripts/bootstrap.sh` clones `hush-web`, `hush-server`, `hush-crypto`,
`hush-desktop`, `hush-mobile`, and `hush-directory` as sibling directories,
then starts the development compose stack from `hush-server/docker-compose.yml`.
It is for local development, not the production self-hosting path.

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

Crypto runs on the client, not the server. Every client loads `hush-crypto`
(OpenMLS compiled to WASM) and encrypts locally; `hush-server` is a blind
relay that stores and forwards ciphertext without the keys.

```mermaid
flowchart TB
    subgraph clients["Clients (encrypt and decrypt locally)"]
        direction LR
        web["hush-web<br/>PWA · React + Vite"]
        desktop["hush-desktop<br/>Electron shell over the web bundle"]
        mobile["hush-mobile<br/>React Native · planned"]
        crypto["hush-crypto<br/>Rust · OpenMLS, compiled to WASM<br/>MLS group state, shared by every client"]
        web -. loads .-> crypto
        desktop -. loads .-> crypto
        mobile -. loads .-> crypto
    end

    subgraph server["hush-server (blind relay · Go)"]
        api["API + WebSocket gateway<br/>relay · auth · device linking · admin"]
        pg[("Postgres<br/>messages, members, MLS ciphertext")]
        redis[("Redis<br/>sessions, presence, rate limits")]
        obj[("Object storage<br/>MinIO or external S3<br/>attachments, device-link archives")]
        tlog["Transparency log<br/>Merkle record of device-key changes"]
        api --> pg
        api --> redis
        api --> obj
        api --> tlog
    end

    livekit["LiveKit SFU<br/>opaque SRTP; media keys from the MLS exporter secret"]
    directory["hush-directory<br/>federated guild discovery · planned"]

    clients == "MLS ciphertext over WSS / HTTPS" ==> api
    clients -- "encrypted voice and video (SRTP)" --> livekit
    api -- "room tokens, webhooks" --> livekit
    api -. "opt-in federation" .-> directory

    classDef planned stroke-dasharray: 4 4;
    class mobile,directory planned;
```

## Repositories

Component repositories are organized by ownership boundary. Code, tests, and
pull request review live in the specific component repo. User-facing triage
starts here unless the problem is already known to be implementation-level.

| Area | Repo | What it owns | Status |
|-|-|-|-|
| Product entry point | [`hush`](https://github.com/hushhq/hush) | Public triage, architecture docs, self-hosting entry points, and cross-repo project coordination. | Active |
| Web client | [`hush-web`](https://github.com/hushhq/hush-web) | Browser client. React + Vite. Loads the WASM crypto core. | Active |
| Desktop client | [`hush-desktop`](https://github.com/hushhq/hush-desktop) | Native desktop app. Electron shell over the web bundle. | Active |
| Server | [`hush-server`](https://github.com/hushhq/hush-server) | Backend relay, storage, instance administration, Postgres, Redis, and LiveKit integration. | Active |
| Cryptography | [`hush-crypto`](https://github.com/hushhq/hush-crypto) | MLS group state. Rust + OpenMLS, compiled to WASM for clients. | Active |
| Mobile client | [`hush-mobile`](https://github.com/hushhq/hush-mobile) | iOS and Android client. React Native. | Planned |
| Discovery | [`hush-directory`](https://github.com/hushhq/hush-directory) | Decentralized guild discovery and federation-adjacent directory work. | Planned |

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
