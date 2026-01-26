# New Landing Page Migration

This document outlines the changes made when migrating the new landing page design from `scribe-new-frontend` to the main scribe project.

## Overview

The new landing page features:
- **3D ASCII Effect Background** - A spinning icosahedron rendered with WebGL and converted to ASCII art
- **Modern Hero Section** - Clean typography with call-to-action buttons
- **Responsive Header** - Fixed header with logo and mobile menu

## Files Added

### Landing Components (`components/landing/`)

| File | Description |
|------|-------------|
| `hero.tsx` | Main hero section with heading, subtext, and CTA buttons. Accepts `onGetStarted` callback for auth |
| `hero-background.tsx` | Three.js Canvas with spinning 3D shape and ASCII post-processing effect |
| `ascii-renderer.tsx` | React Three Fiber component that applies ASCII effect to the scene |
| `ascii-effect.ts` | WebGL-to-ASCII conversion class (ported from three.js examples) |
| `header.tsx` | Fixed header with logo and sign-in button. Accepts `onSignIn` callback |
| `mobile-menu.tsx` | Radix Dialog-based mobile navigation menu |
| `button.tsx` | Custom button component with polygon clip-path styling |
| `logo.tsx` | SVG logo component |

### Old Landing Page Backup

| File | Description |
|------|-------------|
| `app/old-landing-page/page.tsx` | Original landing page preserved at `/old-landing-page` route |

## Files Modified

### `app/page.tsx`
Replaced the original landing page with the new design:
- Imports `Hero` and `LandingHeader` components
- Preserves Supabase Google OAuth authentication
- Redirects authenticated users to `/dashboard`

### `app/layout.tsx`
Added Geist Mono font for subtext styling:
```tsx
import { Inter, Geist_Mono } from "next/font/google"

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

// Body className now includes: `${inter.className} ${geistMono.variable}`
```

### `app/globals.css`
Added theme variables for landing page:
```css
@theme {
  --font-mono: var(--font-geist-mono);
  --font-sentient: 'Sentient', ui-serif, Georgia, serif;
  --shadow-glow: 0 0 8px 2px var(--tw-shadow-color);
}
```

### `lib/utils.ts`
Added `px` helper function:
```ts
export const px = (value: number) => `${value}px`
```

## Dependencies Added

```json
{
  "@react-three/fiber": "latest",
  "@react-three/drei": "latest",
  "three": "latest"
}
```

Dev dependencies:
```json
{
  "@types/three": "^0.180.0"
}
```

## Architecture

```
app/
├── page.tsx                    # New landing page
├── old-landing-page/
│   └── page.tsx               # Preserved original design
├── layout.tsx                  # Updated with Geist Mono font
└── globals.css                 # Updated with font/shadow variables

components/
└── landing/                    # All new landing page components
    ├── hero.tsx               # Hero section
    ├── hero-background.tsx    # 3D background
    ├── ascii-renderer.tsx     # ASCII effect
    ├── ascii-effect.ts        # ASCII conversion class
    ├── header.tsx             # Page header
    ├── mobile-menu.tsx        # Mobile nav
    ├── button.tsx             # Custom button

    └── logo.tsx               # SVG logo
```

## How It Works

### 3D ASCII Background

1. `hero-background.tsx` creates a Three.js Canvas using `@react-three/fiber`
2. A `SpinningShape` component renders a rotating icosahedron
3. `AsciiRenderer` intercepts the WebGL render and converts it to ASCII characters
4. The `AsciiEffect` class samples pixel brightness and maps it to characters: ` .:-+*=%@#`

### Authentication Flow

The landing page integrates with existing Supabase auth:
- `LandingHeader` and `Hero` components accept callback props (`onSignIn`, `onGetStarted`)
- `app/page.tsx` passes `loginWithGoogle` function to these callbacks
- Authenticated users are automatically redirected to `/dashboard`

## Customization

### Changing Hero Text
Edit `components/landing/hero.tsx`:
```tsx
<h1 className="text-5xl sm:text-6xl md:text-7xl font-sentient">
  Your custom heading
</h1>
<p className="font-mono text-sm sm:text-base text-foreground/60">
  Your subtext here
</p>
```



### Adjusting the 3D Effect
In `components/landing/hero-background.tsx`:
- Change `<icosahedronGeometry args={[2, 0]} />` for different shapes
- Adjust `delta * 0.2` and `delta * 0.25` for rotation speed
- Modify `AsciiRenderer` props for different characters or resolution
