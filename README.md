[English](README.md) · [العربية](i18n/README.ar.md) · [Español](i18n/README.es.md) · [Français](i18n/README.fr.md) · [日本語](i18n/README.ja.md) · [한국어](i18n/README.ko.md) · [Tiếng Việt](i18n/README.vi.md) · [中文 (简体)](i18n/README.zh-Hans.md) · [中文（繁體）](i18n/README.zh-Hant.md) · [Deutsch](i18n/README.de.md) · [Русский](i18n/README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*A calm, local production room for turning character stories into generated video and publish-ready media.*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art)
[![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/)
[![React](https://img.shields.io/badge/UI-React-149ECA?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio combines a Markdown story room, natural-language critique, stable prompt assembly, Xiaoyunque browser production, persistent job monitoring, and LazyEdit publishing in one focused web application and CLI. It is designed to run locally, preserve human control over paid actions, and connect to a compatible media project without embedding private paths or credentials.

| Donate | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Preview

![Lala Studio story workspace](docs/images/lala-studio-overview.png)

## What It Does

- Writes and edits Markdown stories with deterministic checks for dialogue, causality, character identity, natural wording, duration, and payoff.
- Routes Codex `gpt-5.6-sol` by task: low effort for chat, high for drafting, xhigh for critique, and ultra for final writing and production.
- Keeps a visible co-writer conversation where a video request becomes an inspectable production contract instead of an immediate paid action.
- Builds path-free Xiaoyunque prompts with exact attachment numbering and fresh English/Japanese/furigana/Chinese word cards.
- Prepares the browser composer without spending credits, and requires explicit confirmation before one paid generation submit.
- Packages generated media through LazyEdit with story context, portrait blur fill, multilingual subtitles, a top-right logo, and platform queues.
- Keeps cancellable job state in `.lalastudio/` while keeping secrets and browser profiles outside Git.

## Quick Start

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

Set `LALA_STUDIO_PROJECT_ROOT` in `.env` to a compatible media project. Open `http://127.0.0.1:4311`. The production server runs at `http://127.0.0.1:4312` after `npm run build && npm start`.

## Use As A Submodule

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

When installed directly under a project that contains `references/` and `scripts/`, Lala Studio discovers its parent automatically.

## CLI

```bash
node bin/lala-studio.js status
node bin/lala-studio.js story list
node bin/lala-studio.js ai final "Polish and validate this story" --story-id STORY_ID
node bin/lala-studio.js prompt-build STORY_ID
node bin/lala-studio.js video prepare STORY_ID
node bin/lala-studio.js video generate STORY_ID --confirm-paid
```

`prepare` never submits. `generate` is rejected without `--confirm-paid`. Publishing without `--confirm` creates a local LazyEdit preview.

## Visible noVNC Control

Run Lala Studio in its own observable Chrome profile without sharing the Xiaoyunque, JLCEDA, or AgenticApp browser:

```bash
scripts/launch_studio_novnc.sh start --project-root "$LALA_STUDIO_PROJECT_ROOT"
node tools/lala-studio-browser.mjs status
node tools/lala-studio-browser.mjs chat --action final --message "Polish the current story"
```

The controller manipulates the visible webapp through Playwright/CDP and saves evidence under `.runtime/browser-evidence/`. See [Isolated noVNC Browser Control](docs/novnc-browser-control.md) for the full chat-to-video workflow and paid-action rules.

## Validate

```bash
npm test
npm run build
npm run test:e2e
```

The suite covers model routing, prompt privacy and numbering, story checks, API safety contracts, and desktop/mobile Playwright views.

## Citation

If you use Lala Studio in research or production tooling, cite this repository. GitHub reads [CITATION.cff](CITATION.cff) and shows a **Cite this repository** panel.

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## Status

The core editor, CLI, model router, browser-production contract, job system, and publishing adapter are implemented. External generation and publishing services remain optional local integrations and may require login.
