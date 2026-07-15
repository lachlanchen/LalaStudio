# Repository Guidelines

## Project Structure

`src/` contains the React interface and reusable view components. `server/` contains the Express API, Codex model router, story repository, jobs, prompt builder, and production adapters. `cli/` and `bin/` expose the command-line client. `tests/` contains Vitest contracts and Playwright browser checks. Public screenshots live in `docs/images/`.

Lala Studio connects to a separate media project through `LALA_STUDIO_PROJECT_ROOT` or by installation as that project's `studio/` submodule. Do not hard-code personal paths.

## Development Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run test:e2e
```

`npm run dev` starts the API and Vite UI. `npm test` runs unit/API tests. `npm run test:e2e` verifies desktop and mobile UI behavior.

## Style And Testing

Use strict TypeScript, two-space indentation, focused React components, and argument-array process spawning. Prefer structured parsers and explicit API schemas over stringly typed behavior. Keep UI controls operational and compact. Add tests for model-routing, paid-action, filesystem, or workflow contract changes.

## Commits And Security

Use short imperative commit messages. Commit and push completed scoped work, but never include unrelated changes, `.env`, credentials, browser profiles, `.lalastudio/`, generated videos, or local service state. Keep public docs portable and use placeholders such as `/path/to/project`.
