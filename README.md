# Career OS — Public Demo

A privacy-safe, standalone demonstration of a job-opportunity decision dashboard.

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

The verification script checks required files, synthetic-data labels, forbidden identity markers,
absolute local paths, secrets, and basic data integrity.

## Architecture

The public demo is deliberately buildless: semantic HTML, responsive CSS, and dependency-free
JavaScript. Opportunity state is stored only in the visitor's browser with `localStorage`.
The hosted site is a separate project and cannot read the private Career OS backend.
