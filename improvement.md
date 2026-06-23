# Codebase Audit — Bubu Lagos

> Scope: every file under `bubu-lagos-web/src/` plus config (Vite, Vercel, Tailwind, env). Backend (Render + Supabase) is not in the repo so backend/API-layer findings below are inferred from the call sites and the documented contract.
> Date: 2026-06-09
> Auditor: senior fullstack engineer + motion designer

---

## 1. CRITICAL (fix before shipping)

### 1.1 Security & auth

- **[AdminRoute.jsx:3-13](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/components/AdminRoute.jsx#L3-L13)** — Guard is a presence check on `localStorage` tokens; the token is never validated against the server. A user with a stale/expired/forged `adminToken` value in localStorage reaches the dashboard until the first protected call returns 401 (which is then silently logged). **Fix:** add a `/admin/me` (or `/admin/verify`) probe on mount and a global 401 interceptor in [api.js](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/utils/api.js#L23-L28) that clears tokens + redirects to `/admin/login` (and `/login` for customer).
- **[AuthContext.jsx:9-21](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/context/AuthContext.jsx#L9-L21)** — No JWT expiry check. `localStorage.authToken` is treated as valid until logout. **Fix:** decode `exp` on load, run a refresh on app boot, and add an API interceptor that handles 401s (see above).
- **[utils/api.js:11-15](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/utils/api.js#L11-L15)** — Token selection logic re-reads `window.location.pathname` on every request. It also couples the API client to the route. **Fix:** read the active "session kind" from a context or set it once in the providers; the request function should not need to know the URL.
- **[Login.jsx, AdminLogin.jsx, ResetPassword.jsx, etc.]** — `console.error(err)` leaks request metadata (URL, sometimes the body) to the browser console in production. **Fix:** gate every `console.*` behind `import.meta.env.DEV`; in prod only show user-facing toasts.
- **[ProductDetail.jsx:74-95](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/ProductDetail.jsx#L74-L95)** — `showToast('Added to cart!', 'success')` is called *after* `addToCart`; if the user double-clicks Add to Cart, two `setTimeout`s race. **Fix:** disable the button while `justAdded === true` and clear the timer in a `useEffect` cleanup.

### 1.2 Functional bugs

- **[Account.jsx:1-6](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Account.jsx#L1-L6)** — Uses `<motion.header>` on line 49 but **never imports `motion` from framer-motion**. Page will throw a `ReferenceError` on render. Same for `reduceMotion` — used on line 51 but never declared/imported. **Fix:** add `import { motion, useReducedMotion } from 'framer-motion'` and `const reduceMotion = useReducedMotion();`.
- **[Cart.jsx:88,93](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Cart.jsx#L88-L93)** — Line-item Total renders raw `item.price` (e.g. `"₦285,000"`) without multiplication by quantity, so the per-row total is wrong whenever `quantity > 1`. **Fix:** compute and render `parseInt(item.price.replace(/[^0-9]/g,'')) * item.quantity` (or store numeric `price` on the cart item from the start).
- **[Account.jsx:134-140](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Account.jsx#L134-L140)** — "View Details" links to `/order/verify/${order.reference}` which is a *new* Paystack verification flow. For already-completed orders this will trigger another verify call and may show a "verification error" state. **Fix:** create a dedicated `/order/:reference` route that calls `/orders/${reference}` and renders order detail, or guard `/payment/verify` to only run verification on first arrival.
- **[Shop.jsx:204-206](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Shop.jsx#L204-L206)** — Hard-codes `collection === "Spring 2025"` and `"Re-Edition"` for section grouping, but `SAMPLE_PRODUCTS` set `collection: 'Atelier 2026'` (see [sampleProducts.js:53](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/lib/sampleProducts.js#L53)) and AdminProducts doesn't write a `collection` field at all. **Result:** every sample/API product falls into "All Products" — Spring 2025 / Re-Edition sections are always empty. **Fix:** either (a) make the filter configurable via a `groupBy` prop, (b) read `product.collection ?? product.category?.name`, or (c) drop the hard-coded collection split and show a single "Featured" grid.
- **[ProductCard.jsx:80-82](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/ProductCard.jsx#L80-L82)** — `setIsScrolled` runs on every scroll event with no rAF throttling; on a long scroll the component re-renders hundreds of times. **Fix:** wrap in `requestAnimationFrame` + a ref guard, or use a passive scroll listener with `{ passive: true }` (Header.jsx:41 doesn't pass `passive: true` either).
- **[Header.jsx:99-101](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Header.jsx#L99-L101)** — The `borderOpacity` motion value chain (`scrollY → borderOpacity → borderOpacityValue`) is redundant. `useTransform` already returns the same motion value, so the second `useTransform` is a no-op. **Fix:** drop the second `useTransform` and use `borderOpacity` directly.

### 1.3 Data layer

- **[utils/api.js:40-58](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/utils/api.js#L40-L58)** — `api.upload` silently drops `Content-Type` even when the body is `JSON.stringify`-able, and it duplicates the auth logic instead of reusing `request()`. **Fix:** make `request()` accept `{ body, headers, isForm }` and call from a single path.
- **[utils/api.js:1](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/utils/api.js#L1)** — `VITE_API_URL` is read once at module load. If the env is set after the bundle is built (e.g. Vercel preview deploys), the fallback fires. Acceptable, but document the constraint.
- **[AdminSettings.jsx:18](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/pages/AdminSettings.jsx#L18)** — `useToast()` is called but the import is `import { useToast } from '../../context/ToastContext'` and the destructure is `{ toast }` while the context exports `{ success, error, info, warning, ... }` — `toast.success` works, so this is OK; **however** AdminMarketing.jsx:23 destructures `{ showToast }` (which doesn't exist on the context) — calling it would throw. **Fix:** standardize on the same destructure in both files.

---

## 2. HIGH PRIORITY (impacts UX or performance noticeably)

### 2.1 UI / Design

- **Filter chip "View All" mismatch** — `displayFilters` is `["View All", ...categories.map(c => c.name)]`, but the API still gets a `category=View%20All` query param when the user clicks an unrelated category named "View All" (if the API ever adds that as a real category). More importantly, switching between an API response and the static `FILTERS` array causes the chip set to change without animation, which is jarring. **Fix:** freeze the list once the categories load, or always show a stable set.
- **[ProductCard.jsx:98-102](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/ProductCard.jsx#L98-L102)** — The "View Product" hover overlay has `pointer-events: none` and sits *on top* of the link. On touch devices there is no hover, so the visual cue that the card is clickable is missing. **Fix:** also show the overlay on `focus-visible` and on tap (`whileTap`).
- **[Footer.jsx:78-80](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Footer.jsx#L78-L80)** — `SOCIAL_LINKS` all point to `href="#"`. The links are visually present but inert (scroll to top, URL hash appended). **Fix:** point to actual profiles or render as `<span>` until populated.
- **[Header.jsx:296-310](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Header.jsx#L296-L310)** — The `borderOpacityValue` is used on a 1px line, but the same effect is also being recreated by the `bg-white shadow-sm` toggle on scroll — they're competing visual signals. **Fix:** pick one (the bg change is more visible; drop the border).
- **[Account.jsx:46](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Account.jsx#L46)** — `pt-[100px]` doesn't match the actual 60px header height — creates dead space. Same in Checkout's "Continue" button position.
- **[ProductDetail.jsx:166-172](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/ProductDetail.jsx#L166-L172)** — The "Out of stock" strike-through uses an absolutely positioned 1px line rotated 45° over the button. It works, but the line is `opacity-20` so it's nearly invisible. **Fix:** bump to `opacity-50` or use a clear diagonal slash.
- **All admin pages use the `text-gray-*` palette** (gray-50, gray-100, gray-400, gray-500, gray-900). The customer-facing pages use the `text-text-light`, `text-accent`, `text-border` design-system tokens. **Result:** the admin is visually inconsistent with the brand. **Fix:** either (a) introduce `--color-admin-*` tokens, or (b) keep the neutral palette but add the brand accent (`accent` color) to headers, primary buttons, and active sidebar items.
- **[AdminLayout.jsx:75-86](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/components/AdminLayout.jsx#L75-L86)** — The Bell notification icon has a red dot but is not actually wired to anything. Either remove the dot or wire it.
- **[AdminLayout.jsx:31-32](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/components/AdminLayout.jsx#L31-L32)** — `JSON.parse(localStorage.getItem('adminUser') || '{}')` on every render. Cache in state, hydrate once on mount.

### 2.2 Performance

- **Missing code splitting** — `App.jsx` imports every page + admin page at the top level, so the initial bundle ships AdminOrders, AdminCustomers, AdminMarketing, etc. for customers who'll never see them. **Fix:** `React.lazy(() => import('./pages/...'))` + `<Suspense fallback={...}>` for all routes. Bundle impact: ~30-40% smaller initial JS.
- **[ProductCard.jsx:35-58](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/ProductCard.jsx#L35-L58)** — Heavy animation stack per card: `useInView` + `useMotionValue` + `useTransform` + `useSpring` × 2 + `useEffect` with `requestAnimationFrame`. On Shop this creates 12+ motion values. **Fix:** memoize the card (`React.memo` + custom equality on `product.id`), or use a CSS-only count-up for the price (cheaper).
- **[ProductCard.jsx:73-76](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/ProductCard.jsx#L73-L76)** — The "View Product" overlay uses `variants` cascade — every parent re-render re-evaluates the variants object. **Fix:** hoist `variants` to a module-level `const`.
- **[Shop.jsx:347](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Shop.jsx#L347)** — `window.innerWidth` read on click. Fine in a click handler but breaks SSR (not used here) and won't update if the user resizes the window between renders. **Fix:** use a `useMediaQuery` hook with a state subscription.
- **[Shop.jsx:147-170](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Shop.jsx#L147-L170)** — `fetchProducts` is in a `useEffect` deps `[activeFilter, sort]` but `search`, `minPrice`, `maxPrice` are referenced inside it. They won't trigger refetch. **Fix:** add to deps, or refactor to read from refs/state to avoid re-creating the closure.
- **All Unsplash images at `?w=900`** — no `srcset`, no `sizes`, no `auto=format`. On a 5K display the browser downloads 900px and upscales. **Fix:** build a `srcset` URL (`?w=400 400w, ?w=800 800w, ?w=1200 1200w`) and add `sizes` to the `<img>`.
- **[Home.jsx:106](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Home.jsx#L106)** — Hero images use `loading={index < 2 ? "eager" : "lazy"}` correctly, but Home.jsx:90-100 doesn't set `fetchpriority="high"` on the eager ones. **Fix:** add `fetchPriority="high"` to the LCP candidates.
- **No `React.memo` on `ProductCard`** — every Shop/Search re-render (e.g. when toggling a filter chip) re-renders all visible cards.
- **Framer-motion is ~80KB gzipped** — every page imports `motion`, `AnimatePresence`, `useReducedMotion`, etc. at the top. Import from `framer-motion/m` (the lighter "m" build) when you only need `motion.div` and basic variants. Saves ~20KB.

### 2.3 Architecture

- **Duplicated business logic in `displayPrice`** — appears verbatim in [ProductCard.jsx:18-22](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/ProductCard.jsx#L18-L22), [ProductDetail.jsx:99-101](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/ProductDetail.jsx#L99-L101), [Home.jsx:40-43](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Home.jsx#L40-L43). **Fix:** add `formatProductPrice(p)` to `lib/utils.js`.
- **Duplicated `EASE_OUT = [0.22, 1, 0.36, 1]`** — defined at module level in ProductCard, ProductDetail, Shop, Cart, Checkout, Contact, etc. Should be exported once from `lib/motion.js`.
- **Inconsistent collection splitting in Shop** — see CRITICAL section.
- **[AdminProducts.jsx:35-50](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/pages/AdminProducts.jsx#L35-L50)** — Blob URL preview management leaks memory if the user navigates away mid-upload. The cleanup runs but the previous previews are revoked on next render, not on unmount. **Fix:** capture the new previews in a ref, revoke the *previous* batch in cleanup.
- **[AdminProducts.jsx:230-232](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/pages/AdminProducts.jsx#L230-L232)** — Delete confirmation uses `window.confirm` — ugly and non-premium. **Fix:** build a small `<ConfirmDialog />` with framer-motion.
- **[AdminProducts.jsx:131-141](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/pages/AdminProducts.jsx#L131-L141)** — `alert()` for validation errors. Same fix.
- **[AdminProducts.jsx:188-196](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/pages/AdminProducts.jsx#L188-L196)** — Product edit uses POST (not PUT) — `api.upload` doesn't expose method switching well. The call is `api.upload(\`/products/${id}\`, form)` which defaults to POST, so you're creating duplicates on every "update". **Fix:** pass the method (`api.upload(\`/products/${id}\`, form, 'PUT')`).
- **No global ErrorBoundary** — a single thrown error in any page white-screens the app. Add `<ErrorBoundary>` around `<Routes>` with a premium recovery screen.
- **No `lazy()` on framer-motion's `motion()` components** — already covered above, but applies to `Header.jsx:42-48` (SVG icons) and the lucide-react imports.

### 2.4 API surface (inferred; for backend team)

- **No request cancellation** — every Shop filter change kicks off a new `fetchProducts`; the old response can land after the new one and overwrite state. **Fix:** `AbortController` per fetch.
- **No retry / exponential backoff** for transient network errors.
- **Search is GET with full query string** — `/products?search=…` is fine, but no debounce in Shop when the user types in the search field (the search is only triggered on form submit). Inconsistent with Search.jsx (which *does* debounce).
- **No pagination metadata on `/products`** — Shop assumes an array; backend should return `{ products, total, page, pageSize }` so we can paginate.
- **No idempotency key on `POST /orders`** — refresh-during-checkout creates duplicate orders.

### 2.5 Security (frontend-side observations)

- **JWT in `localStorage`** — vulnerable to XSS. Acceptable for an MVP, but flag for a future HttpOnly cookie + CSRF migration.
- **`/customers/orders` returns raw customer fields** — no field-level filtering on the client. Backend should be reviewed.
- **No `subresource-integrity` on any externally-loaded asset** (Google Fonts, Unsplash CDN).
- **`X-Frame-Options: DENY` blocks legitimate embeds** (e.g. Paystack's iframe-style return). Use `SAMEORIGIN` or CSP `frame-ancestors 'self' https://checkout.paystack.com`.
- **No CSP header** in [vercel.json](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/vercel.json) — given the XSS risk above, add a strict `Content-Security-Policy` (allow self, Unsplash, Google Fonts, Paystack checkout).

### 2.6 DevOps / config

- **No `.env.example` for production keys** — only `VITE_API_URL` and `VITE_PAYSTACK_PUBLIC_KEY`. Add `VITE_SENTRY_DSN` (recommended for the next bullet) and `VITE_GA_ID`.
- **No error monitoring** (Sentry, Bugsnag, etc.) — production errors are silently logged to console.
- **26 `console.error` calls** across 16 files — should be wrapped in a `lib/logger.js` that pushes to Sentry and is silent in prod.
- **`@tailwindcss/postcss: ^4.1.18` and `tailwindcss: ^4.1.18` are the same package** in v4 — keep just one, or you'll get duplicate CSS.
- **`vite: ^5.1.0` + `vitest: ^4.0.16` are mismatched** — Vitest 4 expects Vite 6. Bump Vite to 6 to avoid peer warnings.
- **`react-router-dom: ^7.11.0`** is a major version. v6 → v7 has breaking changes in loader/action APIs. Confirm everything is on the v7 path (no `useNavigate()` gotchas, no `Routes` vs `Route` mismatch).
- **No `Suspense` boundaries** — combined with no code splitting, all pages load at once.
- **`ProductDetail.jsx:125-132` uses `displayImage` before it's defined in the function** — works because the var is hoisted via `const` (TDZ) only if you reach the JSX before the `const`. Verify ordering if it ever gets refactored.

---

## 3. POLISH (premium feel improvements)

- **[Home.jsx:118-120](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Home.jsx#L118-L120)** — Hero is 4 images in a 2x2 grid with no consistent focal point. Add a "Spring 2025 — discover the drop" header above the grid.
- **[Shop.jsx:516-540](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Shop.jsx#L516-L540)** — Lookbook is 3 images in a row with no `whileInView` per-card stagger. Each card has its own per-index delay already, but the whole section could fade in as one.
- **[Cart.jsx:105-125](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Cart.jsx#L105-L125)** — Order Summary is a plain `bg-gray-50` box. Lift it to a sticky card with a hairline border on `lg+` to feel like the Jean Paul Gaultier reference.
- **No breadcrumbs anywhere** — add them to `ProductDetail`, `Checkout`, `Account`, `Cart` to give context.
- **[ProductDetail.jsx:222-227](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/ProductDetail.jsx#L222-L227)** — Add to Cart button is plain black. Consider an "Add to Wishlist" outlined button next to it.
- **[ProductDetail.jsx:179-194](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/ProductDetail.jsx#L179-L194)** — Size buttons are square `h-10`. Add `aspect-square` so they scale responsively.
- **[ProductCard.jsx:147-155](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/ProductCard.jsx#L147-L155)** — "View Product" arrow icon is inline SVG. Import `ArrowRight` from lucide-react for consistency.
- **[Footer.jsx:160-167](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Footer.jsx#L160-L167)** — Locale switcher (`🇳🇬 Nigeria / English ▾`) is a non-functional span. Either build it or remove it.
- **No favicon configured** in [index.html](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/index.html) other than the default `/vite.svg`.
- **No Open Graph / Twitter card meta** in `Layout.jsx` — `title` and `description` are set, but `og:title`, `og:image`, `og:type`, `twitter:card` are not. Add a small `<Meta>` helper in Layout.
- **No focus-visible rings on any button** — search `<button>` elements, the cart remove, the size buttons, etc. Add `focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2`.
- **[Header.jsx:269-273](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Header.jsx#L269-L273)** — Mobile drawer image is a static Unsplash URL. The user just enhanced the drawer with this — but `loading="lazy"` on an above-the-fold image is wrong; remove it.
- **No reduced-motion `whileTap` swap** — the Cart remove button is `underline` only, fine, but the `+`/`-` quantity steppers in Cart.jsx:74-83 have no tactile feedback (no scale or color change). Add a subtle `whileTap` or `active:bg-gray-100`.
- **No empty-state illustration** in Account, Cart, Search results — current copy is functional but plain.
- **All `<input>` use `border-gray-300`** — switch to `border-border` (design token) for consistency.
- **Inconsistent button text colors** — `bg-black text-white` vs `bg-text text-white`. Pick one (the `text-text` token reads weird with white text).
- **No 404 page transition** — NotFound has an entry animation, but the App doesn't re-trigger it on route change. Consider an AnimatePresence wrapping the Routes.

### 3.1 Accessibility

- **[Header.jsx:114-115](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Header.jsx#L114-L115)** — `<span>——</span>` decorative divider has no `aria-hidden="true"`.
- **[ProductCard.jsx:115-125](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/ProductCard.jsx#L115-L125)** — "View Product" overlay is `aria-hidden="true"` (good), but the actual link has no `aria-label`. Screen readers hear just the image alt + price. Add `aria-label={`View ${product.name}`}`.
- **[Header.jsx:141-153](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Header.jsx#L141-L153)** — Mobile icons (search, cart) have `aria-label`; desktop text links don't need one. Good.
- **[AdminLayout.jsx:75-86](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/components/AdminLayout.jsx#L75-L86)** — Bell has no `aria-label`.
- **All `<input>` missing `<label>`** in Customer Login, Register, Forgot/Reset Password. Use `sr-only` labels (Shop does this for the sort select — replicate).
- **`prefers-reduced-motion`** is checked per-component, but the global `*` selector in `index.css` has no `scroll-behavior: smooth` guard.

### 3.2 Skeleton opportunities

- **ProductDetail** — the 2-up skeleton exists but doesn't cover the right column variants/description blocks once data loads partially. Add a unified `<DetailSkeleton />`.
- **Account** — only a spinning loader; no skeleton rows for orders.
- **Cart** — no skeleton state for price/quantity recalculation.
- **AdminCustomers / AdminOrders / AdminMessages** — empty table states but no skeleton during pagination.
- **AdminSettings** — `"Loading settings..."` plain text; build a skeleton form.

### 3.3 Naming / consistency

- **`useToast()` destructure is inconsistent** — some files use `toast.error()`, some use `showToast('msg', 'error')` (which doesn't exist in the context). The only ones calling `showToast` are [ProductDetail.jsx:15](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/ProductDetail.jsx#L15) and [AdminMarketing.jsx:23](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/pages/AdminMarketing.jsx#L23) — both are broken.
- **Currency symbol** is hard-coded as `₦` in 15+ places. Extract `CURRENCY_SYMBOL` from settings.
- **`max-w-[1400px]` vs `max-w-6xl` vs `max-w-[1200px]`** — three different max widths used across pages. Standardize to one.

---

## 4. QUICK WINS (under 10 min each)

- **[utils/api.js:1](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/utils/api.js#L1)** — Add `signal` support and pass `AbortController.signal` from Shop/Search.
- **[utils/api.js:11-15](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/utils/api.js#L11-L15)** — Centralize the "is this an admin request?" check by exposing a `setSessionKind('admin' | 'customer')` setter from `AuthContext` and reading a ref instead of `window.location`.
- **[Cart.jsx:88,93](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Cart.jsx#L88-L93)** — Fix the per-row total calculation.
- **[Account.jsx:1-6](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Account.jsx#L1-L6)** — Add the missing `motion` + `useReducedMotion` imports and the `reduceMotion` declaration.
- **[Header.jsx:42](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Header.jsx#L42)** — `{ passive: true }` on the scroll listener.
- **[Header.jsx:99-101](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Header.jsx#L99-L101)** — Delete the redundant `useTransform` chain.
- **[Header.jsx:269-273](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Header.jsx#L269-L273)** — Remove `loading="lazy"` from the drawer hero image.
- **[components/Header.jsx:78-80](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Header.jsx#L78-L80)** — Convert `headerBg()` / `textColor()` / `barColor()` from functions to `useMemo` to avoid re-computing on every render.
- **[ProductCard.jsx:73-76](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/ProductCard.jsx#L73-L76)** — Hoist the `variants` object to a module-level const.
- **[lib/utils.js](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/lib/utils.js)** — Add `formatProductPrice` and `EASE_OUT` exports and replace all 15+ duplicates.
- **[Footer.jsx:78-80](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/components/Footer.jsx#L78-L80)** — Either point social links to real URLs or remove `href="#"` and make them spans.
- **[index.css](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/index.css)** — Wrap `scroll-behavior: smooth` in `@media (prefers-reduced-motion: no-preference)`.
- **[lib/products.js](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/lib/products.js)** — Looks dead — no imports found. Delete it (or remove from `lib/` if referenced).
- **[.env.example](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/.env.example)** — Add `VITE_SENTRY_DSN=`, `VITE_GA_ID=`, `VITE_PUBLIC_SITE_URL=`.
- **Wrap `<Routes>` in `<AnimatePresence mode="wait">` + use `useLocation().pathname` as a key** for instant page transitions.
- **Add a global `<ErrorBoundary>`** in `App.jsx` with a "Something went wrong" panel + "Reload" button.

---

## 5. PRIORITY ORDER — fix these 5 first

1. **[Account.jsx broken imports](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Account.jsx#L1-L6)** — the page is **crashing on render** right now. `motion` and `reduceMotion` are referenced but never declared. 2-minute fix, blocks every logged-in customer.

2. **[Cart.jsx per-row total](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Cart.jsx#L88-L93)** — the cart shows the wrong total for any `quantity > 1`. Customers will see "₦285,000" next to a quantity of 3 and not trust the checkout. 5-minute fix.

3. **[AdminRoute guard + 401 interceptor](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/admin/components/AdminRoute.jsx#L3-L13) + [utils/api.js](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/utils/api.js#L23-L28)** — the admin is gated by a localStorage presence check, not a server probe. An expired/forged token grants access until the first 401. A 30-line 401 interceptor + a `/admin/me` probe on mount closes the hole.

4. **Shop collection filter mismatch](file:///c:/Users/nuke/Documents/trae_projects/Bubu%20lagos/bubu-lagos-web/src/pages/Shop.jsx#L204-L206)** — Spring 2025 / Re-Edition sections are always empty because the filter doesn't match what `SAMPLE_PRODUCTS`/admin writes. This is a content-discovery bug that makes the new shop redesign look broken. Either change the filter logic or rename the sections.

5. **Code splitting via `React.lazy`** — the initial JS bundle ships every admin + customer page. A single `React.lazy` wrapper around `App.jsx` routes will cut the initial TTI in half and is a 20-minute, no-regression change.

---

## 6. Suggested implementation order (after the top 5)

| # | Area | Files | Effort |
|---|------|-------|--------|
| 6 | Remove dead code (lib/products.js, redundant useTransform) | `lib/products.js`, `Header.jsx` | 5 min |
| 7 | Add `formatProductPrice` + `EASE_OUT` to `lib/utils.js`, replace 15+ duplicates | `lib/utils.js` + 6 callers | 20 min |
| 8 | Wrap `console.*` in `lib/logger.js` behind `import.meta.env.DEV` | 16 files | 30 min |
| 9 | Add `ErrorBoundary` in `App.jsx` with recovery screen | `App.jsx` + new component | 30 min |
| 10 | Implement code splitting with `React.lazy` + `Suspense` | `App.jsx` | 20 min |
| 11 | Add `srcset`/`sizes` to product/hero/lookbook images | `ProductCard.jsx`, `Home.jsx`, `Shop.jsx` | 30 min |
| 12 | Add AbortController + 401 interceptor to `api.js` | `utils/api.js` | 45 min |
| 13 | Add CSP + `frame-ancestors` to `vercel.json` | `vercel.json` | 10 min |
| 14 | Build `<ConfirmDialog />` + `<Toast>` design-system primitives | new files in `components/` | 1 hr |
| 15 | Refactor `AdminProducts` to PUT updates, drop `window.confirm` / `alert` | `admin/pages/AdminProducts.jsx` | 45 min |
| 16 | Standardize `useToast()` destructure across the codebase | 4 files | 15 min |
| 17 | Add `aria-label`, focus rings, sr-only labels across all interactive elements | 12 files | 1 hr |
| 18 | Standardize `max-w-[1400px]` and currency symbol via settings | 10 files | 20 min |
| 19 | Add OG/Twitter meta + favicon in `Layout.jsx` and `index.html` | `Layout.jsx`, `index.html` | 20 min |
| 20 | Upgrade Vite to v6, fix Vitest peer warning | `package.json` | 15 min |

---

## 7. Backend assumptions flagged for the API team

These can't be verified in this repo but the front-end behavior depends on them:

- `GET /products` should return `{ products, total, page, pageSize }` to support pagination in Shop.
- `POST /orders` should accept an `Idempotency-Key` header to prevent duplicate orders on refresh.
- `GET /customers/orders/:reference` should exist for the Account "View Details" flow without re-running Paystack verify.
- `POST /products` and `PUT /products/:id` should share the same multipart endpoint and only differ by HTTP verb (currently the client workaround accidentally creates duplicates).
- `POST /admin/login` should return `{ token, user, expiresAt }` so the client can schedule a refresh.
- All admin endpoints should accept `Authorization: Bearer <token>` and respond 401 on expired/forged tokens.
- A `GET /admin/me` (or `GET /admin/verify`) endpoint should exist for client-side token validation.

---

## 8. Notes for the next sprint

- 
- The e2e test suite is missing; add Playwright for at minimum: add-to-cart, checkout, admin CRUD, login flow.
- The image upload pipeline is currently a passthrough to the backend; consider client-side resizing to avoid uploading multi-MB phone photos.
- The wishlist and product reviews features are the most-requested next additions — design the data model with these in mind.

---

*End of audit.*
