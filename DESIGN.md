# DD Enterprise ERP — Design System & UI Guidelines

> **Design Philosophy:** *"Clarity over complexity. The interface should disappear — only the work should remain."*  
> The design must feel premium, structured, and trustworthy — like a financial instrument, not a toy.  
> Effects and animations exist to **communicate state**, not to show off.

---

## 1. Design Principles

| Principle | Meaning |
|---|---|
| **Functional Beauty** | Every visual decision must serve a purpose. Decoration is justified only when it aids comprehension. |
| **Calm Confidence** | The palette is cool, controlled, and authoritative — no aggressive colors, no visual noise. |
| **Progressive Disclosure** | Don't overwhelm. Show only what's needed at each step. Details appear on demand. |
| **Micro-feedback** | Every interaction must feel responsive. No dead clicks. Every state is communicated. |
| **Consistent Rhythm** | Spacing, sizing, and timing follow a system — not guesswork. |

---

## 2. Color System

### Brand Palette (Current — Keep As-Is)

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#00356A` | Active nav, buttons, headings, links |
| `--color-primary-container` | `#004B93` | Button hover, active chip backgrounds |
| `--color-on-primary-container` | `#96BDFF` | Text on dark primary backgrounds |
| `--color-accent` | `#EA580C` | Warning badges, destructive hover, highlights |
| `--color-background` | `#F1F4F9` | Page canvas |
| `--color-surface` | `#FFFFFF` | Cards, sidebar, modals |
| `--color-surface-dim` | `#CFD9F1` | Pressed states, subtle dividers |
| `--color-surface-container` | `#E7EEFF` | Hover backgrounds, tags, chips |
| `--color-outline-variant` | `#C2C6D2` | Borders, dividers |
| `--color-error` | `#BA1A1A` | Validation errors |

### Extended Semantic Palette (Add in Phase 2)

```css
/* Add to @theme in index.css */
--color-success: #166534;
--color-success-container: #DCFCE7;
--color-warning: #92400E;
--color-warning-container: #FEF3C7;
--color-info: #1E40AF;
--color-info-container: #DBEAFE;

/* Status badge colors */
--color-status-draft: #6B7280;
--color-status-submitted: #1D4ED8;
--color-status-approved: #15803D;
--color-status-posted: #166534;
--color-status-cancelled: #991B1B;
```

### Dark Mode Palette (Phase 3)

```css
/* Dark mode overrides — activate with [data-theme="dark"] */
--color-background: #0D1117;
--color-surface: #161B22;
--color-surface-container: #1C2330;
--color-on-surface: #E6EDF3;
--color-primary: #58A6FF;
--color-outline-variant: #30363D;
```

---

## 3. Typography

### Font Stack (Current — Keep As-Is)

| Role | Font | Weight | Usage |
|---|---|---|---|
| Body / UI | **Work Sans** | 400, 500, 600 | All paragraph text, form labels, table cells |
| Headings | **Manrope** | 600, 700, 800 | Page titles, section headers, card titles |
| Labels / Codes | **IBM Plex Mono** | 400 | Invoice numbers, amounts, SKU codes, timestamps |

### Type Scale

```
--text-xs:   0.75rem  / 12px  — Captions, metadata, timestamps
--text-sm:   0.875rem / 14px  — Table data, form inputs, nav items (DEFAULT UI SIZE)
--text-base: 1rem     / 16px  — Body text, card descriptions
--text-lg:   1.125rem / 18px  — Card titles, section subheadings
--text-xl:   1.25rem  / 20px  — Page sub-titles
--text-2xl:  1.5rem   / 24px  — Page titles (h1)
--text-3xl:  1.875rem / 30px  — Dashboard KPI numbers
--text-4xl:  2.25rem  / 36px  — Hero stats, large metrics
```

### Typography Rules

- **Page titles (h1):** `text-2xl font-heading font-bold text-on-surface`
- **Section headers (h2):** `text-lg font-heading font-semibold text-on-surface`
- **Card titles:** `text-sm font-heading font-semibold text-on-surface`
- **All monetary amounts:** Must use `font-mono` (IBM Plex Mono). Example: `₹1,24,500.00`
- **All reference numbers** (invoice no., SKU, etc.): Must use `font-mono text-primary`
- **Empty/helper text:** `text-sm text-outline` (muted, never compete with content)

