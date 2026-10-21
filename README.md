# Career OS — Public Demo

A privacy-safe, standalone job-opportunity decision tool. Visitors can build an anonymous
browser-local profile, paste a real job description, verify extracted requirements, receive an
explainable route, save a queue, and import/export or erase their data.

## Privacy boundary

This repository contains **synthetic demo data only**. It does not contain or connect to:

- names, email addresses, phone numbers, schools, employers, resumes, or experience records;
- application history, work-authorization details, profile evidence, or private tracker data;
- local filesystem paths, credentials, environment files, or the private Career OS repository;
- live mutation endpoints, job-board credentials, or automated application submission.

See [PRIVACY.md](PRIVACY.md) for the publication checklist.

## Run locally

```bash
python3 -m http.server 4173 --directory dist
```

Then open `http://localhost:4173`.

## Verify

```bash
node scripts/verify-public.mjs
```

The verification script checks required files, empty shipped runtime data, forbidden identity markers,
absolute local paths, secrets, and basic data integrity.

## Architecture

The public app is deliberately buildless: semantic HTML, responsive CSS, and dependency-free
JavaScript. Parsing and scoring are deterministic browser modules. Anonymous profile and opportunity
state are stored only in the visitor's browser with `localStorage`.
The hosted site is a separate project and cannot read the private Career OS backend.
