# Design System

Black, white and neutral greys. Color is reserved for status. Calm, compact and readable for people who work in tables all day.

Built on Tailwind CSS 4 + shadcn/ui. Every token below maps to a CSS variable in `client/src/index.css`. Use the tokens, never raw hex values in components.

## Principles

- **Monochrome first.** Black for primary actions, greys for everything else.
- **Color means status.** Green, yellow, blue, grey and red appear only in status badges, alerts and status charts.
- **Compact.** Show more rows, less chrome.
- **Light mode only.** No dark mode in v1.

## Color

Neutral grey scale (Tailwind `neutral`).

| Token                  | Value                   | Use                                 |
| ---------------------- | ----------------------- | ----------------------------------- |
| `--background`         | `#ffffff`               | Page background                     |
| `--surface`            | `#fafafa` (neutral-50)  | Sidebar, table header, subtle fills |
| `--muted`              | `#f5f5f5` (neutral-100) | Hover rows, disabled fills          |
| `--border`             | `#e5e5e5` (neutral-200) | Card, table and input borders       |
| `--input`              | `#d4d4d4` (neutral-300) | Input borders                       |
| `--muted-foreground`   | `#737373` (neutral-500) | Secondary text, placeholders, icons |
| `--foreground`         | `#171717` (neutral-900) | Body text, headings                 |
| `--primary`            | `#0a0a0a` (neutral-950) | Primary buttons, active nav         |
| `--primary-foreground` | `#ffffff`               | Text on primary                     |
| `--ring`               | `#a3a3a3` (neutral-400) | Focus ring                          |

### Status

Each status has a dot, a soft background and a text color.

| Tone   | Dot       | Background | Text      |
| ------ | --------- | ---------- | --------- |
| green  | `#22c55e` | `#f0fdf4`  | `#15803d` |
| yellow | `#eab308` | `#fefce8`  | `#a16207` |
| blue   | `#3b82f6` | `#eff6ff`  | `#1d4ed8` |
| grey   | `#a3a3a3` | `#f5f5f5`  | `#525252` |
| red    | `#ef4444` | `#fef2f2`  | `#b91c1c` |

| Status      | Tone   | Dot                 |
| ----------- | ------ | ------------------- |
| Draft       | grey   | pulsing             |
| Quotation   | blue   | static              |
| Confirmed   | blue   | static              |
| Active      | green  | static              |
| Paused      | yellow | static              |
| Closed      | grey   | hollow (1.5px ring) |
| Cancelled   | grey   | hollow (1.5px ring) |
| Paid        | green  | static              |
| Outstanding | yellow | static              |
| Overdue     | red    | static              |

Red is used only for Overdue (including the overdue metric value on the dashboard) and destructive actions (delete, cancel invoice).

## Typography

Font: **Geist** for all text, **Geist Mono** for money, document numbers (`SUB-00042`, `INV-00108`) and numeric table columns. No other fonts.

| Style       | Size / line height | Weight    | Use                           |
| ----------- | ------------------ | --------- | ----------------------------- |
| Display     | 36 / 40            | 600       | Landing hero only             |
| H1          | 24 / 32            | 600       | Page titles                   |
| H2          | 18 / 28            | 600       | Section and card titles       |
| Body        | 14 / 20            | 400       | Default text, table cells     |
| Body strong | 14 / 20            | 500       | Labels, emphasized values     |
| Small       | 12 / 16            | 400       | Captions, helper text, badges |
| Metric      | 28 / 32            | 600, mono | Dashboard summary cards       |

- Money: right-aligned in tables, `₹1,23,456.00` style, always 2 decimals.
- Dates: `12 Mar 2026`. Relative dates ("in 3 days") only as secondary text.

## Spacing

4px base. Use Tailwind spacing: `1` (4), `2` (8), `3` (12), `4` (16), `6` (24), `8` (32).

- Page padding: 24px. Card padding: 16px. Gap between cards: 16px.
- Form fields: 16px vertical gap, label to input 6px.

## Radius

