# Public-release privacy contract

The public artifact is produced from a strict allowlist, not by copying and deleting from the
private repository. Only the files in this repository may be published.

## Allowed

- generic product language;
- synthetic companies, roles, scores, and explanations;
- generic descriptions of deterministic routing and evidence-aware decisions;
- browser-local demo interactions;
- server-side analysis of user-submitted public job-description text and an optional public source URL;
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

## Hosted deep analysis

The website always runs deterministic checks in the browser. When hosted deep analysis is enabled,
the pasted job description and optional public source URL are sent to the Site's same-origin Worker,
which may send them to the configured model and web-search provider. The request must not include a
resume, personal profile, contact details, application answers, or private documents. Model requests
set storage off. Results may be cached by a one-way content hash for up to six hours; the cache key
does not contain the readable JD. API credentials remain server-side environment secrets and are
never included in browser assets.

Deep analysis runs only after the visitor explicitly selects **Run Deep Check**. When enabled, the
Worker uses a signed, HttpOnly anonymous quota cookie and a one-way network identifier to apply
abuse controls; the readable IP address is not placed in the cookie or report. Reusing a cached
result does not consume the browser's daily allowance. Public AI access may additionally require
server-verified bot protection.

## Before every publication

Run `node scripts/verify-public.mjs`, inspect `git diff --check`, and review the exact tracked-file
list. A clean result is required before packaging or deployment.
