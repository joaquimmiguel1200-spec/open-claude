# Release and Production Validation Checklist

Use this checklist for every production release. A checkbox is complete only when evidence from the target environment exists.

## Build and repository

- [ ] GitHub Actions typecheck passes.
- [ ] Production build passes.
- [ ] Dependency audit reviewed; critical/high findings triaged.
- [ ] No secrets, private data, generated bundles, or local environment files in the diff.
- [ ] README, environment examples, migrations, and changelog match the release.

## Authentication

- [ ] Email/password signup, confirmation, login, logout, password recovery, and resend confirmation tested.
- [ ] Google, Microsoft, and GitHub OAuth tested end-to-end using the configured production providers.
- [ ] OAuth callback rejects missing/invalid codes and unsafe redirect targets.
- [ ] MFA enrollment, verification, recovery, and session step-up tested.
- [ ] Session list/revocation checked for cross-user isolation.
- [ ] Rate limits and lockout behavior tested without permanently locking out real users.

## Data protection

- [ ] Every exposed table has RLS enabled and policies reviewed.
- [ ] Two test users cannot read/write each other's data without an explicit membership grant.
- [ ] Storage read/write/delete policies tested with owned and non-owned objects.
- [ ] Export, correction, deletion, retention, and subprocessors' deletion workflows tested.
- [ ] Backup restoration has been exercised; retention and incident procedures documented.
- [ ] Security and performance advisors reviewed; warnings have owners and rationale.

## AI, MCP, Code and Cowork

- [ ] AI key remains server-side; streaming, timeout, retry, error, cancellation, and usage accounting tested.
- [ ] MCP initialization, capability negotiation, tools/list, tools/call, permission denial, timeout, and cancellation tested against an approved server.
- [ ] External side effects require explicit authorization.
- [ ] Code execution uses an isolated sandbox with resource and network controls.
- [ ] Cowork tasks produce verifiable tool outputs and handle failures/cancellation.
- [ ] Untrusted repository files, prompts, tool outputs, and MCP results cannot override authorization policy.

## Deployment smoke tests

- [ ] Production deployment reaches READY and the expected commit is deployed.
- [ ] Public home, login, signup, chat, settings, API health and policy routes respond as expected.
- [ ] Runtime errors and deployment logs reviewed.
- [ ] OAuth redirect allow-list and canonical URL match production.
- [ ] Rollback target and incident owner are known.

## Evidence

Record the commit SHA, deployment URL, date, test account types (never credentials), failed tests, accepted risks, and follow-up owners in the release notes.
