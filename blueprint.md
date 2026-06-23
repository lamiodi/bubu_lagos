# Project Blueprint: Bubu Lagos

## 1. Project Overview
Bubu Lagos is a premium digital boutique dedicated to the modern woman who values the intersection of unrestricted comfort and high-society style. The brand specializes in the **Bubu silhouette** — a garment synonymous with African grace — reimagined through contemporary textiles, intricate hand-beading, and architectural draping.

The product is a full-stack e-commerce experience that ships as two deployable units:

- **Customer storefront** (`bubu-lagos-web/`) — a public-facing React SPA for browsing, account management, checkout, and order tracking.
- **Admin back-office** (also under `bubu-lagos-web/src/admin/`) — a role-gated React SPA for product/customer/order/marketing management.

The backend is a separate Node.js service hosted on Render, backed by Supabase (Postgres) for data and Supabase Storage for product images.

---

## 2. Tech Stack

### Storefront / Admin (single Vite app)
- **Framework:** React 18 + Vite 5 (JSX, no TypeScript)
- **Routing:** `react-router-dom` v7 (BrowserRouter)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) + `clsx` + `tailwind-merge` (via `cn()` helper)
- **Animation:** `framer-motion` v12 (page entry, scroll-triggered reveals, shared layouts, custom cursor)
- **Icons:** `lucide-react`
- **Charts (admin):** `recharts`
- **State:** React Context (`AuthContext`, `CartContext`, `ToastContext`) + `localStorage` persistence
- **Testing:** Vitest + Testing Library + jsdom
- **Linting:** ESLint 8 with `eslint-plugin-react` and `react-hooks`
- **Hosting:** Vercel (`vercel.json` rewrites `/api/*` → Render backend, SPA fallback for everything else)

### Backend (separate service, not in this repo)
- Node.js (Express) on Render
- Postgres via Supabase pooler
  - `DATABASE_URL=postgresql://postgres.watczlogntkpxvkehjpa:Wodibenuah%402024@aws-1-eu-central-1.pooler.supabase.com:6543/postgres`
- File/image storage: Supabase Storage (served via backend `/uploads/...`)
- Email: Resend (transactional: order confirmations, password reset, contact)
- Payments: Paystack (redirect → `/payment/verify?reference=...`)

### Environment variables
- `VITE_API_URL` — base URL of the backend (defaults to `http://localhost:5000/api`). The frontend strips `/api` to build image URLs.

---

## 3. Features

### Storefront (customer-facing)
- [x] Home: 2x2 hero product mosaic with staggered reveal + category eyebrow + name/price caption
- [x] Home: horizontal-snap product carousel on mobile, 2/4-col grid on `sm`/`lg`
- [x] Home: "Atelier" CTA strip
- [x] Shop: filter chips (View All, Dresses, Tops, Knitwear, Skirts, Trousers, Jackets, Denim, Coats, Swimwear, Accessories) with shared `layoutId` underline
- [x] Shop: search, sort, min/max price, mobile filters sheet, pagination
- [x] Shop: lookbook editorial row
- [x] Product detail: variant picker, image gallery, "View Product" hover, related products
- [x] Cart: line-item quantity stepper, totals, Paystack redirect
- [x] Checkout: contact + shipping form, gift card + coupon fields, newsletter opt-in
- [x] Payment verify: polls backend `/orders/verify/:reference` then clears cart
- [x] Auth: login / register / forgot-password / reset-password (token from URL)
- [x] Account: order history tabs (orders + profile)
- [x] Search: debounced query against `/products?search=...`
- [x] Contact: form posts to `/contact` and renders MapPin/Phone/Mail info
- [x] 404 page with motion entry
- [x] Toast system (success/error/info/warning, 5s auto-dismiss)
- [x] Sticky transparent navbar (top: `bg-white/10 backdrop-blur-md`; on scroll: `bg-white shadow-sm`); mobile drawer with hero image, search, account, and CTA
- [x] Footer: 4-column links, newsletter form (POST `/marketing/subscribe`), social links
- [x] Graceful degradation: every list view seeds with `SAMPLE_PRODUCTS` so the UI renders even if the API is down

### Admin back-office (`/admin`)
- [x] Separate login at `/admin/login` (token stored as `adminToken` / `adminUser`)
- [x] `AdminRoute` guard: redirects to `/admin/login` when token missing
- [x] Admin shell with collapsible sidebar (lucide icons)
- [x] Dashboard: KPI cards (revenue, orders, customers, conversion) + recharts area chart + recent orders
- [x] Products: list with search, pagination, create/edit modal (with image upload), delete
- [x] Orders: status filters, paginated list, detail modal
- [x] Customers: paginated list, detail modal with contact + order history
- [x] Messages: paginated inbox of contact-form submissions
- [x] Marketing: coupons + gift cards tabs (CRUD)
- [x] Settings: store name/email/phone/address, currency, shipping fee

