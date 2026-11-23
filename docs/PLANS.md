# Plans

AI Mock Interview is free. This page describes the plans for what comes next. Only Free exists today: nothing is for sale, and there is no checkout or payment anywhere in the app. The landing page shows the other plans as "Coming soon" and "Planned", without prices.

| | Free | Pro | Campus |
| --- | --- | --- | --- |
| Status | Live | Coming soon | Planned |
| For | Anyone preparing for interviews | Candidates who also face coding rounds | Placement cells, colleges and bootcamps |
| Price | ₹0 | Not set | Not set |

## Free (live)

Everything on the site today:

- Technical, behavioral, system design, HR and mixed interview rounds, with 3 to 10 questions each.
- Questions based on your resume or the job posting.
- Answers by voice, transcribed by Gemini, or by typing.
- Scores on four skills for every answer, with strengths, fixes, a stronger version of your answer and a model answer.
- An AI coaching report for each interview, which you can save as a PDF.
- A progress dashboard with score trends, skills and practice streaks.

Every account shares one Gemini API key, so each account has daily limits, counted per UTC day ([`utils/limits.js`](../utils/limits.js)):

| Action | Per day |
| --- | --- |
| New interviews | 10 |
| Answer reviews | 100 |
| Interview reports | 30 |
| Voice transcriptions | 300 |

## Pro (coming soon)

Everything in Free, plus:

- **Coding rounds judged by [Verdict](../verdict/).** You write a solution in the browser, and it is compiled and run against hidden tests in a locked-down sandbox, the way competitive programming judges work. C++ comes first, then Python and Java. The judge is built and tested; see [What launching Pro needs](#what-launching-pro-needs).
- **AI review of your code:** time and memory complexity, the edge cases you missed, and a cleaner approach.
- **Core CS packs:** questions on DBMS, operating systems, computer networks and OOP, the subjects campus interviews ask about most.
- **Longer interviews:** up to 20 questions instead of 10.
- **Higher daily limits.**

## Campus (planned)

For placement cells that prepare a whole batch:

- One invite link for the whole batch.
- A placement-cell dashboard: who practiced, average scores and the weakest skills across the batch.
- Your own question sets and coding problems for each placement drive.
- Batch reports to download.

## What launching Pro needs

1. **A server for Verdict.** The judge runs every submission in its own Docker container, and Vercel, which hosts the site, cannot run Docker. Verdict runs locally and is tested in CI on every change. A free option is an Oracle Cloud Always Free VM.
2. **The rest of Verdict:** its HTTP API, job queue and worker (Stage B of [its spec](../verdict/docs/SPEC.md)), then Python and Java (Stage C) and its security hardening (Stage D).
3. **The coding-round page:** an editor, runs on the sample tests and submissions with per-test verdicts ([section 11 of the spec](../verdict/docs/SPEC.md)).
4. **Payments, which are not integrated.** In India, Razorpay fits best, because Stripe accepts new Indian accounts by invitation only. Real payments need KYC and cost about 2% per payment.
5. **A paid hosting plan.** Vercel's free Hobby plan is for non-commercial use only, so the site has to move to a paid plan before it takes payments.

A plan goes on sale only when its features work.