---

## 4. Spacing & Layout

### Spacing Scale (8px base grid)

```
4px  (0.5) — Icon gap, tiny padding
8px  (1)   — Inner chip/badge padding
12px (1.5) — Form element internal padding
16px (2)   — Card padding (mobile), section gap (tight)
20px (2.5) — Nav item padding
24px (3)   — Card padding (desktop), standard section gap
32px (4)   — Between card rows, section breaks
48px (6)   — Between major page sections
64px (8)   — Page top padding
```

### Layout Grid

```
App Shell:
├── Sidebar: 260px fixed (collapsible to 0 on mobile)
├── TopBar: 64px fixed height
└── Main Content:
    ├── Page Header: px-6 pt-6 pb-4
    ├── Content Area: px-6 pb-6
    └── Max content width: 1400px (centered on ultra-wide)
```

### Breakpoints

```
sm:  640px  — Mobile landscape
md:  768px  — Tablet
lg:  1024px — Desktop (sidebar becomes persistent)
xl:  1280px — Wide desktop
2xl: 1536px — Ultra-wide
```

---

## 5. Component Design Specifications

### 5.1 Sidebar

**Current state:** White background, primary blue for active items.

**Upgrade specs:**
- Background: Keep `bg-surface` (white)
- Add a very subtle inner shadow on the right edge: `shadow-[inset_-1px_0_0_var(--color-outline-variant)]`
- **Active NavItem:** Left border accent + background:
  ```
  border-l-2 border-primary bg-primary/8 text-primary font-semibold rounded-r-lg
  ```
- **Hover state:** `bg-surface-container` with `150ms ease` transition
- **Group header (collapsed):** Text color `text-outline`, uppercase tracking, `text-xs font-semibold`
- **Logo area:** Gradient shimmer on the icon box:
  ```css
  background: linear-gradient(135deg, #00356A 0%, #004B93 100%);
  box-shadow: 0 2px 8px rgba(0, 53, 106, 0.3);
  ```
- **Transition:** Accordion open/close must use `max-height` CSS transition (smooth expand), NOT just toggle display.

---

### 5.2 Top Bar

**Upgrade specs:**
- Height: 64px
- Background: `bg-surface/90` with `backdrop-filter: blur(12px)` — **frosted glass effect** so content slightly bleeds through when scrolling
- Bottom border: `border-b border-outline-variant/60`
- Sticky: `position: sticky; top: 0; z-index: 20`
- Add a subtle drop shadow when user has scrolled: `shadow-sm` (add via scroll event listener)
- **Breadcrumb:** Page name + module path (e.g., `Sales > Invoices > New Invoice`)
- **Right side actions:** User avatar (initials circle), notification bell

---

### 5.3 Stat / KPI Cards (Dashboard)

```
┌─────────────────────────────────────┐
│  [Icon in colored chip]  ▲ +12.4%   │
│                                     │
│  ₹24,85,000                         │ ← Large mono font
│  Total Revenue This Month           │ ← Small muted label
└─────────────────────────────────────┘
```

**Specs:**
- Background: `bg-surface`
- Border: `border border-outline-variant`
- Border Radius: `rounded-xl` (16px)
- Shadow: `shadow-ambient` (custom blue-tinted shadow from theme)
- Padding: `p-6`
- Icon chip: `rounded-lg p-2` with category-specific background color (e.g., revenue = `bg-primary/10`, expense = `bg-error/10`)
- **Trend badge:** Green up arrow / Red down arrow — `text-xs font-semibold px-2 py-0.5 rounded-full`
- **KPI number:** `text-3xl font-mono font-bold text-on-surface`

---

### 5.4 Data Tables

Tables are the backbone of the ERP. They must be **dense, readable, and scannable**.

