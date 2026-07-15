[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*Un estudio local y sereno para convertir historias de personajes en vídeo y contenido listo para publicar.*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art) [![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/) [![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio reúne edición Markdown, crítica de lenguaje natural, construcción estable de prompts, producción mediante el navegador Xiaoyunque, supervisión de trabajos y publicación con LazyEdit. Funciona localmente, exige aprobación humana para acciones de pago y no incrusta rutas privadas ni credenciales.

| Donar | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Vista previa

![Espacio de escritura de Lala Studio](../docs/images/lala-studio-overview.png)

## Funciones

- Editor de historias con controles de diálogo, causalidad, identidad, lenguaje natural, duración y desenlace visual.
- Enrutamiento de `gpt-5.6-sol`: `low` para chat, `high` para borradores, `xhigh` para crítica y `ultra` para finales y producción.
- Prompts de Xiaoyunque sin rutas locales, referencias numeradas y tarjetas de palabras multilingües.
- Preparación gratuita del compositor y confirmación explícita antes de un único envío de pago.
- Flujo LazyEdit con contexto, relleno vertical, subtítulos multilingües, logotipo y colas de plataformas.

## Inicio rápido

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

Configura `LALA_STUDIO_PROJECT_ROOT` en `.env` y abre `http://127.0.0.1:4311`.

## Como submódulo

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

Si el proyecto padre contiene `references/` y `scripts/`, Lala Studio lo detecta automáticamente.

## Validación

```bash
npm test
npm run build
npm run test:e2e
```

## Cita

Si utilizas Lala Studio en investigación o producción, cita este repositorio. GitHub utiliza [CITATION.cff](../CITATION.cff) para mostrar el panel de cita.

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## Estado

El editor, la CLI, el enrutador de modelos, los trabajos persistentes y los adaptadores de producción y publicación están implementados. Los servicios externos son integraciones locales opcionales.
