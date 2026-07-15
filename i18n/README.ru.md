[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*Спокойная локальная студия, превращающая истории персонажей в готовые к публикации видео.*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art) [![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/) [![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio объединяет Markdown-редактор историй, проверку естественного языка, стабильную сборку промптов, браузерное производство Xiaoyunque, мониторинг заданий и публикацию через LazyEdit. Приложение работает локально, требует подтверждения платных действий и не сохраняет личные пути или учётные данные.

| Поддержать | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Предпросмотр

![Рабочая область историй Lala Studio](../docs/images/lala-studio-overview.png)

## Возможности

- Редактор с проверкой диалогов, причинности, постоянства персонажей, естественности, длительности и визуальной развязки.
- Маршрутизация `gpt-5.6-sol`: `low` для чата, `high` для черновиков, `xhigh` для критики и `ultra` для финала и производства.
- Промпты Xiaoyunque без локальных путей, с точной нумерацией вложений и многоязычными карточками слов.
- Бесплатная подготовка формы и явное подтверждение перед одной платной отправкой.
- Процесс LazyEdit с контекстом, вертикальным размытым фоном, многоязычными субтитрами, логотипом и очередями платформ.

## Быстрый старт

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

Укажите `LALA_STUDIO_PROJECT_ROOT` в `.env` и откройте `http://127.0.0.1:4311`.

## Подключение как submodule

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

Родительский проект с `references/` и `scripts/` определяется автоматически.

## Проверка

```bash
npm test
npm run build
npm run test:e2e
```

## Цитирование

Если вы используете Lala Studio в исследованиях или производственных инструментах, процитируйте репозиторий. GitHub читает [CITATION.cff](../CITATION.cff) и показывает панель цитирования.

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## Статус

Редактор, CLI, маршрутизатор моделей, постоянные задания и адаптеры производства и публикации реализованы. Внешние сервисы остаются необязательными локальными интеграциями.