```
┌──────────────────────────────────────────────────────────┐
│  Section Title                     [Search] [Filter] [+] │
├──────────────────────────────────────────────────────────┤
│  ☐  Invoice No.   Date       Customer    Amount   Status  │  ← Sticky header
├──────────────────────────────────────────────────────────┤
│  ☐  INV-0001     01 Sep     ABC Corp    ₹45,000  ● Posted │
│  ☐  INV-0002     02 Sep     XYZ Ltd     ₹12,500  ○ Draft  │
└──────────────────────────────────────────────────────────┘
```

**Specs:**
- Row height: `h-11` (44px) — dense but not cramped
- Header: `bg-background text-xs font-semibold uppercase tracking-wide text-outline sticky top-0`
- Row hover: `hover:bg-surface-container/60` with `transition-colors duration-100`
- Row border: `border-b border-outline-variant/50` (very light, not heavy grid lines)
- Selected row: `bg-primary/5 border-l-2 border-primary`
- Alternating rows: **Do not use** — hover is sufficient for scanning
- **Amount cells:** Always right-aligned, `font-mono text-sm`
- **Reference cells (Invoice no., SKU):** `font-mono text-primary text-sm`
- **Status badges:** Pill shape, color-coded (see Status Colors below)
- Pagination: Bottom of table, `text-sm`, showing `1-25 of 142 records`

---

### 5.5 Status Badges

```css
/* Base style for all status badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 9999px; /* full pill */
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}
```

| Status | Background | Text Color | Dot |
|---|---|---|---|
| Draft | `#F3F4F6` | `#6B7280` | Gray |
| Submitted | `#DBEAFE` | `#1D4ED8` | Blue |
| Approved | `#D1FAE5` | `#065F46` | Green |
| Posted | `#DCFCE7` | `#166534` | Dark Green |
| Cancelled | `#FEE2E2` | `#991B1B` | Red |
| Active | `#D1FAE5` | `#065F46` | Green |
| Inactive | `#F3F4F6` | `#6B7280` | Gray |

---

### 5.6 Buttons

**Primary Button:**
```css
background: var(--color-primary);
color: white;
padding: 8px 20px;
border-radius: 8px;
font-weight: 600;
font-size: 0.875rem;
transition: background 150ms ease, box-shadow 150ms ease, transform 80ms ease;

:hover  → background: #004B93; box-shadow: 0 4px 12px rgba(0,53,106,0.25)
:active → transform: scale(0.98)
```

**Secondary / Outline Button:**
```css
background: transparent;
border: 1px solid var(--color-outline-variant);
color: var(--color-on-surface);
:hover → background: var(--color-surface-container);
```

**Destructive Button:**
```css
background: var(--color-error);
:hover → box-shadow: 0 4px 12px rgba(186,26,26,0.25)
```

**Icon Button (toolbar actions):**
```css
padding: 8px;
border-radius: 8px;
color: var(--color-on-surface-variant);
:hover → background: var(--color-surface-container); color: var(--color-on-surface)
```

---

### 5.7 Form Inputs

```css
/* Input field */
border: 1px solid var(--color-outline-variant);
border-radius: 8px;
padding: 10px 12px;
font-size: 0.875rem;
background: var(--color-surface);
transition: border-color 150ms ease, box-shadow 150ms ease;

:focus → border-color: var(--color-primary);
         box-shadow: 0 0 0 3px rgba(0, 53, 106, 0.12);
         outline: none;

:invalid (after interaction) → border-color: var(--color-error);
                                box-shadow: 0 0 0 3px rgba(186,26,26,0.10);
```

- **Labels:** `text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1`
- **Helper text:** `text-xs text-outline mt-1`
- **Error text:** `text-xs text-error mt-1 flex items-center gap-1`
- **Required indicator:** A subtle `*` in `text-error` after the label
- **Select / Dropdown:** Same styling as input, with a custom chevron icon replacing the default
- **Amount fields:** `text-right font-mono` so numbers align on decimal points

---

### 5.8 Modals & Drawers

