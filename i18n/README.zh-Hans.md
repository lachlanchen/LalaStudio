[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*一个安静、本地优先的创作室，把角色故事变成视频和可发布的媒体。*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art) [![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/) [![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio 把 Markdown 故事编辑、自然语言批评、稳定的提示词组装、小云雀浏览器制作、持久任务监控和 LazyEdit 发布整合到一个网页应用与 CLI 中。它在本地运行，付费操作必须由用户明确确认，也不会在仓库中写入私人路径或凭据。

| 捐赠 | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 界面预览

![Lala Studio 故事工作区](../docs/images/lala-studio-overview.png)

## 主要功能

- 故事编辑器会检查对白、因果、人物一致性、自然表达、时长和可见的结尾。
- 按任务路由 `gpt-5.6-sol`：聊天使用 `low`，草稿使用 `high`，批评使用 `xhigh`，定稿与制作使用 `ultra`。
- 生成不含本地路径的小云雀提示词，保持准确的附件编号和英日注音中文词卡。
- 可以先免费准备创作区；付费生成必须明确确认，并且只提交一次。
- 通过 LazyEdit 使用故事上下文、竖屏模糊填充、多语言字幕、右上角标志和平台队列完成发布。

## 快速开始

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

在 `.env` 中设置 `LALA_STUDIO_PROJECT_ROOT`，然后打开 `http://127.0.0.1:4311`。

## 作为子模块使用

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

如果父项目包含 `references/` 和 `scripts/`，Lala Studio 会自动识别它。

## 验证

```bash
npm test
npm run build
npm run test:e2e
```

## 引用

如果你在研究或制作工具中使用 Lala Studio，请引用本仓库。GitHub 会读取 [CITATION.cff](../CITATION.cff) 并显示引用面板。

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## 状态

编辑器、CLI、模型路由、持久任务、浏览器制作契约和发布适配器均已完成。外部生成与发布服务属于可选的本地集成，可能需要登录。
