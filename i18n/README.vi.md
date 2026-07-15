[English](../README.md) · [العربية](README.ar.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Tiếng Việt](README.vi.md) · [中文 (简体)](README.zh-Hans.md) · [中文（繁體）](README.zh-Hant.md) · [Deutsch](README.de.md) · [Русский](README.ru.md)

[![LazyingArt banner](https://github.com/lachlanchen/lachlanchen/raw/main/figs/banner.png)](https://lazying.art)

# Lala Studio

*Phòng sản xuất cục bộ, gọn gàng để biến câu chuyện nhân vật thành video sẵn sàng xuất bản.*

[![Website](https://img.shields.io/badge/Website-lazying.art-0F766E?style=for-the-badge)](https://lazying.art) [![Codex](https://img.shields.io/badge/Backend-GPT--5.6--Sol-111827?style=for-the-badge)](https://openai.com/codex/) [![Sponsor](https://img.shields.io/badge/Sponsor-lachlanchen-EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white)](https://github.com/sponsors/lachlanchen)

Lala Studio kết hợp trình soạn thảo Markdown, phản biện ngôn ngữ tự nhiên, lắp ráp prompt ổn định, sản xuất qua trình duyệt Xiaoyunque, theo dõi tác vụ và xuất bản bằng LazyEdit. Ứng dụng chạy cục bộ, yêu cầu xác nhận trước thao tác trả phí và không lưu đường dẫn riêng tư hay thông tin đăng nhập.

| Ủng hộ | PayPal | Stripe |
| --- | --- | --- |
| [![Donate](https://img.shields.io/badge/Donate-LazyingArt-0EA5E9?style=for-the-badge&logo=kofi&logoColor=white)](https://chat.lazying.art/donate) | [![PayPal](https://img.shields.io/badge/PayPal-RongzhouChen-00457C?style=for-the-badge&logo=paypal&logoColor=white)](https://paypal.me/RongzhouChen) | [![Stripe](https://img.shields.io/badge/Stripe-Donate-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://buy.stripe.com/aFadR8gIaflgfQV6T4fw400) |

## Xem trước

![Không gian viết truyện Lala Studio](../docs/images/lala-studio-overview.png)

## Tính năng

- Biên tập câu chuyện với kiểm tra hội thoại, quan hệ nguyên nhân, tính nhất quán nhân vật, ngôn ngữ tự nhiên, thời lượng và kết thúc trực quan.
- Định tuyến `gpt-5.6-sol`: `low` cho trò chuyện, `high` cho bản nháp, `xhigh` cho phản biện và `ultra` cho bản cuối cùng cùng quy trình sản xuất.
- Prompt Xiaoyunque không chứa đường dẫn cục bộ, đánh số tệp chính xác và thẻ từ đa ngôn ngữ.
- Chuẩn bị trình soạn thảo không tốn điểm và yêu cầu xác nhận rõ ràng trước một lần gửi trả phí.
- Quy trình LazyEdit với ngữ cảnh, nền dọc làm mờ, phụ đề đa ngôn ngữ, logo và hàng đợi nền tảng.

## Bắt đầu nhanh

```bash
git clone https://github.com/lachlanchen/LalaStudio.git
cd LalaStudio
npm install
cp .env.example .env
npm run dev
```

Đặt `LALA_STUDIO_PROJECT_ROOT` trong `.env`, sau đó mở `http://127.0.0.1:4311`.

## Dùng làm submodule

```bash
git submodule add https://github.com/lachlanchen/LalaStudio.git studio
git submodule update --init --recursive
cd studio && npm install && npm run dev
```

Lala Studio tự nhận diện dự án cha có `references/` và `scripts/`.

## Kiểm tra

```bash
npm test
npm run build
npm run test:e2e
```

## Trích dẫn

Nếu dùng Lala Studio cho nghiên cứu hoặc công cụ sản xuất, hãy trích dẫn kho mã này. GitHub đọc [CITATION.cff](../CITATION.cff) để hiển thị bảng trích dẫn.

```bibtex
@software{chen_lalastudio_2026,
  author = {Chen, Lachlan},
  title = {Lala Studio: A Local Story-to-Video Production Workspace},
  year = {2026},
  url = {https://github.com/lachlanchen/LalaStudio}
}
```

## Trạng thái

Trình biên tập, CLI, bộ định tuyến mô hình, tác vụ bền vững và bộ điều hợp sản xuất/xuất bản đã hoàn thành. Dịch vụ bên ngoài là tích hợp cục bộ tùy chọn.