| Element                       | Radius          |
| ----------------------------- | --------------- |
| Buttons                       | pill (`9999px`) |
| Status badges, tags, avatars  | pill            |
| Inputs, selects, textareas    | 8px             |
| Cards, table container        | 8px             |
| Dropdowns, popovers, tooltips | 8px             |
| Dialogs, sheets               | 12px            |

## Shadows

Soft and low. Borders do most of the separation.

| Token         | Value                           | Use                          |
| ------------- | ------------------------------- | ---------------------------- |
| `--shadow-sm` | `0 1px 2px rgb(0 0 0 / 0.04)`   | Cards, inputs                |
| `--shadow-md` | `0 4px 12px rgb(0 0 0 / 0.06)`  | Card hover, sticky headers   |
| `--shadow-lg` | `0 12px 32px rgb(0 0 0 / 0.10)` | Dropdowns, popovers, dialogs |

## Icons

**Phosphor** (`@phosphor-icons/react`). No Lucide.

- Weight: `regular` everywhere. `fill` only for the active sidebar item.
- Size: 16px inline and in buttons, 20px in navigation, 32px in empty states.
- Color: `--muted-foreground` by default, inherits text color inside buttons.

## Motion

CSS only: transitions and `@keyframes`. No animation libraries.

- Duration 150ms, `ease-out`. Fades and color changes only. No bounce, no slide-ins on page load.
- The Draft pulse is the only looping animation:

```css
@keyframes status-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.35;
  }
}
.status-dot--pulse {
  animation: status-pulse 1.6s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

## Components

### Buttons

All pill-shaped. Height 36px (default) or 32px (small, in tables).

| Variant     | Style                                                                      |
| ----------- | -------------------------------------------------------------------------- |
| Primary     | Black fill, white text. Hover: neutral-800.                                |
| Secondary   | White fill, neutral-300 border, neutral-900 text. Hover: neutral-100 fill. |
| Ghost       | No border or fill. Hover: neutral-100 fill.                                |
| Destructive | Red-600 fill, white text. Only for irreversible actions.                   |

One primary button per view. Disabled: 50% opacity, no hover.

### Inputs

Height 36px, 8px radius, neutral-300 border, white fill. Focus: neutral-900 border plus 3px neutral-400/30 ring. Error: red-500 border with the message below in Small red-700.

### Status badge

Pill, 22px tall, Small text, 8px padding. A 6px dot on the left, then the label. Soft background and text color from the status table.

### Cards

White, 1px `--border`, 8px radius, `--shadow-sm`, 16px padding. Title in H2, optional actions top right.

### Tables

- Compact: 40px rows, 36px header.
- Header: `--surface` fill, Small text, 500 weight, `--muted-foreground`.
- Rows: 1px bottom border, `--muted` on hover. No zebra stripes.
- Numbers and money right-aligned in Geist Mono.
- Pagination below the table, 20 rows per page by default.

### Charts (Bklit)

- Greys by default: main series neutral-900, others neutral-400 and neutral-200.
- Status colors only on hover, or when the chart is about statuses (paid vs outstanding).
- Thin gridlines in neutral-200, axis labels in Small `--muted-foreground`.

### States

- **Empty:** 32px Phosphor icon, one-line title, one-line hint, optional primary button. Centered in the card.
- **Loading:** grey skeleton blocks (`--muted`) matching the final layout. No spinners for whole pages.
- **Error:** red-tone inline alert with a retry button.

## Layout

### Public pages (landing, explore, login, signup)

- Top bar: logo left, links and "Sign in" button right.
- Content centered, max width 1200px.
- Auth pages: one centered card, 400px wide, on `--surface` background.

### App shell (admin, staff, customer portal)

- Sidebar 240px, `--surface` fill, right border. Phosphor icons with labels. Active item: white fill, `--shadow-sm`, `fill` icon.
- Header 56px: page title left, user menu right.
- Content: 24px padding, max width 1400px.
- Navigation items depend on role (see PRD permission matrix).