### Cross-cutting
- [x] API client in `src/utils/api.js` auto-attaches `Bearer` token (uses `adminToken` for `/admin/*`, otherwise `authToken`)
- [x] Reduced-motion respected globally (`useReducedMotion` gates every framer-motion animation)
- [x] Sample data fallback (`SAMPLE_PRODUCTS`, `SAMPLE_CATEGORIES`, `FALLBACK_IMAGE`) so demo mode works offline
- [x] Security headers via `vercel.json` (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)

---

## 4. File Structure

```
Bubu lagos/
├── blueprint.md                       ← this file
└── bubu-lagos-web/                    ← Vite app (storefront + admin)
    ├── index.html
    ├── package.json                   (deps: react 18, react-router-dom 7, framer-motion 12, tailwindcss 4, lucide-react, recharts)
    ├── vite.config.js
    ├── vitest.config.js
    ├── postcss.config.js
    ├── tailwind.config (via @tailwindcss/postcss in index.css)
    ├── vercel.json                    (rewrites /api → Render, SPA fallback)
    ├── Dockerfile                     (alternative container deploy)
    ├── nginx.conf                     (alternative container deploy)
    ├── .env.example
    ├── .eslintrc.cjs
    ├── public/
    │   └── vite.svg
    └── src/
        ├── main.jsx                   (ReactDOM root + <BrowserRouter>)
        ├── App.jsx                    (Routes + provider stack)
        ├── App.css
        ├── index.css                  (Tailwind + @theme tokens + shimmer keyframes)
        ├── setupTests.js
        │
        ├── components/                (shared storefront components)
        │   ├── Layout.jsx             (Header + main + Footer; sets <title>)
        │   ├── Header.jsx             (sticky navbar: transparent+blur → solid white; mobile drawer with hero image)
        │   ├── Footer.jsx             (4-col links + newsletter form, bg-black text-white)
        │   ├── ProductCard.jsx        (shared card: image, eyebrow, hover overlay, custom cursor, price count-up)
        │   ├── ProductCardSkeleton.jsx (skewed shimmer skeleton)
        │   └── Header.test.jsx
        │
        ├── pages/                     (storefront routes)
        │   ├── Home.jsx               (hero mosaic + featured products carousel + atelier CTA)
        │   ├── Shop.jsx               (filters + grid + lookbook)
        │   ├── ProductDetail.jsx
        │   ├── Cart.jsx
        │   ├── Checkout.jsx
        │   ├── PaymentVerify.jsx
        │   ├── Search.jsx
        │   ├── Contact.jsx
        │   ├── Login.jsx              (login + register modes)
        │   ├── ForgotPassword.jsx
        │   ├── ResetPassword.jsx
        │   ├── Account.jsx
        │   └── NotFound.jsx
        │
        ├── admin/                     (admin back-office)
        │   ├── components/
        │   │   ├── AdminLayout.jsx    (sidebar shell + topbar + logout)
        │   │   └── AdminRoute.jsx     (token guard)
        │   └── pages/
        │       ├── AdminLogin.jsx
        │       ├── Dashboard.jsx      (KPIs + recharts area chart)
        │       ├── AdminProducts.jsx
        │       ├── AdminOrders.jsx
        │       ├── AdminCustomers.jsx
        │       ├── AdminMessages.jsx
        │       ├── AdminMarketing.jsx (coupons + gift cards)
        │       └── AdminSettings.jsx
        │
        ├── context/
        │   ├── AuthContext.jsx        (customer session: authToken + customer in localStorage)
        │   ├── CartContext.jsx        (cart items in localStorage, add/remove/update/clear, totals)
        │   └── ToastContext.jsx       (toast queue + ToastContainer)
        │
        ├── lib/
        │   ├── utils.js               (cn() + getImageUrl())
        │   ├── products.js            (legacy PRODUCTS array)
        │   └── sampleProducts.js      (SAMPLE_PRODUCTS, SAMPLE_CATEGORIES, FALLBACK_IMAGE, hero helpers)
        │
        ├── utils/
        │   └── api.js                 (fetch wrapper, get/post/put/delete + upload)
        │
        ├── assets/
        │   └── react.svg
        │
        └── test/
            ├── setup.js               (jsdom + jest-dom)
            ├── AuthContext.test.jsx
            ├── CartContext.test.jsx
            └── ToastContext.test.jsx
```

---

## 5. Design System (Tailwind v4 `@theme` in `src/index.css`)

```css
@theme {
  --color-primary: #000000;
  --color-secondary: #ffffff;
  --color-text: #000000;
  --color-text-light: #666666;
  --color-background: #ffffff;
  --color-background-light: #f5f5f5;
  --color-border: #e0e0e0;
  --color-hover: #333333;
  --color-accent: #0F3D2E;        /* forest green */
  --color-accent-strong: #1F4D3A;

  --font-primary: "Comfortaa", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-heading: "Nixie One", "Bebas Neue", "Impact", sans-serif;
}
```

Custom utilities / keyframes:
- `.scrollbar-hide` — hides horizontal scrollbar (used by mobile product carousel)
- `.shimmer-light` / `.shimmer-dark` — animated skeleton shimmer (1.6s linear)
- `.cursor-image-track` — product card hover cursor follower
- `@utility container` — max 1400px, centered, 1rem gutter

