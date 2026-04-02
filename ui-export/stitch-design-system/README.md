# 🎨 Stitch Design System - Complete UI Export

**Export Date:** 2026-04-01  
**Project:** Opinion Routing Platform Redesign  
**Design System:** The Intelligent Flow (Indigo Logic)  
**Screens:** 10 Admin Dashboard Screens  

---

## 📦 Package Contents

```
ui-export/
└── stitch-design-system/
    ├── DESIGN.md                          # Complete design system documentation
    ├── 01-ops-command-center.png          # Ops Command Center Dashboard
    ├── 02-internal-project-management.png # Internal Project Management List
    ├── 03-project-quota-control.png       # Project Quota Control Center
    ├── 04-traffic-routing-supplier.png    # Traffic Routing & Supplier Priority
    ├── 05-redirect-management.png         # Redirect Management & Logic
    ├── 06-live-response-fraud.png         # Live Response Stream & Fraud Monitoring
    ├── 07-global-supplier-directory.png   # Global Supplier Directory
    ├── 08-security-audit-trail.png        # Security Audit Trail & Logs
    ├── 09-secure-admin-auth.png           # Secure Admin Authentication
    └── 10-public-quota-full.png           # Public Quota Full Status Page
```

---

## 🎯 Design System Overview

### Creative North Star
**"The Architectural Stream"** - An enterprise survey routing environment where data flows through layered surfaces with intentional asymmetry and tonal depth.

### Core Principles
- **No-Line Rule:** Borders prohibited for sectioning; use background shifts
- **Surface Hierarchy:** 3-layer system (surface → surface-container-low → surface-container-lowest)
- **Glass & Gradient:** Floating elements use glassmorphism with subtle gradients
- **Typography:** Manrope (headlines) + Inter (data density)
- **Elevation:** Tonal layering instead of drop shadows

---

## 🎨 Color Palette

### Primary Colors (Indigo Theme)
```css
--primary: #3a388b           /* Deep indigo for primary actions */
--primary-container: #5250a4 /* Lighter indigo for containers */
--primary-fixed: #e2dfff     /* Very light indigo for highlights */
--on-primary-fixed: #100563  /* Dark indigo for text on light */
```

### Surface System
```css
--surface: #faf8ff                    /* Base canvas */
--surface-container-low: #f2f3ff      /* Sectional layer */
--surface-container-lowest: #ffffff   /* Active components */
--surface-container-high: #e2e7ff     /* Sticky headers */
--surface-variant: rgba(250, 248, 255, 0.7) /* Glass effect */
```

### Semantic Colors
```css
--tertiary: #6c3400           /* Warning states */
--error: #ba1a1a             /* Error messages */
--on-surface: #131b2e        /* Primary text (NOT pure black) */
--outline-variant: #c5c5d4   /* Ghost borders at 15% opacity */
```

---

## 📐 Typography Scale

| Token          | Font        | Size    | Weight  | Use Case                |
|----------------|-------------|---------|---------|-------------------------|
| Display-lg     | Manrope     | 3.5rem  | 800     | KPI totals              |
| Headline-sm    | Manrope     | 1.5rem  | 600     | Section headers         |
| Body-md        | Inter       | 0.875rem| 400     | Table data, routing     |
| Label-sm       | Inter       | 0.6875rem| 700    | Metadata, status tags   |

**Tracking:** Label-sm uses +0.05em letter-spacing (uppercase)

---

## 🏗️ Component Specifications

### 1. Buttons
```css
/* Primary CTA */
background: linear-gradient(135deg, var(--primary), var(--primary-container));
color: white;
border-radius: 1.5rem; /* xl */
/* NO drop shadows - use color depth */

/* Secondary */
background: transparent;
border: 1px solid var(--outline-variant) at 15% opacity;
color: var(--on-surface);
border-radius: 1rem;
```

### 2. Data Tables
```css
/* Header Row */
background: var(--surface-container-high);
position: sticky;
top: 0;

/* Row Separation */
/* FORBIDDEN: 1px borders */
/* REQUIRED: Alternating backgrounds or padding */
--row-bg-odd: var(--surface-container-lowest);
--row-bg-even: var(--surface);

/* Cells */
font-family: 'Inter', sans-serif;
font-size: 0.875rem; /* body-md */
text-align: right; /* for numerical values */
```

