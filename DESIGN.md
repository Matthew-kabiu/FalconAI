# Falcon AI — Design Contract

Written from `docs/private/Templates/UI-Design-Contract-Template.md`. This is a contract for how the UI is meant to look and behave, not a claim that any screen already exists. Where this file and the template disagree, Matt's current instruction wins, then `VISION.md`, then the `SOP.md` addendum, then this file.

## Purpose and status

| Project context | Falcon AI |
| --- | --- |
| Product | Falcon AI: farm records, crop planning and early crop-health guidance for small-scale farmers in Kenya, as an installable web app. |
| Status | In build. Palette and font chosen by Matt on 2026-11-18. Design direction reset by Matt on 2026-11-19 (see "Design direction"); where an older line in this file disagrees with that section, that section wins. |
| Users and primary tasks | Small-scale farmers on low-cost Android phones, often outdoors, with patchy connectivity, in English or Kiswahili. Repeated tasks: sign in, check their plots and active crops, see what to do next on the crop calendar, log an activity with its cost, and (month 2) photograph a sick plant and read the assessment. Secondary: agricultural reviewers checking assessments (month 2+). |
| Current implementation | Public site (Home, Features, Crop health, Pilot, Privacy, Terms), own auth screens on Clerk's hooks, illustrated 404 and error screens, cookie notice, and the signed-in shell with a Home dashboard, Account, and empty-state Farms and Crops. Backend: health and `/api/v1/me` only, so no farm data exists yet. |
| Controlling plan | `VISION.md` (success criteria) and the TaskLabs project "Falcon AI"; source: the grant proposal in `docs/private/`. |
| Selected stack template | `Vite-Build-Template.md` + `Frontend-UI-Motion-Tooling-Standard.md`, as adopted in the `SOP.md` addendum. |
| Visual direction | Confident and spacious, still plain to read. Dark-first, with Light and System themes. Content uses the width of the screen. Groups are made with space and surface tone, never divider lines. One thing per screen is emphasised. See "Design direction". |
| Brand/theme reference | Falcon AI's own green palette (below) and Outfit. Defined only in `code/frontend/src/index.css`. |

Farmers need to see what is planted, what needs doing next and what they spent, then act without guessing. Every screen shows real data from the farmer's own records. If there is nothing to show, it says so plainly; it never invents sample data.

## Design direction (Matt, 2026-11-19)

This section records the direction set in the 2026-11-19 review. It is the first thing to read, and it wins over older wording elsewhere in this file.

1. **Space and tone, not lines.** No dividers between sections, in the header, or around content. Separate groups with generous spacing and by stepping the surface (`bg-bg` page, `bg-surface` panels and bands, `bg-bg` rows inside a panel, `bg-leaf-soft` for the one tinted block).
2. **Use the screen.** Widths and gutters follow the viewport (`vw`, `%`, `clamp()`); nothing sits in a narrow fixed column on a wide screen. Text and touch targets stay in `rem`.
3. **One emphasis per view.** Each screen or section has one thing that matters most, and it alone gets the tinted block, the filled chip or the `Callout`. Everything else stays quiet. Important information is marked in words plus an icon or shape, never by colour alone.
4. **Group what belongs together.** Related facts share one surface (the "at a glance" strip, a dashboard `Panel`, the measure-and-limits pair on the Pilot page). Unrelated things do not share a box.
5. **Line tabs, everywhere (Matt, 2026-11-19).** Any tabs, and anything that works like tabs (navigation links, auth tabs, language and theme choices, sidebar destinations), are line tabs: plain text labels in a row, the current one in full-strength text with a short `bg-primary` line under it (beside it, in the vertical sidebar) that slides or grows in over 200 ms. Never a pill, a filled background, a boxed segment or a divider line under the whole row. See "Tabs" under Interaction contract for the build rules.
6. **Quiet controls.** Header controls are compact: `EN / SW` for language, one cycling icon for theme. Inputs are borderless filled boxes that gain a border only on hover, focus (brand colour) or error (red).
7. **Depth over breadth.** Pages explain properly rather than skim. The public site is several linked pages with cross-links, a footer site map and "Keep reading" blocks; legal pages have a table of contents.
8. **Real imagery, honest content.** Photos of real Kenyan farms and farmers who look engaged or at ease, plus Falcon AI's own token-coloured illustrations (also on the 404 and error screens). No invented numbers; plans are written as plans. Filled dashboards may be reviewed with sample data in development only, under a visible banner.
9. **Motion that explains.** Short transform and opacity transitions only: the sliding selection bar, the cross-fading auth panels, sections easing in on scroll, arrows nudging on hover. Things beside the motion stay still (the auth photo does not move when tabs switch). All of it is off under reduced motion.
10. **Themes.** Dark is the look the product is reviewed in first; Light and System are supported everywhere through the same tokens.
11. **Overlays.** The cookie notice is a modal anchored at the bottom of the screen with the page dimmed behind it; preferences open inside it. Destructive confirmations will use the same native modal pattern.

