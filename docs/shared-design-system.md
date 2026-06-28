# SAMPLAS M Shared Design System

## Product Language

SAMPLAS M Admin and the Figma/Buzz plugin should feel like one editorial operating system.

Use:

- Content Format for visual template/layout selection.
- Content Category for AI guideline and reference selection.
- Brand Knowledge for stored fashion brand context.

Avoid mixing Content Category with Brand unless the category is intentionally a brand name.

## Visual Direction

The interface should feel clean, compact, editorial, and operational.

References:

- Apple platform UI restraint
- Kinfolk-like editorial restraint
- Balenciaga-like structural confidence
- Internal publishing tools

Avoid:

- Startup dashboard cards
- Oversized SaaS panels
- Decorative gradients or colorful widgets
- Heavy black border systems

## Core Tokens

- Background: `#f5f5f7`
- Panel: `rgba(255, 255, 255, 0.94)`
- Ink: `#1d1d1f`
- Accent blue: `#0071e3`
- Secondary surface: `#eef5ff`
- Secondary text: `#6e6e73`
- Borders: 1px solid `#d2d2d7`
- Radius: 12-18px for panels, 999px for compact buttons

## Typography

Use the Apple Korean system stack:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Text", "Apple SD Gothic Neo", "Apple Gothic", "Malgun Gothic", Arial, sans-serif
```

Keep UI text compact:

- Page title: 32-36px
- Section title: 14-21px
- Field label: 12-14px
- Body: 13-15px

## Layout

- Prefer dropdowns, structured rows, and tables over large cards.
- Keep controls close to the data they affect.
- Use modal dialogs only for explicit creation or destructive confirmation.
- Preserve dense information visibility.

## Shared Field Names

| Concept | Admin | Plugin |
| --- | --- | --- |
| Template/layout | Content Format | 콘텐츠 양식 |
| AI guideline category | Content Category | 콘텐츠 카테고리 |
| Image crop intent | Image Focus | 사진 초점 |
| Overall direction | Mood | 전체 분위기 |

## Template Layer Language

- `TITLE` and `IMAGE` are required.
- `BODY`, `CAPTION`, `OVERLAY`, and `BACKGROUND` are optional.
- Use `CATEGORY_TEXT` for editable category text.
- Use `CATEGORY`, `CATEGORY_FRAME`, `CATEGORY_BG`, or `CATEGORY_BACKGROUND` only for decorative category shapes when needed.
- The plugin template validator should be used before client delivery.
