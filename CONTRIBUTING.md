# Contributing

Thanks for taking the time to contribute! This document explains how changes move from an idea to a release.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). Contributions are accepted under the project's [MIT License](LICENSE).

## Development setup

See [Getting started in the README](README.md#getting-started) for prerequisites, environment variables and how to run the app locally.

## Workflow

1. **Branch from `main`** using a descriptive prefix:

   | Prefix      | Use for                                  |
   | ----------- | ---------------------------------------- |
   | `feat/`     | New user-facing functionality            |
   | `fix/`      | Bug fixes                                |
   | `refactor/` | Code changes that don't alter behavior   |
   | `docs/`     | Documentation only                       |
   | `chore/`    | Tooling, dependencies, configuration     |

2. **Commit using [Conventional Commits](https://www.conventionalcommits.org/)**, e.g.
   `fix(feedback): handle answers without a rating`. Keep each commit focused on one change.

3. **Update `CHANGELOG.md`** under `## [Unreleased]` for anything a user or deployer would notice.

4. **Open a pull request** against `main` and fill in the template. CI must pass before merging.

5. **Merge** once the PR is reviewed. When PRs are stacked (one PR based on another's branch),
   merge them in order with **Create a merge commit** and delete each branch after merging; GitHub
   then retargets the next PR to `main` automatically.

## Database changes

1. Edit the tables in [`utils/schema.js`](utils/schema.js). Prefer additive changes (new nullable columns, new tables) so older rows keep working.
2. Run `npm run db:generate -- --name=short_description` to create a SQL migration in [`drizzle/`](drizzle/), and review the SQL.
3. Run `npm run db:migrate` to apply it to your database, and commit the migration with your change.

`npm run db:push` skips migrations and is only meant for quick local experiments.

## Code guidelines

- Database and Gemini access stays on the server, in the server actions in [`actions/`](actions/).
  Reads for pages go in [`utils/queries.js`](utils/queries.js) and are called from server components.
  `utils/db.js`, `utils/gemini.js` and the other server modules import `server-only`, so the build fails if a client component imports them.
- Candidate text in prompts must go through `sanitizeForPrompt()` in [`utils/prompts.js`](utils/prompts.js), inside its own tag.
- Never put secrets in variables prefixed with `NEXT_PUBLIC_`. Those are bundled into browser JavaScript.
- Every server action must check the signed-in user and only touch rows that user owns.

## Releasing

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (`2.0.0`): breaking changes, such as renamed or removed environment variables, or migrations that drop, rename or rewrite existing data.
- **MINOR** (`1.1.0`): new features that are backwards compatible. A minor release may include additive migrations (new tables or nullable columns); its changelog says to run `npm run db:migrate` before deploying.
- **PATCH** (`1.0.1`): backwards-compatible bug fixes.

To cut a release:

1. Open a PR named `chore(release): vX.Y.Z` that:
   - renames `## [Unreleased]` in `CHANGELOG.md` to `## [X.Y.Z] - YYYY-MM-DD` and adds a fresh empty `## [Unreleased]` above it,
   - updates the comparison links at the bottom of `CHANGELOG.md`,
   - bumps `"version"` in `package.json` (and `package-lock.json` via `npm version X.Y.Z --no-git-tag-version`).
2. Merge it, then tag the merge commit and push the tag:

   ```bash
   git checkout main && git pull
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

3. The [Release workflow](.github/workflows/release.yml) publishes the GitHub Release using that version's changelog section.
