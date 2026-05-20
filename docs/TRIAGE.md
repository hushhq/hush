# Triage model

`hushhq/hush` is the **public issue intake** for the entire Hush project.

This document describes how user-visible problems, feature requests, and
security disclosures move through the project, and how that maps onto the
per-component repositories that hold the code.

## What lives where

| Where | Purpose |
|-|-|
| `hushhq/hush` Issues | Public bug reports and feature requests from users. Cross-cutting design proposals. |
| `hushhq/hush` Discussions | Open-ended questions, design conversations, "is this a bug?" threads. |
| `hushhq/hush-*` Issues | Implementation-level regressions tied to a specific commit. Internal refactors. CI/build breakage. Reviewed by the relevant code owners, not by general user-triage volunteers. |
| Private security tracker | Vulnerability reports, exploits, anything that should not be public until coordinated disclosure. See [Security disclosure](#security-disclosure). |
| Private in-app reporter (planned) | Anonymous bug reports submitted from inside the app. Routed to a private triage system; see [`BUG-REPORTING.md`](./BUG-REPORTING.md). |

## How maintainers route issues

1. New issues land in `hushhq/hush` with the `triage` label.
2. A maintainer reads the issue, classifies it, and adds component labels
   (`component:web`, `component:server`, `component:crypto`,
   `component:desktop`, `component:mobile`, `component:directory`,
   `component:self-hosting`, or `component:cross-cutting`).
3. If the problem is reproducible against a specific commit in a single
   component, the maintainer may open a tracking issue in the matching
   component repo and link both directions. The user-facing thread stays
   in `hushhq/hush` so the reporter does not have to chase repos.
4. If the report is too vague to act on, the maintainer either asks for
   more detail or moves the thread to Discussions and closes the issue
   with a link.

## What public issues are not for

- **Security vulnerabilities.** Do not file exploitable bugs publicly. See
  [Security disclosure](#security-disclosure) below.
- **Other users' identifiers, message contents, or transcripts.** Public
  issues are world-readable. The bug-report form has an explicit
  confirmation checkbox for this reason.
- **Anonymous reports submitted from inside the app.** Those will be
  routed to a private tracker via a server-side proxy (see
  [`BUG-REPORTING.md`](./BUG-REPORTING.md)) and will *not* automatically
  become public GitHub issues.

## Security disclosure

Use GitHub private vulnerability reporting for the umbrella repository:

<https://github.com/hushhq/hush/security/advisories/new>

The same path covers cross-repo vulnerabilities. Maintainers route the
report to the relevant component owners after intake. Until a CVE or
coordinated disclosure window is agreed, do not:

- file the issue in `hushhq/hush` Issues,
- post about it in Discussions,
- discuss reproduction steps in a public PR description.

If you are unsure whether a bug is security-sensitive, treat it as
sensitive and reach out via the disclosure path first. A maintainer will
either ask you to re-file it publicly or keep it private.

## In-app bug reporter (planned)

The future in-app reporter is described in [`BUG-REPORTING.md`](./BUG-REPORTING.md).
Key properties relevant to triage:

- The reporter submits to a server-side proxy, not directly to a public
  tracker.
- The proxy creates a private ticket in the maintainers' triage system
  (Linear, once the workspace/team/project IDs are wired up).
- Reports never automatically become public GitHub issues. If a
  maintainer decides a report is safe and useful as a public issue, they
  open one in `hushhq/hush` by hand with the reporter's consent (or
  without identifying detail if the reporter remained anonymous).

## Settings checklist

Some triage prerequisites are GitHub settings, not files. They live in
[`REPOSITORY-OPERATIONS.md`](./REPOSITORY-OPERATIONS.md).
