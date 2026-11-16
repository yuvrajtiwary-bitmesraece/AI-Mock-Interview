# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
