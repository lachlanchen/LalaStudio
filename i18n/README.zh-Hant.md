[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*一個安靜、本機優先的創作室，把角色故事變成影片與可發佈的媒體。*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art) [![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/) [![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio 將 Markdown 故事編輯、自然語言批評、穩定的提示詞組裝、小雲雀瀏覽器製作、持久工作監控與 LazyEdit 發佈整合在同一個網頁應用與 CLI。它在本機執行，付費動作必須由使用者確認，也不會在倉庫中寫入私人路徑或憑證。

| 捐贈 | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 介面預覽

![Lala Studio 故事工作區](../docs/images/lala-studio-overview.png)

## 主要功能

- 故事編輯器會檢查對白、因果、人物一致性、自然表達、時長與可見的結尾。
- 依工作路由 `gpt-5.6-sol`：聊天使用 `low`、草稿使用 `high`、批評使用 `xhigh`、定稿與製作使用 `ultra`。
- 產生不含本機路徑的小雲雀提示詞，保持正確附件編號與英日注音中文詞卡。
- 可先免費準備創作區；付費生成需要明確確認，而且只提交一次。
- 透過 LazyEdit 使用故事脈絡、直式模糊填充、多語字幕、右上角標誌與平台佇列完成發佈。

## 快速開始

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

在 `.env` 設定 `LALA_STUDIO_PROJECT_ROOT`，再開啟 `http://127.0.0.1:4311`。

## 作為子模組使用

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

父專案若包含 `references/` 與 `scripts/`，Lala Studio 會自動辨識。

## 驗證

```bash
npm test
npm run build
npm run test:e2e
```

## 引用

若你在研究或製作工具中使用 Lala Studio，請引用本倉庫。GitHub 會讀取 [CITATION.cff](../CITATION.cff) 並顯示引用面板。

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## 狀態

編輯器、CLI、模型路由、持久工作、瀏覽器製作契約與發佈介面均已完成。外部生成與發佈服務是可選的本機整合，可能需要登入。
