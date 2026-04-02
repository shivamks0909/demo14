# Design System Strategy: The Intelligent Flow

## 1. Overview & Creative North Star
**The Creative North Star: "The Architectural Stream"**
In an enterprise survey routing environment, data is never static—it is a fluid stream of logic and human sentiment. This design system rejects the "boxed-in" layout of legacy SaaS. Instead, it adopts an architectural approach where information flows through layered surfaces. We move beyond the "standard dashboard" by utilizing **intentional asymmetry** (e.g., placing high-density tables against wide-open KPI sections) and **tonal depth**. The goal is to make the user feel like an architect of data, not just an operator.

---

## 2. Colors: Tonal Architecture
We utilize a Material-inspired palette centered on deep Indigos and Slates. To achieve a premium feel, we strictly follow the **"No-Line" Rule**.

### The "No-Line" Rule
Traditional 1px borders are a sign of uninspired design. In this system, **borders are prohibited for sectioning.** Boundaries are defined exclusively through background shifts:
- A `surface-container-low` component sitting on a `surface` background.
- High-priority zones using `surface-container-highest` to draw the eye.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium materials:
1.  **Base Layer:** `surface` (#faf8ff) - The canvas.
2.  **Sectional Layer:** `surface-container-low` (#f2f3ff) - Used for grouping secondary content.
3.  **Active Component Layer:** `surface-container-lowest` (#ffffff) - Reserved for cards or inputs to create "lift" against the grey-tinted background.

### The "Glass & Gradient" Rule
For floating elements (Modals, Tooltips, Popovers), use **Glassmorphism**:
- **Background:** `surface_variant` at 70% opacity.
- **Backdrop-blur:** 12px to 20px.
- **Signature Texture:** Primary CTAs should not be flat. Use a subtle linear gradient from `primary` (#3a388b) to `primary_container` (#5250a4) at a 135-degree angle to provide "soul" and depth.

---

## 3. Typography: Editorial Authority
We pair **Manrope** (for structural headlines) with **Inter** (for data density). 

- **Manrope (Display & Headlines):** Used for "The Big Picture." Its geometric nature feels modern and authoritative.
- **Inter (Title, Body, Labels):** Used for "The Details." Its high x-height ensures readability in complex survey routing tables.

**The Typographic Hierarchy:**
- **Display-lg (Manrope, 3.5rem):** Used for high-level KPI totals.
- **Headline-sm (Manrope, 1.5rem):** For section headers.
- **Body-md (Inter, 0.875rem):** The workhorse for all table data and routing logic.
- **Label-sm (Inter, 0.6875rem):** Uppercase with 0.05em tracking for metadata or small "Status" labels.

---

## 4. Elevation & Depth: Beyond the Drop Shadow
We replace structural lines with **Tonal Layering**.

### The Layering Principle
To separate a sidebar from the main content, do not use a line. Set the Sidebar to `surface-container-low` and the Main Content Area to `surface`. The shift in hex code provides all the separation necessary for a clean, modern aesthetic.

### Ambient Shadows
When an element must "float" (e.g., a dragged routing node):
- **Shadow:** `0px 20px 40px rgba(19, 27, 46, 0.06)`
- **Color Note:** Notice the shadow is not black; it is a tinted version of `on_surface` (#131b2e) to mimic natural light reflection.

### The "Ghost Border" Fallback
If accessibility requirements demand a border (e.g., in high-contrast scenarios), use a **Ghost Border**: `outline_variant` (#c5c5d4) at 15% opacity. It defines the edge without cluttering the visual field.

---

## 5. Components: Precision Primitives

### Sidebar & Navigation
- **Structure:** `surface-container-low` background. 
- **Active State:** A pill-shaped background using `primary_fixed` (#e2dfff) with `on_primary_fixed` (#100563) text. No "active" vertical bars at the edge; let the color shift do the work.

### Complex Data Tables
- **Sticky Headers:** Use `surface-container-high` (#e2e7ff) for the header row to provide immediate visual grounding during scroll.
- **Row Separation:** **Forbidden:** 1px dividers. **Required:** Use alternating backgrounds (`surface-container-lowest` vs `surface`) or simple vertical padding (`spacing-4`).
- **Cells:** Use `body-md` for data. Right-align numerical values for rapid scanning.

### KPI Cards
- **Aesthetic:** Use `xl` (1.5rem) rounded corners.
- **Visual Soul:** Add a 20% opacity `surface_tint` (#5654a8) glow in the top right corner of the card to signify importance without using an icon.

### Modal-based CRUD Interfaces
- **Overlay:** `on_surface` at 40% opacity with a heavy 16px backdrop-blur.
- **Container:** `surface-container-lowest` with `xl` rounding. 
- **Interaction:** Primary actions sit in a `surface-container-high` footer with no border, just a slight color shift from the modal body.

---

## 6. Do’s and Don'ts

### Do:
- **Do** embrace white space. Use `spacing-6` (2rem) as your default "breathing room" between major sections.
- **Do** use `rounded-xl` and `rounded-2xl` for almost everything. Sharp corners feel dated and aggressive.
- **Do** use `tertiary` (#6c3400) for "Warning" states instead of a basic orange; it feels more sophisticated and enterprise-ready.

### Don't:
- **Don't** use pure black (#000000) for text. Always use `on_surface` (#131b2e) to maintain a soft, premium feel.
- **Don't** stack more than three levels of nesting. If you need a card inside a card inside a section, reconsider the layout.
- **Don't** use standard "drop shadows" on buttons. If a button needs to stand out, use color depth or a subtle gradient.