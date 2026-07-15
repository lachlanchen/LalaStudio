[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*キャラクター物語を映像と公開可能なメディアへ育てる、落ち着いたローカル制作室。*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art) [![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/) [![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio は、Markdown の物語編集、自然な文章批評、安定したプロンプト作成、Xiaoyunque のブラウザー制作、ジョブ監視、LazyEdit 公開を一つのアプリと CLI にまとめます。ローカルで動作し、有料操作は必ず人が確認し、個人パスや認証情報を保存しません。

| 寄付 | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## プレビュー

![Lala Studio の物語編集画面](../docs/images/lala-studio-overview.png)

## 主な機能

- 会話、因果関係、人物の一貫性、自然な表現、尺、視覚的な結末を確認する物語エディター。
- `gpt-5.6-sol` を用途別に使用：会話は `low`、下書きは `high`、批評は `xhigh`、最終稿と制作は `ultra`。
- ローカルパスを含まない Xiaoyunque プロンプト、正確な素材番号、多言語単語カード。
- 無料の事前準備と、有料生成を一度だけ送信する前の明示確認。
- 文脈、縦長ぼかし背景、多言語字幕、ロゴ、公開キューを扱う LazyEdit 連携。

## クイックスタート

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

`.env` で `LALA_STUDIO_PROJECT_ROOT` を設定し、`http://127.0.0.1:4311` を開きます。

## サブモジュールとして使う

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

親プロジェクトに `references/` と `scripts/` があれば自動検出します。

## 検証

```bash
npm test
npm run build
npm run test:e2e
```

## 引用

研究や制作ツールで Lala Studio を利用する場合は、このリポジトリを引用してください。GitHub は [CITATION.cff](../CITATION.cff) を読み取り、引用パネルを表示します。

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## 状況

エディター、CLI、モデルルーター、永続ジョブ、ブラウザー制作契約、公開アダプターは実装済みです。外部サービス連携は任意で、ログインが必要な場合があります。
