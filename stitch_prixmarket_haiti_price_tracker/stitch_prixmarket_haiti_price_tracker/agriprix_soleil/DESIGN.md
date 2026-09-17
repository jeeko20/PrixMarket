---
name: AgriPrix Soleil
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#3f4941'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#6f7a70'
  outline-variant: '#becabe'
  surface-tint: '#006d40'
  primary: '#005f37'
  on-primary: '#ffffff'
  primary-container: '#0e7a4a'
  on-primary-container: '#a6ffc6'
  inverse-primary: '#7cd9a0'
  secondary: '#855300'
  on-secondary: '#ffffff'
  secondary-container: '#fea619'
  on-secondary-container: '#684000'
  tertiary: '#972d00'
  on-tertiary: '#ffffff'
  tertiary-container: '#be3e08'
  on-tertiary-container: '#ffe6df'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#97f6bb'
  primary-fixed-dim: '#7cd9a0'
  on-primary-fixed: '#002110'
  on-primary-fixed-variant: '#00522f'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#ffdbd0'
  tertiary-fixed-dim: '#ffb59d'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832600'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.03em
  label-sm:
    fontFamily: Space Grotesk
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.05em
  price-display:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-tablet: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system embodies pragmatic modernism engineered specifically for high-mobility, high-stress, and variable outdoor conditions across Haitian market hubs. The visual direction balances the authority and operational dependability of an agrarian financial index with the vibrant, approachable energy of daily Caribbean commerce.

The emotional core communicates clarity, resilience, and mutual trust. Under harsh tropical midday sunlight or unstable network conditions, the interface cuts through cognitive fatigue with unmistakable information hierarchy, stark readability, and instant tactile confirmation.

The design movement fuses **High-Contrast Pragmatism** with **Tactile Modernism**:
- High-contrast visual structure ensuring effortless scans in outdoor sunlight.
- Crisp boundary definitions without visual clutter.
- Explicit visual signals for data freshness, offline connectivity fallback, verified market stall origins, and real-time community price consensus.
- Equal linguistic parity between Kreyòl Ayisyen and Français, designed to respect differing text lengths without horizontal clipping.

## Colors

The palette directly honors Haitian agronomy and market trade while adhering to rigorous accessibility guidelines:

- **Primary (`#0E7A4A` - Vert Émeraude Agricole):** The anchor of fiscal authority, agriculture, and trust. Used for dominant calls-to-action, primary filters, certified price verifications, and online/synced status indicators.
- **Secondary (`#F59E0B` - Or Soleil Caribéen):** The vitality of commerce, alerts, and market deals. Applied to price fluctuations, featured deals (*Aubaines / Bon Dizon*), AI forecasting suggestions, and pending validation states.
- **Tertiary (`#C2410C` - Terracotta Terroir):** Rooted in the rich soil of rural plateaus and central wholesale hubs. Allocated to inflation surges, price spike warnings (*Alèt Ogmantasyon*), critical supply drops, and offline/stale state triggers.
- **Neutral Surface & Canvas:** Built on an ultra-clean base of `#F8FAFC`, rising to pure `#FFFFFF` for primary cards, with deep `#0F172A` and `#1E293B` ensuring a minimum 7:1 contrast ratio under intense outdoor glare.

### Status & State Token Tokens
- **Online / Synced:** `#0E7A4A` (with a 15% emerald glow ring).
- **Offline Mode (*Mòd Dekonekte*):** `#475569` base with `#C2410C` badge accent.
- **Verified Collector / Marchand:** `#0284C7` (Caribbean Cobalt for official field enumerators).
- **Inflation Spike (*Pri Monte*):** `#DC2626` text on `#FEF2F2` background.
- **Price Drop / Bargain (*Pri Desann*):** `#16A34A` text on `#F0FDF4` background.

## Typography

Typography prioritizes extreme legibility across varied ambient brightness and quick scannability for market stall transactions.

- **Headline & Metric Font (`Space Grotesk`):** Provides sharp, geometric clarity with distinct numerical tabular glyphs essential for Goud (HTG) currency figures, weights (*mamit*, *sak*, *chay*, *liv*), and percentage shifts.
- **Body & Structural Font (`Plus Jakarta Sans`):** Delivers open counters, broad apertures, and generous x-height. This ensures acute readability for bilingual toggle displays (Kreyòl / Français) and preserves legibility at small sizes on entry-level mobile devices.

### Bilingual Handling Rules
- All label badges and header elements must preserve 20% visual growth allowance to accommodate translation variations between French and Haitian Creole (e.g., *Marché de Gros* vs *Mache an Gwo*).
- Tabular figures must be enabled (`font-variant-numeric: tabular-nums`) on all numeric and monetary labels to prevent visual jittering in live-refreshing market tickers.

## Layout & Spacing

The layout utilizes a strict **fluid mobile-first grid** engineered for handheld single-thumb operation in crowded markets.

