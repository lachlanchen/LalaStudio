[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*Ein ruhiger, lokaler Produktionsraum, der Figurengeschichten in veröffentlichungsfertige Videos verwandelt.*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art) [![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/) [![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio verbindet Markdown-Storybearbeitung, natürlichsprachliche Kritik, stabile Prompt-Erstellung, Xiaoyunque-Browserproduktion, Jobüberwachung und LazyEdit-Veröffentlichung in einer Webanwendung und CLI. Es läuft lokal, verlangt eine Bestätigung vor bezahlten Aktionen und speichert weder private Pfade noch Zugangsdaten.

| Spenden | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Vorschau

![Lala Studio Story-Arbeitsbereich](../docs/images/lala-studio-overview.png)

## Funktionen

- Story-Editor mit Prüfungen für Dialog, Kausalität, Figurenidentität, natürliche Sprache, Dauer und sichtbare Auflösung.
- Aufgabenbezogenes Routing von `gpt-5.6-sol`: `low` für Chat, `high` für Entwürfe, `xhigh` für Kritik und `ultra` für Endfassung und Produktion.
- Xiaoyunque-Prompts ohne lokale Pfade, mit exakter Anhangsnummerierung und mehrsprachigen Wortkarten.
- Kostenfreie Vorbereitung und ausdrückliche Bestätigung vor genau einer bezahlten Übermittlung.
- LazyEdit-Ablauf mit Kontext, vertikaler Unschärfefüllung, mehrsprachigen Untertiteln, Logo und Plattformwarteschlangen.

## Schnellstart

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

Setze `LALA_STUDIO_PROJECT_ROOT` in `.env` und öffne `http://127.0.0.1:4311`.

## Als Submodul

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

Ein übergeordnetes Projekt mit `references/` und `scripts/` wird automatisch erkannt.

## Validierung

```bash
npm test
npm run build
npm run test:e2e
```

## Zitation

Wenn du Lala Studio in Forschung oder Produktionswerkzeugen verwendest, zitiere dieses Repository. GitHub liest [CITATION.cff](../CITATION.cff) und zeigt eine Zitationsansicht an.

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## Status

Editor, CLI, Modellrouter, persistente Jobs sowie Produktions- und Veröffentlichungsadapter sind implementiert. Externe Dienste bleiben optionale lokale Integrationen.
