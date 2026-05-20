# Security policy

## Reporting a vulnerability

Do not open public issues for exploitable bugs, key material leaks, bypasses,
or disclosure of private user data.

Use GitHub private vulnerability reporting for `hushhq/hush`:

<https://github.com/hushhq/hush/security/advisories/new>

If private vulnerability reporting is temporarily unavailable, do not post
proof-of-concept details publicly. Open a minimal public issue that says you
need a private disclosure channel, without reproduction steps, payloads,
logs, or affected-user details.

## Scope

The umbrella repository receives security reports for the full Hush project:

- `hush-web`
- `hush-server`
- `hush-crypto`
- `hush-desktop`
- `hush-mobile`
- `hush-directory`

Maintainers will route the report to the relevant component owners after
intake.

## Do not include

Never include seed phrases, private keys, tokens, session cookies, decrypted
message contents, attachments, transcripts, or unrelated user identifiers in a
public GitHub issue.