---

## 6. Routing

### Public (storefront)
| Path | Page | Header variant |
|------|------|----------------|
| `/` | Home | `transparent` |
| `/shop` | Shop | `solid` |
| `/product/:id` | ProductDetail | `solid` |
| `/search` | Search | `solid` |
| `/contact` | Contact | `solid` |
| `/cart` | Cart | `solid` |
| `/checkout` | Checkout | `solid` |
| `/payment/verify` | PaymentVerify | `solid` |
| `/login` | Login | `solid` |
| `/forgot-password` | ForgotPassword | `solid` |
| `/reset-password` | ResetPassword | `solid` |
| `/account` | Account | `solid` |
| `*` | NotFound | `solid` |

### Admin (token-gated)
| Path | Page |
|------|------|
| `/admin/login` | AdminLogin (public) |
| `/admin` | Dashboard |
| `/admin/products` | AdminProducts |
| `/admin/orders` | AdminOrders |
| `/admin/messages` | AdminMessages |
| `/admin/customers` | AdminCustomers |
| `/admin/marketing` | AdminMarketing |
| `/admin/settings` | AdminSettings |

Provider stack: `ToastProvider` → `AuthProvider` → `CartProvider` → `<Routes>`.

---

## 7. Data Flow

1. **Auth (customer):** `localStorage.authToken` + `localStorage.customer`. `AuthContext` exposes `{ customer, isAuthenticated, login, logout, updateCustomer }`. Backend endpoints hit: `POST /customers/login`, `POST /customers/register`, `POST /customers/forgot-password`, `POST /customers/reset-password`, `GET /customers/orders`.
2. **Cart:** persisted in `localStorage.cart`. `CartContext` exposes `{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal }`.
3. **Toasts:** `useToast()` returns `{ success, error, info, warning }`. Toasts auto-dismiss after 5s; `<ToastContainer />` is mounted once at the provider level.
4. **API client:** `src/utils/api.js`. Sends `Authorization: Bearer <token>` when present. Picks `adminToken` for `/admin/*` calls, otherwise `authToken`. Wraps `fetch` and throws on non-OK with `error.status` and `error.data` for granular handling.
5. **Images:** `getImageUrl(path)` in `lib/utils.js` — if absolute URL, return as-is; otherwise prepend the backend origin (stripped of `/api`).

---

## 8. Backend Surface (consumed by this app)

Assumed REST endpoints (not in this repo):

**Storefront**
- `GET /products`, `GET /products/:id`
- `GET /categories`
- `POST /customers/register`, `POST /customers/login`, `POST /customers/forgot-password`, `POST /customers/reset-password`
- `GET /customers/orders`
- `POST /orders` (creates Paystack order)
- `GET /orders/verify/:reference`
- `POST /contact`
- `POST /marketing/subscribe`
- `POST /gift-cards/validate`, `POST /coupons/validate`

**Admin**
- `POST /admin/login`
- `GET /admin/dashboard/stats`
- `GET /admin/products`, `POST /admin/products`, `PUT /admin/products/:id`, `DELETE /admin/products/:id`
- `GET /admin/orders`, `GET /admin/orders/:id`
- `GET /admin/customers`, `GET /admin/customers/:id`
- `GET /admin/messages`, `GET /admin/messages/:id`
- `GET/POST/PUT/DELETE /admin/coupons`
- `GET/POST/PUT/DELETE /admin/gift-cards`
- `GET /admin/settings`, `PUT /admin/settings`

---

## 9. Scripts

```bash
cd bubu-lagos-web
npm install
npm run dev          # Vite dev server
npm run build        # production build → dist/
npm run preview      # preview production build
npm run lint         # ESLint
npm test             # Vitest (jsdom)
npm run test:watch
```

---

## 10. Conventions

- All new components live under `src/components` (shared) or `src/pages` (route-level). Admin-only UI lives under `src/admin`.
- Page-level animations wrap content in `<motion.section>` with `whileInView` + `viewport={{ once: true, margin: '-80px' }}`.
- Always check `useReducedMotion()` and short-circuit animations when true.
- Lists that may be empty should still render useful UI; use `SAMPLE_PRODUCTS` from `lib/sampleProducts.js` as the offline fallback.
- Use `cn(...)` from `lib/utils.js` for conditional Tailwind classes.
- Use the `api` client from `utils/api.js` for all HTTP — never call `fetch` directly from a component.
- Use `useToast()` for user-facing feedback on async actions.

---

## 11. Out of Scope / TODO

- [ ] Migrate from JSX to TypeScript
- [ ] Add e2e tests (Playwright/Cypress) — currently only unit tests via Vitest
- [ ] Image optimization pipeline (current code relies on Unsplash CDN URLs; admin uploads go straight to backend)
- [ ] Wishlist / favorites
- [ ] Product reviews
- [ ] Multi-currency / multi-language
- [ ] Real-time order status updates (websocket/SSE)
