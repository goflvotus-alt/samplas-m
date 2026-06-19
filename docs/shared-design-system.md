# SAMPLAS M Shared Design System

## Product Language

SAMPLAS M Admin and the Figma/Buzz plugin should feel like one editorial operating system.

Use:

- Content Format for visual template/layout selection.
- Content Category for AI guideline and reference selection.
- Brand Knowledge for stored fashion brand context.

Avoid mixing Content Category with Brand unless the category is intentionally a brand name.

## Visual Direction

The interface should feel compact, editorial, and operational.

References:

- Kinfolk-like editorial restraint
- Balenciaga-like black/white structure
- Internal publishing tools

Avoid:

- Startup dashboard cards
- Oversized SaaS panels
- Decorative gradients or colorful widgets

## Core Tokens

- Background: `#ffffff`
- Ink: `#000000`
- Accent blue: `#005bff`
- Secondary surface: `#f2f7ff`
- Secondary text: `#777777`
- Borders: 1px solid black
- Radius: 0

## Typography

Use the Apple Korean system stack:

```css
"Apple SD Gothic Neo", "Apple Gothic", "Malgun Gothic", Arial, sans-serif
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