### 3. KPI Cards
```css
background: var(--surface-container-lowest);
border-radius: 1.5rem; /* xl */
box-shadow: 0 0 20px rgba(86, 84, 168, 0.2); /* surface_tint glow top-right */
padding: 1.5rem; /* spacing-6 */
```

### 4. Modals
```css
/* Overlay */
background: rgba(19, 27, 46, 0.4); /* on_surface at 40% */
backdrop-filter: blur(16px);

/* Container */
background: var(--surface-container-lowest);
border-radius: 1.5rem; /* xl */
box-shadow: 0 20px 40px rgba(19, 27, 46, 0.06);

/* Footer */
background: var(--surface-container-high);
border: none; /* just color shift */
```

---

## 📏 Spacing Scale

```css
--spacing-4: 1rem;    /* 16px */
--spacing-5: 1.25rem; /* 20px */
--spacing-6: 2rem;    /* 32px - default breathing room */
--spacing-8: 2.75rem; /* 44px - for crowded sections */
```

---

## 🔧 Elevation & Depth

### Ambient Shadows
```css
/* For floating elements (dragged nodes, tooltips) */
box-shadow: 0px 20px 40px rgba(19, 27, 46, 0.06);
/* Note: NOT pure black - tinted on_surface */
```

### Ghost Border (Accessibility)
```css
border: 1px solid rgba(197, 197, 212, 0.15); /* outline_variant at 15% */
```

---

## 🚫 Do's and Don'ts

### ✅ DO:
- Use white space as functional element (spacing-6 default)
- Use rounded-xl and rounded-2xl for everything
- Use tertiary (#6c3400) for warnings instead of orange
- Use surface color shifts instead of borders
- Align typography to baseline grid

### ❌ DON'T:
- Use pure black (#000000) for text - always use on_surface (#131b2e)
- Use standard drop shadows on cards - use surface layers
- Stack more than 3 levels of nesting
- Use 1px dividers inside cards
- Use heavy saturated backgrounds for large areas

---

## 📱 Screen Reference

| # | Screen Name                          | File                          | Key Components                              |
|---|--------------------------------------|-------------------------------|---------------------------------------------|
| 1 | Ops Command Center Dashboard         | 01-ops-command-center.png    | KPI cards, data tables, charts             |
| 2 | Internal Project Management List     | 02-internal-project-management.png | Table with sticky headers, CRUD modals    |
| 3 | Project Quota Control Center         | 03-project-quota-control.png | Quota meters, supplier controls            |
| 4 | Traffic Routing & Supplier Priority | 04-traffic-routing-supplier.png | Routing logic nodes, priority drag-drop   |
| 5 | Redirect Management & Logic          | 05-redirect-management.png   | URL builder, parameter mapping            |
| 6 | Live Response Stream & Fraud Monitor| 06-live-response-fraud.png   | Real-time feed, fraud alerts              |
| 7 | Global Supplier Directory            | 07-global-supplier-directory.png | Supplier cards, search, filters          |
| 8 | Security Audit Trail & Logs          | 08-security-audit-trail.png  | Log tables, filters, export               |
| 9 | Secure Admin Authentication          | 09-secure-admin-auth.png     | Login form, 2FA, password reset           |
| 10| Public Quota Full Status Page        | 10-public-quota-full.png     | Status messaging, branding                |

---

## 🔄 Integration with Current Project

Your existing survey routing platform (`d:\new12-main`) already has:

✅ Landing pages with WavyOutcomeView  
✅ Admin authentication  
✅ Status pages  
✅ Routing logic  

**Next Steps:**
1. Apply this design system to admin dashboard pages
2. Replace Tailwind classes with custom CSS following these tokens
3. Use screenshots as reference for layout and component placement
4. Maintain existing routing/backend logic - only UI changes needed

---

## 📞 Support

For questions about specific components or implementation:
- Reference the DESIGN.md for detailed specifications
- Check screenshot filenames for screen-specific patterns
- Follow the "Do's and Don'ts" section for consistency

---

**Status:** ✅ UI Package Ready for Implementation  
**Location:** `d:\new12-main\ui-export\stitch-design-system\`  
**Files:** 11 screenshots + DESIGN.md + this guide
