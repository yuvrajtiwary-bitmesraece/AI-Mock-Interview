# Security Policy

## Supported versions

Only the latest release receives security fixes.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report vulnerabilities privately through GitHub:
**Security tab → Report a vulnerability**
([direct link](https://github.com/yuvrajtiwary-bitmesraece/AI-Mock-Interview/security/advisories/new)).

Please include:

- a description of the issue and its impact,
- steps to reproduce or a proof of concept,
- any suggested fix.

You can expect an acknowledgement within a few days. Once a fix is released, the advisory will be published and you will be credited unless you prefer otherwise.

## Handling secrets

- Never commit `.env*` files or credentials. Use `.env.local` locally and your hosting provider's environment settings in production.
- If a secret is ever committed, **rotate it immediately**. Removing it in a later commit does not remove it from git history.
