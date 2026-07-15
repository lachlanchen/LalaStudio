[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*Un atelier local et serein pour transformer des histoires de personnages en vidéos prêtes à publier.*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art) [![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/) [![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio réunit un éditeur Markdown, une critique en langage naturel, la construction stable de prompts, la production via le navigateur Xiaoyunque, le suivi des tâches et la publication LazyEdit. Il fonctionne localement, garde les actions payantes sous contrôle humain et n'intègre ni chemins privés ni identifiants.

| Faire un don | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Aperçu

![Espace d'écriture de Lala Studio](../docs/images/lala-studio-overview.png)

## Fonctionnalités

- Édition de récits avec contrôles du dialogue, de la causalité, des personnages, du naturel, de la durée et de la chute visuelle.
- Routage de `gpt-5.6-sol` : `low` pour le chat, `high` pour les brouillons, `xhigh` pour la critique et `ultra` pour la finition et la production.
- Prompts Xiaoyunque sans chemins locaux, références numérotées et cartes lexicales multilingues.
- Préparation sans dépense et confirmation explicite avant un unique envoi payant.
- Chaîne LazyEdit avec contexte, remplissage vertical, sous-titres multilingues, logo et files de publication.

## Démarrage rapide

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

Définissez `LALA_STUDIO_PROJECT_ROOT` dans `.env`, puis ouvrez `http://127.0.0.1:4311`.

## Utilisation en sous-module

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

Un projet parent contenant `references/` et `scripts/` est détecté automatiquement.

## Validation

```bash
npm test
npm run build
npm run test:e2e
```

## Citation

Si vous utilisez Lala Studio en recherche ou en production, citez ce dépôt. GitHub lit [CITATION.cff](../CITATION.cff) pour afficher le panneau de citation.

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## État

L'éditeur, la CLI, le routeur de modèles, les tâches persistantes et les adaptateurs de production et de publication sont opérationnels. Les services externes restent facultatifs.
