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

### Changed

- **Environment variables renamed** (see `.env.example`):
  - `NEXT_PUBLIC_DRIZZLE_DB_URL` → `DATABASE_URL`
  - `NEXT_PUBLIC_GEMINI_API_KEY` → `GEMINI_API_KEY`

  The old names still work but log a deprecation warning. They will be removed in v2.0.0.
- Deleting an interview removes its answers and the interview in one database transaction.
- Creating an interview now shows an error toast when it fails, instead of failing silently.

### Added

- `.env.example` listing every required environment variable.

- Continuous integration: every pull request and push to `main` is built on GitHub Actions.
- Automated GitHub Releases: pushing a `vX.Y.Z` tag publishes a release using the notes in this file.
- Dependabot configuration for monthly grouped dependency and GitHub Actions updates.
- Contribution guide, security policy, code owners, pull request template and issue forms.
- `.editorconfig`, `.gitattributes` (LF line endings) and `.nvmrc` (Node 24) for consistent tooling.

### Removed

- `PROJECT_TREE.txt`, which was out of date and contained a local machine path.

## [0.1.0] - 2026-06-23

### Added

- AI-generated interview questions from job title, description, tech stack and experience (Gemini).
- Speech-to-text answer recording with webcam preview and editable transcripts.
- AI rating and feedback for each answer, with an overall score on the feedback page.
- Dashboard listing past interviews, with the option to delete them.
- Authentication with Clerk.

[Unreleased]: https://github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/releases/tag/v0.1.0