- **Grid Architecture:** 
  - **Mobile (<640px):** 4-column fluid layout with `16px` outer margin and `12px` gutter. 
  - **Tablet (640px–1024px):** 8-column layout with `24px` outer margin and `16px` gutter.
  - **Desktop / Web Dashboard (>1024px):** 12-column constrained layout (max-width `1200px`) with `32px` margin and `24px` gutter.

- **Spacing Cadence:** Based on a strict `4px` base module. Compact spacing (`space-xs` to `space-md`) ensures high information density for commodity listings without visual overlap, while larger spacing (`space-lg` to `space-xl`) isolates floating action anchors, offline status bars, and summary metric cards.

## Elevation & Depth

To maximize battery life and render instantly on budget hardware under blazing daylight, this system rejects heavy, smoky blurs in favor of **Tonal Layering** paired with **Crisp Micro-Outlines**:

- **Surface Level 0 (Base Canvas):** `#F8FAFC` — Matte, glare-resistant soft neutral.
- **Surface Level 1 (Card & Row Container):** `#FFFFFF` with a `1px` structural outline in `#E2E8F0`. No ambient blur required for baseline states.
- **Surface Level 2 (Floating Toggles, Active Dropdowns, Sticky Search):** `#FFFFFF` with a crisp directional drop: `0px 4px 8px -2px rgba(15, 23, 42, 0.08)`, edged with a `1px` stroke in `#CBD5E1`.
- **Surface Level 3 (AI Advisory Sheets, Quick-Record Modals):** Elevation defined through an assertive `0px 12px 24px -4px rgba(15, 23, 42, 0.16)` paired with a tinted high-contrast backcloth (`rgba(15, 23, 42, 0.6)`).
- **Offline / Alert Mode:** Elevation transitions to a 2px persistent outline using Terracotta (`#C2410C`) to establish immediate environmental awareness without shifting layouts.

## Shapes

The design uses balanced, modern curves (`roundedness: 2`) that feel warm and human while maintaining structural efficiency.

- **Base Radius (`0.5rem` / `8px`):** Used for standard input boxes, commodity row cards, dropdown triggers, and tabular market panels.
- **Large Radius (`1rem` / `16px`):** Applied to summary metric cards, interactive maps, AI prediction containers, and bottom sheets.
- **Full Radius (Pill / `9999px`):** Strictly reserved for verification chips, offline status dots, Kreyòl/Français language toggles, unit metrics (*Gwo / Detay*), and primary quick-action buttons.

## Components

### Buttons & Interactive Triggers
- **Primary Action (Record Price, Submit Survey):** Background `#0E7A4A`, label `#FFFFFF`, height `48px` minimum to ensure confident physical touch targets. Active state drops to `#0A5C37`.
- **Secondary Action (Filter Market, Switch Unit):** Background `#F1F5F9`, border `1px solid #CBD5E1`, text `#1E293B`.
- **Destructive / Alert Action:** Background `#FEF2F2`, border `1px solid #FCA5A5`, text `#C2410C`.

### Bilingual Language Switcher (HT / FR)
- Compact segmented control pinned to navigation. Active state is pill-shaped `#0E7A4A` with high-contrast `#FFFFFF` bold text; inactive state is transparent with `#64748B`. Seamless instant string substitution without layout shift.

### Connectivity & Sync Bar
- Sticky full-width ribbon across device safe-area top.
  - **Online State:** 3-second auto-dismissing banner `#F0FDF4` with `#0E7A4A` text (*Konekte • Pri yo ajou* / *Connecté • Prix à jour*).
  - **Offline State:** Persistent `#FFF7ED` strip with `#C2410C` text and sync retry counter (*Mòd offline • Done yo anrejistre lokalman* / *Mode hors-ligne • Données en cache local*).

### Commodity Price Cards (*Kat Denre*)
- Contained white cards with a `1px solid #E2E8F0` edge.
- Visual breakdown:
  1. **Left:** Thumbnail icon/image of the produce (Manioc, Pwa nwa, Diri nasyonal, Bannann miske) with badge indicating category.
  2. **Middle:** Produce title in current language + Commune/Market tag (e.g., *Mache Salomon, P-o-P* or *Mache Kwabosal*).
  3. **Right:** Tabular price in HTG (`Space Grotesk Bold`) with metric pill (*pa mamit*, *pa sak 50kg*). Below the price, directional micro-trend badges: Green down-arrow for price reduction or Orange/Red up-arrow with percentage change.

### Verification Badges & AI Advice Blocks
- **Verified Trader / Collector:** Pill container with an emerald checkmark and label: `Vérifié / Verifye`.
- **AI Price Forecast Box:** Soft gold tint `#FEFCE8` with border `1px solid #FDE047`. Features a sparkling glyph with contextual insight (e.g., *"Pri pwa nwa ka desann 5% semèn pwochèn akòz rekòt nan Latibonit"*).

### Form Inputs & Search Fields
- Generous `48px` tap height, `8px` corner radius, `1.5px` border in `#CBD5E1`. Focused state transitions to `#0E7A4A` with a clean `2px` green offset ring. Placeholder text styled in accessible `#64748B`.