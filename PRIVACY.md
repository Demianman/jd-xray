# Public-release privacy contract

The public artifact is produced from a strict allowlist, not by copying and deleting from the
private repository. Only the files in this repository may be published.

## Allowed

- generic product language;
- synthetic companies, roles, scores, and explanations;
- generic descriptions of deterministic routing and evidence-aware decisions;
- browser-local demo interactions;
- a browser extension that reads only the active page after an explicit user click.

## Prohibited

- real identity, contact, education, employment, project, resume, or application data;
- immigration or work-authorization status belonging to a real person;
- source-of-truth profile and experience files;
- tracker rows, evaluation snapshots, generated resumes, or artifacts;
- absolute filesystem paths, credentials, tokens, cookies, environment files, or private URLs;
- Git history from the private project.

## Extension permissions

The prototype is intentionally limited to `activeTab`, `scripting`, `sidePanel`, and `storage`.
It does not request persistent access to every site, browsing history, identity, or downloads. Page
text is analyzed locally in the extension and is not retained by the extension.

## Before every publication

Run `node scripts/verify-public.mjs`, inspect `git diff --check`, and review the exact tracked-file
list. A clean result is required before packaging or deployment.
