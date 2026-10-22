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
  `OPENAI_API_KEY` is configured. Public activation also requires `JD_XRAY_SESSION_SECRET`; optional
  `TURNSTILE_SECRET_KEY` verification is enforced when configured. Without the required secrets,
  the product degrades explicitly to local analysis.
- Deep analysis is an explicit click, not an automatic side effect of pasting a JD. Successful
  uncached requests use a signed anonymous daily allowance; cached results do not consume it.
- The in-memory network window is an abuse-friction layer, not a global billing guarantee. A
  provider-side project spend cap and bot protection are still required before broad public access.
- External search absence is never presented as proof that an employer has no filings or that a role
  does not exist.

## Run and verify

```bash
npm run build
npm test
npm run preview
```

The hosted site is a separate public project and cannot read the private Career OS backend.
