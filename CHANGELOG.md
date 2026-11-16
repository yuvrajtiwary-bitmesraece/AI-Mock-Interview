# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **All database and Gemini calls now run on the server.** Before, the database connection string and Gemini API key were bundled into browser JavaScript, so any visitor could read or delete every user's data and use the API key.
- Every read and write checks the signed-in Clerk user and only touches interviews that user created. Before, any signed-in user could open, answer or delete another user's interview by its ID.
- The server looks up the question being answered, instead of trusting the question text the browser sends.
- Each Gemini request is now independent. Before, the app shared one chat session, so each prompt carried earlier prompts as history.
- `drizzle.config.js` reads the connection string from the environment instead of a hard-coded value.
- Updated dependencies to patched versions. `npm audit` went from 29 findings (4 critical, 16 high) to 6 (0 critical, 1 high). Notable fixes:
  - `@clerk/nextjs` 6.12 → 6.39: fixes a bypass of middleware-based route protection (critical).
  - `next` 15.3 → 15.5: fixes several Image Optimization advisories (critical).
  - `drizzle-orm` 0.40 → 0.45: fixes SQL injection via improperly escaped identifiers.
  - `moment`, `uuid` and transitive packages: patch releases.

  The 6 that remain are build- or dev-time only and can't be triggered by app users: PostCSS bundled inside Next.js (fix requires Next 16) and esbuild inside the `drizzle-kit` CLI.

### Changed

- **Environment variables renamed** (see `.env.example`):
  - `NEXT_PUBLIC_DRIZZLE_DB_URL` → `DATABASE_URL`
  - `NEXT_PUBLIC_GEMINI_API_KEY` → `GEMINI_API_KEY`

  The old names still work but log a deprecation warning. They will be removed in v2.0.0.
- Deleting an interview removes its answers and the interview in one database transaction.
- Creating an interview now shows an error toast when it fails, instead of failing silently.
- `afterSignOutUrl` is set once on `<ClerkProvider>` instead of on `<UserButton>`, where Clerk deprecated it.
- README rewritten:
  - Added an architecture diagram, an environment-variable reference, a scripts table and a project structure overview.
  - Added a live demo link and acknowledgements.
  - Fixed the setup instructions.
  - Removed claims the project couldn't back up (Lighthouse score, WCAG compliance, multi-language support, Firefox support).
- Screenshots moved from the repository root to `docs/images/`.

### Fixed

- **Long answers were cut off.** Speech-recognition handlers read `isRecording` state captured on first render (always `false`), so when the browser paused recognition it never restarted. Handlers now read refs, recognition restarts automatically, and text captured before each restart is kept.
- **Interviews were generated with "undefined" questions.** The prompt used `NEXT_PUBLIC_INTERVIEW_QUES_COUNT`, which was never defined. The count now comes from `INTERVIEW_QUESTION_COUNT` (1–10, default 5).
- **Broken AI responses could be saved.** Gemini now runs in JSON mode with a response schema, and the questions are validated before the interview is saved.
- **Re-recording an answer created duplicates** on the feedback page and skewed the score. Saving now replaces the previous answer to the same question. Existing duplicates show only the latest answer.
- **Feedback page crashed** when an answer had no rating (`null.toString()`). Unrated answers now show "Not rated" and no longer drag the overall average down as zeros. Per-question bars now match the displayed score (an `8/10` rating showed a full bar).
- Turning the camera off before it finished starting threw an error (`stream` was `null`).
- Text-to-speech queued overlapping playback on repeated clicks and kept reading after switching question or leaving the page.
- Switching questions while recording carried the transcript over to the next question.
- The microphone stayed open after the initial permission check.
- Opening an interview you don't own, or one that doesn't exist, now shows the 404 page instead of an empty screen.
- The **End** button linked to `/dashboard/interview/undefined/feedback` if pressed before the interview loaded.
- After signing in or up, users were sent back to the sign-in page when the fallback redirect env vars were misconfigured. The redirect target is now set in code.
- The sign-up page's "Create an account" link pointed to itself. It now says "Sign in" and links to `/sign-in`.
- Removed links that led to 404 pages: **Questions** and **Upgrade** (header), **About** and **Privacy** (footer). Footer GitHub links now point to this repository.
- The interview pages said "10 questions" regardless of the real count, and claimed no personal data is stored. Both now show accurate information.

### Added

- `.env.example` listing every required environment variable.
- Unit tests for question parsing and rating normalization (`npm test`, Node's built-in test runner), run in CI.
- Header navigation uses real links (keyboard accessible, can open in a new tab). Icon-only buttons and links have accessible labels.
- ESLint 9 with the `next/core-web-vitals` rules (`npm run lint`), run in CI with zero warnings allowed.
- The sign-in and sign-up pages show the app logo. Before, there was an empty placeholder `<svg>`.
- A real page description for search engines and link previews (it was "Generated by create next app").

- Continuous integration: every pull request and push to `main` is built on GitHub Actions.
- Automated GitHub Releases: pushing a `vX.Y.Z` tag publishes a release using the notes in this file.
- Dependabot configuration for monthly grouped dependency and GitHub Actions updates.
- Contribution guide, security policy, code owners, pull request template and issue forms.
- `.editorconfig`, `.gitattributes` (LF line endings) and `.nvmrc` (Node 24) for consistent tooling.

### Removed

- `PROJECT_TREE.txt`, which was out of date and contained a local machine path.
- Unused dependencies: `stripe`, `@stripe/react-stripe-js`, `@stripe/stripe-js`, `@types/stripe`, `react-hook-speech-to-text`, `next-themes` and `shadcn`. `shadcn` is a CLI and can be run with `npx shadcn@latest` when needed.
- Unused `components/ui/sonner.jsx` wrapper. The app uses `sonner` directly.
- About 1,800 lines of commented-out old code at the top of 14 source files (still available in git history).
- Unused `ClientUserButton` component and unused images in `public/`: `authImg.png`, `bg.png`, `webcam.png` and the create-next-app SVGs.
- A protected route for `/forum`, a page that doesn't exist.
- Unused imports.

## [0.1.0] - 2026-06-23

### Added

- AI-generated interview questions from job title, description, tech stack and experience (Gemini).
- Speech-to-text answer recording with webcam preview and editable transcripts.
- AI rating and feedback for each answer, with an overall score on the feedback page.
- Dashboard listing past interviews, with the option to delete them.
- Authentication with Clerk.

[Unreleased]: https://github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/releases/tag/v0.1.0
