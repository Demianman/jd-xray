# JD X-ray — Public Prototype

A privacy-safe, standalone job-description inspector. Visitors can paste a real posting and receive
an evidence-backed read on the work mix, staffing or contract signals, work-intensity language,
title–scope mismatch, work-authorization wording, compensation, and recruiter questions.

The primary flow requires no account and no personal profile. A Chrome/Edge Manifest V3 side-panel
prototype is published as a downloadable ZIP. It requests only `activeTab`, `scripting`, `sidePanel`,
and `storage`; it reads the active page only after the visitor clicks the extension.

## Important limits

- Findings are explainable risk signals, not employer or workplace verification.
- Work-mix percentages measure emphasis in the posting, not guaranteed time allocation.
- Hourly/annual conversion uses 2,080 hours and does not include bonus, equity, overtime, or unpaid time.
- Employer H-1B history is deliberately marked unavailable until legal-entity matching and official
  disclosure-data ingestion are implemented.
- The local prototype does not use a hosted language model. It makes higher-order deductions from
  combinations of responsibilities and employment terms, with the triggering sentences attached.

## Run and verify

```bash
python3 -m http.server 4173 --directory dist
node scripts/test-engine.mjs
node scripts/verify-public.mjs
```

The hosted site is a separate public project and cannot read the private Career OS backend.
