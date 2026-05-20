# Repository operations checklist

Some of the triage model in [`TRIAGE.md`](./TRIAGE.md) and the README
positioning cannot be expressed as files. These are GitHub settings that
a repo admin has to flip by hand. This document is the canonical list.

Mark items off as they are completed. Leaving them undone does not break
the code in this repo, but it weakens the user-facing routing the README
and issue forms promise.

## On `hushhq/hush`

- [ ] **Enable Discussions.** The README and `.github/ISSUE_TEMPLATE/config.yml`
      already link to `https://github.com/hushhq/hush/discussions`; the
      links 404 until Discussions is turned on in repo Settings >
      General > Features.
- [ ] **Repository description and homepage.** Set the description to a
      one-liner that names this repo as the public entry point and set
      the homepage to `https://gethush.live`.
- [ ] **Default branch protection.** Require status checks on `main` so
      the ecosystem-stats workflow cannot push a malformed README.
- [ ] **Private vulnerability reporting.** Enable GitHub private
      vulnerability reporting so `SECURITY.md` and the issue chooser link
      to an active private disclosure path.
- [ ] **Triage labels.** Create and maintain the labels referenced by
      [`TRIAGE.md`](./TRIAGE.md): `triage`, `component:web`,
      `component:server`, `component:crypto`, `component:desktop`,
      `component:mobile`, `component:directory`,
      `component:self-hosting`, and `component:cross-cutting`.

## On each component repo (`hush-web`, `hush-server`, `hush-crypto`, `hush-desktop`, `hush-mobile`, `hush-directory`)

Decide explicitly, per repo, whether GitHub Issues stays enabled.

- **Option A: Disable Issues.** Users land on `hushhq/hush` via repo
  description / homepage. Lowest maintenance, simplest story.
- **Option B: Keep Issues enabled for code-level work.** Then commit a
  per-repo `.github/ISSUE_TEMPLATE/config.yml` that:
  - sets `blank_issues_enabled: false`,
  - adds a `contact_links` entry pointing reporters at
    `https://github.com/hushhq/hush/issues/new/choose`,
  - and a contact link to Discussions.

Either way:

- [ ] Update the repo description and homepage to mention
      `https://github.com/hushhq/hush` and `https://gethush.live`.
- [ ] Decide and apply Option A or Option B above. Track which option
      was chosen for each component in a follow-up issue here so the
      decision is searchable.

## Tokens and integrations

- [ ] **`GITHUB_TOKEN` scope.** The ecosystem-stats workflow only needs
      `contents: write` on this repo and public read on the listed
      component repos. The default token from `actions/checkout` is
      sufficient; no PAT is required.
- [ ] **Linear integration.** Defer until the workspace/team/project IDs
      for the planned private triage tracker exist. When ready:
      - configure the Linear GitHub integration on `hushhq/hush`,
      - wire the in-app bug-reporting proxy described in
        [`BUG-REPORTING.md`](./BUG-REPORTING.md),
      - update this checklist with the concrete steps used.

## After every change to this checklist

Re-read the README and `TRIAGE.md` to confirm the public-facing copy
still matches the actual GitHub settings.