**Confirm Dialog (small action — delete, cancel, approve):**
- Centered modal, max-width `400px`
- Blurred dark overlay: `bg-black/50 backdrop-blur-sm`
- `border-radius: 16px`, `padding: 24px`, white background
- Animation: Scale in from `0.95` to `1.0` + fade in, `200ms ease-out`

**Form Drawer (create/edit records — larger forms):**
- Slides in from the right: `translate-x-full → translate-x-0`
- Width: `560px` on desktop, full-width on mobile
- Animation: `300ms cubic-bezier(0.32, 0.72, 0, 1)` (smooth decelerate)
- Header with title + close button, scrollable body, sticky footer with action buttons

---

## 6. Trending Effects & Transitions (2025–2026)

These are the effects currently trending in enterprise and SaaS UI design. Each one is described with **where to use it** and **how to implement it**.

---

### 6.1 Glassmorphism (TopBar & Modals)

**What it is:** A frosted glass effect using blur, transparency, and a subtle border.

**Where to use:**
- TopBar (sticky header blurs the content behind it as the user scrolls)
- Modal overlays
- Floating action menus / dropdowns

**How to implement:**
```css
.glass {
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

/* Dark mode version */
.glass-dark {
  background: rgba(22, 27, 34, 0.85);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

**Important:** Use sparingly. Only on elements that literally float above other content.

---

### 6.2 Skeleton Loaders (Data Loading States)

**What it is:** Pulsing gray placeholder shapes that appear while data is being fetched, instead of a spinning loader. Feels far more professional.

**Where to use:** Every table, card, and dashboard widget while data loads from Supabase.

**How to implement:**
```css
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #E7EEFF 25%,
    #CFD9F1 50%,
    #E7EEFF 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 6px;
}
```

**Usage in React:**
```tsx
// Table skeleton row
{isLoading ? (
  Array.from({ length: 8 }).map((_, i) => (
    <tr key={i}>
      <td><div className="skeleton h-4 w-full" /></td>
      <td><div className="skeleton h-4 w-3/4" /></td>
      <td><div className="skeleton h-4 w-1/2" /></td>
    </tr>
  ))
) : (
  // real data rows
)}
```

---

### 6.3 Count-Up Animations (Dashboard KPIs)

**What it is:** Numbers on the dashboard "count up" from 0 to their real value when the page first loads. Makes the data feel alive.

**Where to use:** All KPI stat cards on the Dashboard.

**Library to use:** `react-countup` (tiny, no dependencies)
```bash
npm install react-countup
```

**Usage:**
```tsx
import CountUp from 'react-countup'

<CountUp
  end={2485000}
  prefix="₹"
  separator=","
  duration={1.5}
  decimals={0}
  useEasing={true}
  easingFn={(t, b, c, d) => c * (1 - Math.pow(1 - t/d, 3)) + b}
/>
```

---

### 6.4 Page Transition Animations

**What it is:** Smooth fade+slide animations when navigating between pages (e.g., Dashboard → Invoices).

**Library:** `framer-motion`
```bash
npm install framer-motion
```

**Implementation — Wrap every page component:**
```tsx
import { motion } from 'framer-motion'

const pageVariants = {
  initial:  { opacity: 0, y: 12 },
  animate:  { opacity: 1, y: 0,  transition: { duration: 0.22, ease: 'easeOut' } },
  exit:     { opacity: 0, y: -8, transition: { duration: 0.15, ease: 'easeIn'  } },
}

export function InvoicesPage() {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* page content */}
    </motion.div>
  )
}
```

**Wrap routes in `<AnimatePresence>` in `App.tsx`:**
```tsx
import { AnimatePresence } from 'framer-motion'

<AnimatePresence mode="wait">
  <Routes location={location} key={location.pathname}>
    ...
  </Routes>
</AnimatePresence>
```

---

### 6.5 Staggered List Animations (Tables & Lists)

**What it is:** Table rows or list items animate in one-by-one with a small delay between each. Makes large tables feel structured and elegant.

**Where to use:** Table rows when data first loads, search results.

**Implementation:**
```tsx
const containerVariants = {
  animate: { transition: { staggerChildren: 0.04 } }
}

const rowVariants = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.2 } },
}