## Required design skills

| Requested design input | Installed skill | Use on Falcon AI |
| --- | --- | --- |
| UI-UX Pro Max | `ui-ux-pro-max` | Form, accessibility, typography and responsive guidance for each new screen. |
| 21st.dev | `21st-ui-build`, `21st-cli-use` | Search the catalog before hand-writing a component; adapt it to this contract. The account is on the free tier (2 code retrievals a day, AI generation off). No paid generation without Matt's approval. |
| Taste | `design-taste-frontend` | Brief-reading and anti-default discipline; farmer workflows override landing-page advice. |
| Anti-AI-slop | `design-taste-frontend` | No generic card grids, gradients, glass, fake metrics, stock photos or emoji icons. |

These skills advise the build. They don't approve new dependencies: the Vite template's §14 baseline and approved add-ons still decide what can be installed.

## Implementation constraints

- **Stack:** Vite + React + Tailwind v4. Style with Tailwind utilities that use the semantic tokens below. The only hand-written CSS is `code/frontend/src/index.css`, which holds the tokens and resets, as Vite template §3 allows. No `@apply`, no inline style objects for visual styling, no hand-written `@font-face`.
- **Clerk UI (exception):** Falcon AI no longer renders Clerk's `<SignIn/>`, `<SignUp/>` or `<UserButton/>`. The one piece of Clerk's own UI still reachable is the account-management popup opened by "Manage account" on the Account page (`openUserProfile()`). It renders outside Tailwind's layers, so it is themed through Clerk's `appearance` prop (`code/frontend/src/hooks/use-clerk-appearance.ts`), which reads the colour tokens at runtime and follows the chosen theme. It is in English only.
- **Sizing (clarified by Matt, 2026-11-19):** page widths, gutters and section spacing follow the viewport (`vw`, `vh`/`dvh`, `%`, `clamp()`), so wide screens are used and nothing looks squeezed; the public site container is `w-[92vw]`. Text sizes and touch targets stay in `rem`/`em` so they follow the user's browser text size and zoom. No fixed pixel values for layout, spacing, type or breakpoints. Full-height shells use `min-h-dvh`; never clip content with a fixed height.
- **Root font size:** `clamp(100%, 0.95rem + 0.25vw, 112.5%)`, which works out to 16–18 CSS px. It respects the user's browser and system text size.
- **Touch targets:** at least `min-h-[2.75rem] min-w-[2.75rem]` (about 44 CSS px). Primary actions on phones are full-width buttons at least `3rem` tall. Targets grow with text and are never shrunk to fit.
- **Font family:** **Outfit** for headings, labels and body text, self-hosted through the approved `@fontsource-variable/outfit` package (variable weights 100–900), with a `system-ui` sans-serif fallback. It is self-hosted so it works offline and under the Nginx CSP `font-src 'self'`. Weights: 400 for body text, 500 for labels and buttons, 600 for headings. Numbers in costs, quantities and dates use `tabular-nums`. No second typeface. No decorative all-caps labels.
- **Type scale (rem):** body 1; small/help text 0.875 (never smaller); label 0.9375; h3 1.125; h2 1.375; h1 `clamp(1.5rem, 1.2rem + 1.5vw, 2rem)`. Line height 1.5 for body text, 1.2 for headings.
- **Language:** all text comes from the English/Kiswahili dictionary (TaskLabs #288). Kiswahili strings run about 20–30% longer, so buttons and labels wrap instead of truncating, and no layout assumes English word lengths.

## Visual system

All colours live as semantic tokens in `code/frontend/src/index.css` and are exposed to Tailwind (`bg-surface`, `text-fg`, `bg-primary` and so on). Components never use raw hex values.

### Brand palette

Matt chose this palette on 2026-11-18: https://coolors.co/palette/004b23-006400-007200-008000-38b000-70e000-9ef01a-ccff33

| Token | Hex | Role |
| --- | --- | --- |
| `--green-950` | `#004b23` | Light focus ring; text on light-green fills (dark mode) |
| `--green-900` | `#006400` | Light primary hover |
| `--green-800` | `#007200` | Light primary action; browser theme colour |
| `--green-700` | `#008000` | Light success status |
| `--green-500` | `#38b000` | Highlights and decorative accents only, never text or a text background (2.9:1 on white) |
| `--green-400` | `#70e000` | Dark primary action and success |
| `--green-300` | `#9ef01a` | Dark primary hover |
| `--green-200` | `#ccff33` | Dark focus ring |

Neutrals (backgrounds, text, borders) are green-tinted greys and are not part of the brand palette. Danger is red, so a delete action never looks like a brand action.

### Semantic tokens

| Token | Light | Dark |
| --- | --- | --- |
| `--bg` | `#f5f8f2` | `#0d1a0f` |
| `--fg` | `#12210f` | `#e9f2e4` |
| `--muted` | `#4f5c4b` | `#a5b3a0` |
| `--surface` / `--surface-hover` | `#ffffff` / `#eef4e6` | `#142416` / `#1c311e` |
| `--border` | `#d3dccb` | `#2e452f` |
| `--primary` / `--primary-hover` | `#007200` / `#006400` | `#70e000` / `#9ef01a` |
| `--on-primary` | `#ffffff` | `#004b23` |
| `--success` | `#008000` | `#70e000` |
| `--danger` / `--danger-hover` / `--on-danger` | `#b3261e` / `#95201a` / `#ffffff` | `#f2b8b5` / `#f5cac7` / `#3a0907` |
| `--focus` | `#004b23` | `#ccff33` |

Added on 2026-11-19, the same in both themes unless shown:

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--leaf` | `#38b000` | `#38b000` | Illustration fills only, never text |
| `--leaf-soft` | `#dcefc6` | `#23401f` | The one tinted block per view; illustration panels |
| `--brand-deep` / `--on-brand-deep` | `#004b23` / `#f2f9ec` | same | Closing call-to-action band on the public site |
| `--brand-accent` / `--brand-accent-hover` / `--on-brand-accent` | `#9ef01a` / `#ccff33` / `#004b23` | same | The button on that band only |

Not yet checked for contrast (do this when checks next run, and add the ratios below): `fg` and `muted` on `leaf-soft` in both themes; `primary` on `leaf-soft`; `on-brand-deep` on `brand-deep`; `muted` on `surface`; the borderless input (`bg` on `surface`), which is knowingly low-contrast at rest. Modal backdrops use a fixed `rgb(0 0 0 / 0.6)` scrim and Google's mark uses Google's own colours; these are the only raw colours outside `index.css`.

Warning and info tokens get added with the first screen that needs them (month 2: low-confidence and referred assessments), and their contrast is checked then.

### Verified contrast (WCAG 2.x)

| Pair | Ratio |
| --- | --- |
| Light: white on primary `#007200` | 6.16:1 |
| Light: white on primary hover `#006400` | 7.44:1 |
| Light: fg on bg | 15.67:1 |
| Light: muted on bg | 6.61:1 |
| Light: focus ring `#004b23` on bg | 9.65:1 |
| Dark: `#004b23` on primary `#70e000` | 6.08:1 |
| Dark: `#004b23` on primary hover `#9ef01a` | 7.35:1 |
| Dark: fg on bg | 15.61:1 |
| Dark: muted on bg | 8.15:1 |
| Dark: primary `#70e000` as text on bg | 10.54:1 |
| Dark: focus ring `#ccff33` on bg | 15.29:1 |

Every new pair gets checked and added here before use.

### Components and emphasis

- **Primary action:** filled `bg-primary text-on-primary`, at most one per screen. Secondary actions are outlined (`border-border`). Destructive actions use `danger` and always go through the confirmation dialog.
- **Status:** always shown as text plus an icon, never colour alone. A crop-health result is never shown as a bare green tick or red cross.
- **Shape:** controls `0.6em`, cards and panels `1rem`, photos, large panels and modals `1.25rem`. Shadows only on things that float over other content (a card on a photo, the cookie modal, the phone bottom bar). Groups are separated by spacing and surface tone. No divider lines and no outlined boxes around content.
- **Icons:** `lucide-react` only. One approved exception (Matt, 2026-11-19): Google's own "G" mark in its brand colours on the "Continue with Google" button (`components/ui/GoogleIcon.tsx`). Every button has an icon next to its label (Vite template §6.3). Icon-only controls get a tooltip and an `aria-label`.
- **Not allowed:** gradients, glows, glass panels, invented statistics, emoji. Photos and a hero are allowed on the public site only (see "Public site"); signed-in farmer screens stay photo-free.

### Theme

- Light / Dark / System, default System (follows the OS live). Header control: `ThemeToggle`, one icon button that cycles the three. Labelled control: `ThemeRadioGroup` in Account and the site footer.
- An explicit choice is saved per device in `localStorage`, read before the first paint by a small inline script in `index.html` that sets `data-theme` on `<html>`, so the page never flashes the wrong theme.
- **Built 2026-11-19:** `lib/theme.ts` + `hooks/use-theme.ts`; tokens switch on `prefers-color-scheme` with a `[data-theme]` override in `index.css` (the dark values are written twice there; keep both blocks identical). Controls: `ThemeToggle` (one icon button that cycles System, Light, Dark) in the public header, app header and error screen; `ThemeRadioGroup` (labelled) in Account and the site footer. The header language control shows `EN / SW`. Focus rings, dialogs, empty states and controls are checked in both themes.

### Layout and responsive behavior

- **Phones and medium screens (below `64rem`):** a single column. Signed-in: a top bar with a hamburger button, the app name, `EN / SW` and theme; the hamburger opens the navigation as a drawer (a native modal: page dimmed, focus kept inside, Escape or the X closes it). There is no bottom bar (Matt, 2026-11-19). Public: brand and a menu button that opens the pages, language, theme and account actions. One primary action per screen, full width.
- **Wide screens (from `64rem`):** page width follows the viewport (`w-[92vw]` on the public site, fluid gutters in the app); there is no narrow fixed column. Signed-in: a sidebar that is collapsed to icons by default, with a sidebar button at its top that opens it to icons plus labels (the choice is remembered on the device). Public: logo left, the four pages centred, controls right. Long text (legal pages, form columns) keeps a readable measure of about `46rem`.
- **Zoom and text size:** content reflows at 200% and 400% zoom. Long names and Kiswahili text wrap. Only a long table may scroll sideways, inside its own labelled, keyboard-reachable region. Sticky bars never cover a focused field.

## Interaction contract

All of the template's interaction rules apply as written. Falcon AI specifics:

- **Cursors:** every clickable element shows `cursor: pointer`, and disabled controls show `not-allowed` (already a global rule in `index.css`).
- **Forms:**
  - Built pattern (auth forms are the reference): inputs are borderless filled boxes (`TextField`); a border shows faintly on hover, in the brand colour on focus, in red on error. A field is checked when the person leaves it and re-checked as they fix it; a valid field shows a tick. An invalid submit focuses the first bad field and shows one warning toast. Hints sit under the field. New-password fields show `PasswordStrength` (bar, level in words, one tip); it is advice only, Clerk decides on submit.
  - Visible labels, never placeholder text as a label. "Optional" is written next to optional fields.
  - Errors appear under the field, in plain words with an example (for instance "Enter a Kenyan phone number, e.g. 0712 345 678"), linked by `aria-describedby`.
  - Values the farmer typed are kept when a save fails.
  - Dates use a custom date picker. Planting and activity dates default to today.
- **Selects:** county, crop, activity type and unit pickers use one custom accessible select/combobox primitive, with search for the 47-county list. It has designed hover, focus, selected, disabled and invalid states in both themes. There are no browser-default option lists.
- **Loading:**
  - The action button shows a spinner inside it and blocks repeat submits.
  - Page loads show a skeleton matching the destination layout, and route changes show a branded loading indicator.
  - On a refresh, existing content stays visible while it updates.
  - No polling: lists update from the API response after a change, and live data (month 2) arrives over SSE.
- **States:** every screen designs initial, loading, empty, filtered-empty, error (with Retry), success and not-allowed states.
  - Empty states say what to do next, for example "No plots yet — Add your first plot".
  - When offline (month 2 PWA), an offline banner shows, actions that need the network are disabled with a reason, and saved data is labelled as saved.
- **Destructive actions:** deleting a farm, plot, crop cycle or activity opens Falcon AI's own confirmation dialog naming the item and what will be lost. Focus starts on Cancel; Escape cancels; focus stays inside while it is open and returns where it was afterwards. It shows pending and failure states. Never `window.confirm`.
- **Feedback:** success and failure toasts (Sonner) show friendly messages from the error map, never raw backend errors.
- **Tabs (line tabs):** `role="tablist"` with `role="tab"` buttons and `role="tabpanel"` panels; `aria-selected`; arrow keys, Home and End move between tabs (roving `tabindex`); focus stays on the tab that was activated. One absolutely positioned line slides between tabs using `transform` only. Give tabs equal columns across the available width with centred labels, so the line travels a fixed distance and no measuring is needed. Keep inactive panels mounted but `inert` and hidden when their typed values must survive a switch. If a tab maps to a URL, the URL is the source of truth and switching uses the router. Reference: `components/auth/AuthTabs.tsx` and `pages/public/AuthPage.tsx`. It is the only tab set so far; when a second one is needed, lift it into a shared `components/ui/Tabs.tsx` and build both from that. For a choice that is not a set of panels (language, theme), use radio inputs styled the same way (`ThemeRadioGroup`, `LanguageRadioGroup`).
- **Modals:** use the native `<dialog>` with `showModal()` for anything that must be answered or read on its own (cookie notice, tutorials, the phone navigation drawer, and the delete confirmation when it is built). It gives the dimmed backdrop, focus trap, Escape and focus return for free. Every modal has an X at the top right. Add `m-auto` (Tailwind's reset removes the browser's centring). Toasts render underneath an open modal, so confirm inside the modal, not with a toast.
- **Motion:** short opacity/transform transitions (150–200 ms) for state changes only, written in CSS. No motion library is installed; Motion stays approved for when CSS is not enough. Under reduced motion, transitions are near-instant and loading indicators become static text.
- **Crop-health safety (month 2):** an assessment is always labelled as a preliminary opinion. It shows the confidence in words and numbers, gives safe next steps, and never shows pesticide dosages. Low-confidence results show "Take a clearer photo" or "Sent for expert review" instead of a diagnosis.

## Public site (Matt, 2026-11-19)

The signed-out site is four linked pages: Home `/`, Features `/features`, Crop health `/crop-health`, Pilot `/pilot`. The connection check moved to `/status`. These rules apply to those pages only.

- **Imagery:** real photos plus Falcon AI's own SVG illustrations (`components/marketing/Illustrations.tsx`, theme tokens only). Photos are free-licence Wikimedia Commons files, resized to WebP in `code/frontend/public/images/site/`, credited with author and licence in the footer. People in photos should look engaged or at ease, never stern. AI-generated images need a cost quote to Matt first; none are used yet.
- **Loading:** only the hero photo of a page loads eagerly; every other photo uses `loading="lazy"` with width and height set so nothing shifts. Pages are lazy routes.
- **Honesty:** plans are written as plans. No invented numbers, no claim that the pilot has run or that anything was tested or endorsed.
- **Hierarchy:** one h1 per page; sections use the shared `SectionHeader` (optional kicker, title, lead). The most important fact in a section goes in a `Callout`. Release timing is a `StatusChip` (icon plus text).
- **Shape:** controls `0.6em`, cards `1rem`, photos and large panels `1.25rem`. Shadows only on a card layered over a photo.
- **Calls to action:** one filled primary per screen. Every page ends with the same deep-green band (`--brand-deep`, lime `--brand-accent` button), identical in light and dark. White-ish text on `#004b23` and `#004b23` on `#9ef01a` (7.35:1) are the pairs used; re-check them when verification runs.
- **Navigation and linking:** sticky header with the four pages (menu button below `64rem`), a footer site map grouped as Product / Project / Account, a "Keep reading" block at the end of each inner page, and in-text arrow links between pages. Home tool tiles link to anchors on Features (`#farms`, `#calendar`, `#costs`, `#health`).
- **Motion:** sections with the `reveal` class ease in on scroll using CSS scroll-driven animation; off under reduced motion and in browsers without support. No motion library is installed.
- **Language:** all text is in `lib/i18n/site.en.ts` and `site.sw.ts` (Kiswahili is a first draft pending review).

## Signed-in app foundations (2026-11-19)

Every signed-in screen is built from the same parts. `pages/dashboard/HomePage.tsx` is the reference; copy its structure.

- **Shell:** `layouts/AppLayout.tsx`. Collapsible sidebar from `64rem`, hamburger drawer below it, four destinations (Home, Farms, Crops, Account). The current one is full-strength text plus a short bar, no pill. Add a destination only by editing `DESTINATIONS`. The foot of the sidebar and drawer is `components/app/UserMenu` (photo, name, email; menu with Settings and Log out), Falcon AI's own control; Clerk's `<UserButton/>` is no longer used.
- **Screen anatomy:** `components/app/PageHeader` (the only h1, one primary action) → the most important thing first → `Panel`s grouped by what the farmer is deciding. Groups are separated by space and surface tone (`bg-surface` on `bg-bg`, rows `bg-bg` inside a panel). No divider lines.
- **Shared parts (`components/app/`):** `PageHeader`, `Panel`, `EmptyState` (large with a title and action for a whole screen, small without a title inside a panel), `StatTile` (the one key figure gets `emphasis`), `SampleSwitch`.
- **Emphasis:** one tinted block per screen (`bg-leaf-soft`) for what matters most; urgent items get a filled chip (`bg-primary`); everything else stays quiet. Status is always words plus icon or shape, never colour alone.
- **Data hooks:** `hooks/use-*.ts` return `{ kind: 'loading' | 'ok' | 'error' }`; every screen renders all three. Types live in `types/`. `types/dashboard.ts` is provisional until falcon-api defines the endpoint in `api/openapi.yaml`.
- **Easy first, for varied digital confidence:** pictures before words, titles of a few words, one line of help at most, one obvious next tap, and nothing empty on show (no boxes of zeros, no empty panels: hide a group until it has data). Home for a new farmer is three picture steps (`components/app/StartSteps`), not a report.
- **Tutorials:** short picture guides, one drawing + title + one line per step (`components/app/Tutorial`, steps in `lib/tutorials.ts`, drawings in `components/app/TutorialIllustrations.tsx`). Each opens by itself the first time and is then hidden; "seen" is saved on the account (Clerk `unsafeMetadata.tutorialsSeen`) through `hooks/use-tutorial.ts`. Every screen with a tutorial has a "Show me how" button in its header to replay it. Every modal has an X at the top right.
- **Sample data:** real builds never show invented records. In development only, `SampleSwitch` fills a screen from `lib/sample/` under a visible "Sample data" banner so the filled design can be reviewed. Delete each sample when its API lands.
- **Labels and formats:** domain labels and icons from `lib/dashboard-labels.ts`; dates and KES from `lib/format.ts`; text from `lib/i18n/app.en.ts` and `app.sw.ts` (keys `app.*`). `t()` has no interpolation: compose values around translated words.
- **Forms (built with farms and plots, 2026-11-19; reuse for every add/edit screen):** `components/app/FormScreen` (back link, title, one card of fields, full-width save; a picture beside it on wide screens). Fields: `TextField`, `SearchSelect` (searchable list, e.g. the 47 counties from `lib/counties.ts`), `ChoiceGroup` (line-style choice, e.g. acres or hectares). Checks: a zod schema in `lib/validation/` that mirrors the falcon-core rule exactly; a field is checked when left; a failed save focuses the first bad field and shows one warning toast; the API's 422 `errors` list (`{ field, code }`) is mapped back onto the same fields (`serverFieldErrors`). Delete: `ConfirmDialog` (native modal, focus starts on Cancel, errors shown inside it). A delete the server would refuse is disabled up front with its reason in words. After saving, go to the record's page with a success toast.
- **Lists and detail:** picture cards that open the record; one filled button for the main action; row actions as icon buttons with tooltips; 20 per page with Previous/Next shown only when needed, page in the URL. Refreshes keep the current content on screen.
- **More shared parts (2026-11-19, crops):** `DatePicker` (calendar popup, Monday first, min/max, a "Today" button; defaults to today on activity and planting forms), `hooks/use-form.ts` (the leave-a-field check, failed-save focus and warning toast, server 422 mapping: use it for every new form), `hooks/use-resource.ts` (loading / ok / notFound / error, refresh in place: use it for every new read), `components/app/ActivityKindPicker` (choices as picture tiles when the farmer picks from a handful of actions). Optional fields sit in a quieter group under the required ones, so the quick path is short.
- **Crops are a catalogue, not a fixed list** (Matt, 2026-11-19): crop names, icons and order in `lib/crops.ts`; a crop calendar is shown only when the crop has a sourced one, otherwise a plain note says so and records still work.
- **Not built yet:** skeleton loaders, multi-line notes field.

## Shared table contract

Applies as written: server-side pagination of 20 rows per page, server-side sort and filters, and filter/sort/page state kept in the URL.

On phones, a "table" is a list of rows: each row is one full-width link to the record, with the key fields stacked. The same server pagination and sort rules apply. The activity log sorts by date, newest first, with creation time as the tie-breaker. Farm and plot lists sort by name.

## Product surfaces

Month-1 surfaces, matching TaskLabs #284–#293. Later surfaces are listed so navigation leaves room for them; they are not promises of availability.

| Surface | Farmer need and design treatment |
| --- | --- |
| Status (`/status`) | Shows whether Falcon AI is reachable. A friendly message, never an error code. Linked from the footer. |
| Sign-up and sign-in | One screen with two animated tabs (`/sign-in`, `/sign-up`), then email-code verification, forgot and reset password. Email + password, and Google. Both languages. See "Authentication and access". |
| Home (month 1 summary, dashboard in month 2) | Active crops with their current stage and next activity, and recent activities. Without data, it shows the next setup step. |
| Farms and plots | List of farms → farm detail with plots → add/edit forms. County picker, area with acres/hectares unit. Delete via the confirmation dialog. |
| Crop cycle | Start a maize or bean crop on a plot; growth-stage timeline with the current stage highlighted; mark harvested or abandoned. |
| Activity log | Newest-first list with a season cost total in KES (`tabular-nums`); add/edit activity form; delete via the confirmation dialog. |
| Crop-health check (month 2) | Photo capture/upload with crop and symptoms, upload progress, then the assessment card described under Interaction contract. |
| Account and settings | Name, email, role, language, theme (Light/Dark/System), legal links, privacy preferences, sign out. Data correction/deletion request (Data Protection Act) is still to build. |
| Expert review (month 2+) | Reviewer-only list of referred assessments; uses the shared table contract. |

Every change to a record is authorised on the server, and farmers only ever see their own records. Deleting a farm with plots is refused until its plots are removed, and the screen explains why.

## Authentication and access

> **Clerk settings these screens need** (checked against the dev instance on 2026-11-19): email + password on; email verified by code; first and last name enabled; Google enabled; **username must NOT be required**; **minimum password length must match the form (8)**. Matt changed the dev instance on 2026-11-19 (username no longer required, minimum length 8), confirmed by reading the instance settings; the same must be set on the production instance. Not supported yet: authenticator-app or SMS second factors (a friendly notice is shown). No flow has passed end to end yet.

| Access decision | Falcon AI |
| --- | --- |
| Provider and backend integration | **Clerk** (Matt, 2026-11-18): `@clerk/react` on the web; the Rust API verifies Clerk session tokens (Bearer header) against Clerk's published keys. Future Android/iOS apps use Clerk's mobile SDKs and the same API. |
| Registration | Public self-registration on Falcon AI's own sign-up tab: first name, last name, email, password, or Google. Email is verified by a 6-digit code. Phone sign-in is off (it would need paid SMS); revisit with Matt before the pilot. |
| Sign-in and sign-out | Own sign-in tab on `/sign-in`. Log out is in the account menu at the foot of the sidebar or drawer (`components/app/UserMenu`) and on the Account page; it returns to the public home page. Destination after sign-in: Home, or the page the user was sent from. Clerk session lifetime: 7 days (dev setting). |
| Invitations | None in month 1. |
| Password/account recovery | Own screens: `/forgot-password` (email) then `/reset-password` (emailed code + new password). The first step never says whether an account exists. |
| Initial administrator | Set by Matt in the Clerk Dashboard (or CLI): `public_metadata.role = "admin"` on his user. |
| Roles and permissions | `member` (default for every sign-up; sees only their own records, 404 for anyone else's) and `admin` (team and, from month 2, agricultural reviewers). Enforced in the Rust API from the token's `metadata.role` claim; the UI only hides what the API already refuses. |
| Reset and audit requirements | Clerk records sign-ins and account changes. Privacy notice must mention that accounts are held by Clerk (US-hosted) under Kenya's Data Protection Act. Falcon-side audit events are defined with the reviewer role. |

Clerk error codes are mapped to Falcon AI's own friendly messages in both languages (`components/auth/clerk-errors.ts`); raw Clerk messages are never shown.

## Delivery checks

For each screen, check:
- real loading and error behaviour, and the not-allowed state;
- keyboard and screen-reader use, and that focus returns to the right place;
- Light, Dark and System themes, and reduced motion;
- 360 px width, plus 200% and 400% zoom;
- target sizes and contrast;
- that the custom select and confirmation dialog behave correctly;
- server pagination, sort and filters wherever there is a list;
- both languages.

Matt decides when checks run (2026-11-19): ask before running typecheck, lint, tests or a build, and never run them after single edits. Between checks, the only automatic test is that the dev server serves the changed files without an error. A production build only runs on Matt's say-so.

### Known gaps as of 2026-11-19

Nothing below has been checked yet; treat each as open until someone looks.

- Phone width (360 px) on every new screen, including the hamburger drawer and the auth tabs.
- Light theme. Everything was reviewed in Dark.
- Kiswahili layout: longer strings in the navbar, tabs, step cards and buttons. All Kiswahili is a first draft.
- 200% and 400% zoom, keyboard-only use, and a screen-reader pass.
- Contrast of the pairs listed under "Semantic tokens".
- Email sign-up with a code, password reset, and the admin role.
- Parts still to build: custom select with search, date picker, delete-confirmation dialog, skeleton loaders, form layout for add/edit, list rows with server pagination.

## Where things live

All paths are under `code/frontend/src/` unless they start with `public/`.

| What | Where |
| --- | --- |
| Tokens, themes, resets, the scroll reveal | `index.css` (the only hand-written CSS) |
| Routes (the only place paths live) | `lib/routes.ts`, route table in `App.tsx` |
| Shells | `layouts/PublicLayout` (site header), `MarketingLayout` (footer), `CenteredLayout` (single-task pages), `AppLayout` (signed-in) |
| Public site parts | `components/marketing/` (`layout.ts` holds the shared width, section and heading classes) |
| Signed-in parts | `components/app/` |
| Auth parts | `components/auth/` |
| Legal parts | `components/legal/` (`documents.ts` lists each section's text keys) |
| Whole-screen states (404, error) | `components/feedback/StateScreen`, `StateIllustrations` |
| Shared controls | `components/ui/` (`Button`, `ButtonLink`, `IconButton`, `TextField`, `PasswordField`, `CodeField`, `SearchSelect`, `ChoiceGroup`, `ConfirmDialog`, `Switch`, `LanguageToggle`, `ThemeToggle`, and the radio groups) |
| Data from the API | `lib/api/apiClient.ts` (the only `fetch`), hooks in `hooks/use-*.ts` with loading / ok / error (and notFound where a 404 is expected), types in `types/` matching `code/backend/api/openapi.yaml` |
| Illustrations | `components/marketing/Illustrations`, `components/app/TutorialIllustrations`, `components/feedback/StateIllustrations` (theme token classes only, no text inside the SVG) |
| Photos | `public/images/site/<name>-<width>.webp`, listed in `components/marketing/photos.ts`, credited in `SiteFooter.tsx` |
| Text | `lib/i18n/`: `en.ts` and `sw.ts` (core), plus `site.*`, `auth.*`, `app.*`, `legal.*`. A key missing from Kiswahili fails the type check. `t()` has no interpolation |
| Device choices | `lib/theme.ts`, `lib/privacy.ts` (cookie notice; language, theme and sidebar are only stored when "remember" is on) |
| Tutorials | `lib/tutorials.ts`, `hooks/use-tutorial.ts` |

To add a public page: add the path to `routes.ts`, a lazy route under `MarketingLayout` in `App.tsx`, text keys in both `site.*` files, and links in `SiteHeader` and `SiteFooter`. To add a signed-in screen: the same under `AppLayout`, text in `app.*`, and a `DESTINATIONS` entry only if it is a top-level destination. After changing routes in development, hard-refresh the browser.

## Related UI templates

- `docs/private/Templates/UI-Design-Contract-Template.md`
- `docs/private/Templates/Vite-Build-Template.md`
- `docs/private/Templates/Frontend-UI-Motion-Tooling-Standard.md`
- `SOP.md` → "Project Addendum: Falcon AI — Build Templates and Adoption Contract"
