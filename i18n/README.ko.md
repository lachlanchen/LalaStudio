[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*캐릭터 이야기를 영상과 게시 가능한 미디어로 만드는 차분한 로컬 제작실.*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art) [![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/) [![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio는 Markdown 스토리 편집, 자연어 비평, 안정적인 프롬프트 조립, Xiaoyunque 브라우저 제작, 작업 모니터링, LazyEdit 게시를 하나의 웹앱과 CLI로 통합합니다. 로컬에서 실행되며 유료 작업 전에 사람의 확인을 요구하고 개인 경로나 자격 증명을 저장하지 않습니다.

| 후원 | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## 미리보기

![Lala Studio 스토리 작업 화면](../docs/images/lala-studio-overview.png)

## 주요 기능

- 대화, 인과관계, 캐릭터 일관성, 자연스러운 문장, 길이, 시각적 결말을 점검하는 편집기.
- 작업별 `gpt-5.6-sol` 라우팅: 채팅 `low`, 초안 `high`, 비평 `xhigh`, 최종본과 제작 `ultra`.
- 로컬 경로가 없는 Xiaoyunque 프롬프트, 정확한 첨부 번호, 다국어 단어 카드.
- 비용 없는 작성기 준비와 한 번의 유료 제출 전 명시적 확인.
- 맥락, 세로 블러 배경, 다국어 자막, 로고, 플랫폼 큐를 처리하는 LazyEdit 연결.

## 빠른 시작

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

`.env`에서 `LALA_STUDIO_PROJECT_ROOT`를 설정하고 `http://127.0.0.1:4311`을 여세요.

## 서브모듈로 사용

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

상위 프로젝트에 `references/`와 `scripts/`가 있으면 자동으로 감지합니다.

## 검증

```bash
npm test
npm run build
npm run test:e2e
```

## 인용

연구나 제작 도구에서 Lala Studio를 사용한다면 이 저장소를 인용해 주세요. GitHub는 [CITATION.cff](../CITATION.cff)를 읽어 인용 패널을 표시합니다.

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## 상태

편집기, CLI, 모델 라우터, 영속 작업, 브라우저 제작 계약, 게시 어댑터가 구현되었습니다. 외부 서비스는 선택적 로컬 통합이며 로그인이 필요할 수 있습니다.