<motion.tbody variants={containerVariants} animate="animate">
  {rows.map(row => (
    <motion.tr key={row.id} variants={rowVariants}>
      ...
    </motion.tr>
  ))}
</motion.tbody>
```

**Important:** Keep `staggerChildren` at `0.04` or less (40ms). Any slower feels sluggish.

---

### 6.6 Micro-Interactions on Buttons

**What it is:** Tiny, instant feedback when a user clicks a button. Makes the interface feel tactile and "real".

```css
/* Scale down on press — add to all button elements */
button:active {
  transform: scale(0.97);
  transition: transform 80ms ease;
}

/* Success state — button briefly turns green after save */
.btn-success {
  background: var(--color-success) !important;
  transition: background 300ms ease;
}
```

**React implementation for async buttons (save/submit):**
```tsx
const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

// On click:
setStatus('loading')
await saveData()
setStatus('success')
setTimeout(() => setStatus('idle'), 2000)

// Render:
<button disabled={status === 'loading'}>
  {status === 'idle'    && <><Save /> Save Invoice</>}
  {status === 'loading' && <><Loader2 className="animate-spin" /> Saving...</>}
  {status === 'success' && <><Check /> Saved!</>}
  {status === 'error'   && <><X /> Failed — Retry</>}
</button>
```

---

### 6.7 Smooth Accordion / Collapse Animations (Sidebar Groups)

**What it is:** Sidebar nav groups expand and collapse with a smooth height animation (not a jarring snap).

**Current issue:** The sidebar uses `{open && <div>}` which causes an instant snap, not a smooth expand.

**Fix — Use CSS max-height transition:**
```tsx
<div
  style={{ maxHeight: open ? `${contentRef.current?.scrollHeight}px` : '0px' }}
  className="overflow-hidden transition-[max-height] duration-200 ease-in-out"
  ref={contentRef}
>
  {children}
</div>
```

---

### 6.8 Toast Notifications (Action Feedback)

**What it is:** A small notification that slides in from the top-right when an action succeeds or fails. Replaces browser `alert()` boxes.

**Library:** `react-hot-toast` (2KB, no dependencies, beautiful by default)
```bash
npm install react-hot-toast
```

**Setup in `main.tsx`:**
```tsx
import { Toaster } from 'react-hot-toast'

<Toaster
  position="top-right"
  toastOptions={{
    duration: 4000,
    style: {
      background: '#fff',
      color: '#111c2c',
      fontSize: '0.875rem',
      fontFamily: 'Work Sans, sans-serif',
      borderRadius: '10px',
      border: '1px solid #C2C6D2',
      boxShadow: '0 4px 20px rgba(0, 75, 147, 0.12)',
    },
    success: { iconTheme: { primary: '#166534', secondary: '#fff' } },
    error:   { iconTheme: { primary: '#BA1A1A', secondary: '#fff' } },
  }}
/>
```

**Usage everywhere:**
```tsx
import toast from 'react-hot-toast'

