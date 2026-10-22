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
- Local H-1B history remains unavailable until legal-entity matching and official disclosure-data
  ingestion are implemented. Deep analysis may report only scoped, sourced external checks.
- The Worker can call the OpenAI Responses API with Structured Outputs and web search when
  `OPENAI_API_KEY` is configured. Without it, the product degrades explicitly to local analysis.
- External search absence is never presented as proof that an employer has no filings or that a role
  does not exist.

## Run and verify

```bash
npm run build
npm test
npm run preview
```

The hosted site is a separate public project and cannot read the private Career OS backend.