toast.success('Invoice saved successfully')
toast.error('Failed to save. Please try again.')
toast.loading('Saving...') // returns id to dismiss later
```

---

### 6.9 Subtle Gradient Accents (Cards & Headers)

**What it is:** A very subtle gradient — not flashy, just enough to give depth and premium feel to key surfaces.

**Where to use:**
- Login page background
- Dashboard stat card icon chips
- Section header borders (left border accent)

**Examples:**
```css
/* Login page background */
background: linear-gradient(135deg, #F1F4F9 0%, #E7EEFF 50%, #CFD9F1 100%);

/* Stat card icon chip */
.kpi-icon-revenue   { background: linear-gradient(135deg, #EFF6FF, #DBEAFE); }
.kpi-icon-expense   { background: linear-gradient(135deg, #FEF2F2, #FEE2E2); }
.kpi-icon-stock     { background: linear-gradient(135deg, #F0FDF4, #DCFCE7); }
.kpi-icon-production{ background: linear-gradient(135deg, #FFFBEB, #FEF3C7); }
```

---

### 6.10 Focus-Visible Ring (Accessibility)

**What it is:** A clear focus indicator for keyboard navigation. Modern browsers hide the default ugly outline, but we need a custom elegant one.

```css
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 6px;
}
```

---

## 7. Iconography

**Library:** `lucide-react` (already in use — keep it)

**Rules:**
- **Size in nav:** `h-4 w-4` (16px)
- **Size in buttons:** `h-4 w-4` (16px)
- **Size in section headers:** `h-5 w-5` (20px)
- **Size in empty states:** `h-10 w-10` (40px)
- **Size in stat cards:** `h-5 w-5` (20px)
- Stroke width: default (1.5px) — never change this, it gives visual consistency
- Never use icons without a text label on buttons (accessibility)
- Icons in loading states should use `className="animate-spin"` (Lucide's Loader2)

---

## 8. Empty States

Empty states appear when a table has no data. They must be friendly and helpful.

```
            [Icon - large, muted]

          No Invoices Found

     You haven't created any invoices yet.
   Start by creating your first sales invoice.

          [+ Create First Invoice]  ← Primary action
```

**Specs:**
- Center-aligned in the table area
- Icon: `h-12 w-12 text-outline/50`
- Title: `text-base font-semibold text-on-surface`
- Description: `text-sm text-outline max-w-xs`
- Button: Primary, links directly to the create form

---

## 9. Loading States Priority

When data is loading, use these in order of preference:

1. **Skeleton loaders** — For initial page load (tables, cards, lists)
2. **Spinner inside button** — For user-triggered actions (save, submit, delete)
3. **Progress bar** — For file uploads or multi-step operations
4. **Full-page spinner** — Never use. Always prefer skeletons.

---

## 10. Implementation Priority Order

When implementing the design in Phase 2, apply upgrades in this order:

| Priority | Task | Impact |
|---|---|---|
| 1 | Install `react-hot-toast` and replace all alert dialogs | High — immediate UX win |
| 2 | Add skeleton loaders to all data tables | High — feels much more polished |
| 3 | Fix sidebar accordion animation (smooth height) | Medium — feels more fluid |
| 4 | Add `button:active` scale micro-interaction globally | Medium — tactile, quick to implement |
| 5 | Add count-up to Dashboard KPI cards | Medium — impresses clients |
| 6 | TopBar glassmorphism on scroll | Low — visual polish |
| 7 | Install `framer-motion` and add page transitions | Low — premium feel |
| 8 | Staggered table row animations | Low — do last, can hurt performance on large tables |

---

## 11. What NOT To Do

- ❌ **No neon / glowing effects** — This is a professional accounting tool, not a gaming site
- ❌ **No background videos or parallax** — Too heavy, too distracting
- ❌ **No animations longer than 350ms** — Users are here to work, not watch shows
- ❌ **No color-only status indicators** — Always pair color with text or an icon (colorblind users)
- ❌ **No tooltips on icons without text labels** — Icon-only buttons must always have a tooltip
- ❌ **No hover effects that move content around** — Only opacity and background changes on hover
- ❌ **No decorative illustrations** — Clean, professional, corporate. Illustrations belong on marketing sites.

---

## 12. Design Resources & References

**Inspiration boards:**
- [Linear.app](https://linear.app) — Best-in-class B2B SaaS UI density and feel
- [Vercel Dashboard](https://vercel.com/dashboard) — Clean stat cards, table patterns
- [Notion](https://notion.so) — Typography and content hierarchy
- [Stripe Dashboard](https://dashboard.stripe.com) — Financial UI best practices, table design

**Libraries to install (Phase 2):**
```bash
npm install framer-motion      # Page & component animations
npm install react-hot-toast    # Toast notifications
npm install react-countup      # KPI number animations
npm install @radix-ui/react-dialog      # Accessible modals
npm install @radix-ui/react-tooltip     # Accessible tooltips
npm install @radix-ui/react-select      # Accessible custom selects
```

**Fonts (already loaded in the app — verify in `index.html`):**
```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Work+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

*Last Updated: September 2026*  
*Design Author: Development Team*  
*Review this document before starting any new UI component in Phase 2.*
