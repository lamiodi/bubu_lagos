# Project Blueprint: Bubu Lagos

## 1. Project Overview
Bubu Lagos is a premium digital boutique dedicated to the modern woman who values the intersection of unrestricted comfort and high-society style. The brand specializes in the **Bubu silhouette** — a garment synonymous with African grace — reimagined through contemporary textiles, intricate hand-beading, and architectural draping.

The project is a full-stack e-commerce solution shipping from a unified repository containing two primary components:

- **Customer Storefront & Admin Back-office** (`bubu-lagos-web/`) — a public-facing React SPA for customer browsing, account management, checkout, and order tracking, alongside a role-gated admin control panel under `/admin`.
- **Backend API Service** (`backend/`) — a Node.js Express REST API backed by PostgreSQL (Supabase / Render Postgres) for relational data, Cloudinary & local storage for product media, Resend for email notifications, and Paystack for payment processing.

Deployment orchestration is configured for Render via `render.yaml` (Static Site for frontend, Web Service for backend API, Managed PostgreSQL) with Vercel deployment support for frontend routing.

---

## 2. Tech Stack

### Storefront / Admin Frontend (`bubu-lagos-web/`)
- **Framework:** React 18 + Vite 5 (ES Modules / JSX)
- **Routing:** `react-router-dom` v7 (`BrowserRouter`)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) + `clsx` + `tailwind-merge` (via `cn()` helper)
- **Animation:** `framer-motion` v12 (page entry, scroll-triggered reveals, shared layouts, custom cursor follower)
- **Icons:** `lucide-react`
- **Charts (Admin):** `recharts`
- **State Management:** React Context (`AuthContext`, `CartContext`, `ToastContext`) + `localStorage` persistence
- **Testing:** Vitest + Testing Library + jsdom
- **Linting:** ESLint 8 with `eslint-plugin-react` and `react-hooks`
- **Hosting / Infra:** Vercel / Render Static (`vercel.json` rewrite `/api/*` → Render backend, SPA fallback for client-side routes)

### Backend API Service (`backend/`)
- **Runtime & Server:** Node.js (ES Modules `type: "module"`) with Express 4
- **Database:** PostgreSQL (via `pg` connection pool with SSL)
  - Raw SQL migration system with runner `npm run migrate` (`src/migrate.js` applying `migrations/001` through `migrations/017`)
- **Authentication & Security:**
  - JWT (`jsonwebtoken`) with secret key validation
  - Password hashing with `bcrypt`
  - Admin failed attempt tracking & lockout protection
  - `helmet` (HSTS, CORS security headers)
  - `express-rate-limit` (general API limiter + auth endpoint limiter)
  - `express-validator` for payload sanitization and validation
- **Media & File Storage:** Cloudinary (`cloudinary`, `multer`, `multer-storage-cloudinary`) with fallback local static server (`/uploads`)
- **Payment Processing:** Paystack integration (`paystack` SDK + `webhookRoutes.js` supporting HMAC SHA-512 signature verification)
- **Email Notifications:** Resend (`resend` SDK) for transactional emails (order confirmations, password resets, contact messages)
- **Background Tasks:** Automated cron job service (`src/services/cronService.js`) for expiring pending unpaid orders and restocking reserved inventory
- **Testing & Quality:** Vitest + Supertest + ESLint + Nodemon

### Environment Variables

#### Backend (`backend/.env`)
- `PORT` — Server port (default: `5000`)
- `NODE_ENV` — `development` | `production`
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Secret string for signing JSON Web Tokens
- `PAYSTACK_SECRET_KEY` & `PAYSTACK_PUBLIC_KEY` — Paystack API keys
- `RESEND_API_KEY` — API key for Resend email service
- `FROM_EMAIL` — Sender email address (e.g. `noreply@bubulagos.org`)
- `ADMIN_EMAIL` — Recipient email for contact form notifications
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — Cloudinary configuration
- `CORS_ORIGIN` — Allowed CORS origins (comma-separated)
- `FRONTEND_URL` — Base URL of the web frontend

#### Frontend (`bubu-lagos-web/.env`)
- `VITE_API_URL` — Base URL of the backend API (e.g. `http://localhost:5000/api` or production endpoint)

---

## 3. Features

### Storefront (Customer-Facing)
- [x] **Home:** 2x2 hero product mosaic with staggered reveal, category eyebrows, and price/caption details
- [x] **Home:** Horizontal snap product carousel for mobile, responsive 2/4-col grid for desktop
- [x] **Home:** "Atelier" brand heritage CTA section
- [x] **Shop:** Category filter chips with animated `layoutId` underline (New Arrivals, Signature Bubu, Hand-Beaded Collection, Best Sellers, Bubus, Turbans & Gelès, Artisan Accessories)
- [x] **Shop:** Real-time search, price range filtering, mobile filters drawer, and pagination
- [x] **Shop:** Editorial lookbook row integrating campaign imagery
- [x] **Product Detail:** Multi-image gallery, size/color variant picker, related products recommendation
- [x] **Cart:** Quantity adjustment stepper, subtotal/shipping calculation, gift card & coupon application
- [x] **Checkout:** Contact & shipping form, order notes, payment method selection with Paystack integration
- [x] **Payment Verification:** Polling/verification endpoint `/orders/verify/:reference` with automated cart clearing
- [x] **Customer Auth:** Registration, login, password reset request & token-based reset confirmation
- [x] **Customer Account:** Order history with status tracking and user profile management
- [x] **Contact:** Form posting to `/api/contact` with location, email, and telephone details
- [x] **Notifications:** Global auto-dismissing Toast notification system (success, error, info, warning)
- [x] **Navigation:** Sticky glassmorphism header (transparent on top → solid on scroll), mobile navigation drawer
- [x] **Offline / Fallback Mode:** Graceful degradation seeding views with `SAMPLE_PRODUCTS` if backend API is unreachable

### Admin Back-Office (`/admin`)
- [x] **Authentication:** Dedicated login at `/admin/login` with JWT storage and `AdminRoute` security guard
- [x] **Dashboard:** Executive KPI overview (Revenue, Orders, Customers, Conversion), Recharts sales trend chart, and recent orders table
- [x] **Product Management:** Searchable/paginated list, single-product create/edit modal with Cloudinary image upload, bulk product CSV import (`POST /api/products/bulk`), deletion
- [x] **Order Fulfillment:** Status filtering, order details modal, tracking carrier and tracking number assignment (`PUT /api/admin/orders/:id/tracking`)
- [x] **Customer Directory:** Customer list with search, contact details, and full order history
- [x] **Message Inbox:** Contact form submissions inbox with read/unread status
- [x] **Marketing Tools:** Coupon codes and Gift Card generator with usage tracking (CRUD)
- [x] **Settings:** Store info configuration (name, support email, phone, shipping fees, currency settings)

### Backend API Services
- [x] **RESTful API Structure:** Clean controller/route separation for all resources
- [x] **Database Schema Migrations:** 17 SQL migration scripts handling schemas, indexing, guest checkouts, unique payment references, and data integrity
- [x] **Webhook Integration:** Paystack webhook listener (`/api/webhooks/paystack`) verifying HMAC signatures for automated payment reconciliation
- [x] **Cloudinary Storage Service:** Direct image upload middleware supporting Cloudinary cloud hosting with local disk fallback
- [x] **Email Dispatch:** Transactional template emails for order confirmations, password reset tokens, and contact messages via Resend
- [x] **Rate Limiting & Protection:** IP-based request throttling on general and sensitive auth routes
- [x] **Health Check Endpoint:** `/api/health` providing real-time diagnostics on uptime, DB pool connection stats, Cloudinary, and Paystack integration status

### Product Taxonomy Architecture: Categories vs. Collections
The platform decouples product physical type definitions (**Categories**) from merchandising and marketing groups (**Collections**).

#### 1. Core Principles & Relationships
- **Categories (What a product IS):** Represents the physical product classification in the database. Each product belongs to **ONE** category (1-to-many).
  - **Bubus** (`bubus`) — Classic, signature, and occasion Bubu gowns & silhouettes
  - **Turbans & Gelès** (`turbans`) — Handcrafted crown headwraps, gelès, and hairwear
  - **Artisan Accessories** (`accessories`) — Artisan coral jewelry, leather totes, belts, and boutique accessories

- **Collections (How products are PRESENTED / Merchandised):** Dynamic marketing groupings. A product can belong to **MULTIPLE** collections via a many-to-many junction table (`product_collections`).
  - **New Arrivals** (`new-arrivals`) — Fresh atelier releases & new drapes
  - **Signature Bubu** (`signature-bubu`) — Core iconic Bubu silhouettes
  - **Hand-Beaded Collection** (`hand-beaded-collection`) — Intricate crystal & glass embellished pieces
  - **Best Sellers** (`best-sellers`) — Top customer favorites & atelier classics

#### 2. Database Schema (`backend/migrations/019_categories_and_collections_architecture.sql`)
- `categories`: `id`, `name`, `slug`, `description`, `created_at`
- `collections`: `id`, `name`, `slug`, `description`, `banner_url`, `accent_color`, `display_order`, `created_at`
- `product_collections`: `product_id`, `collection_id` (Primary Key: `(product_id, collection_id)`)

#### 3. Full-Stack Implementation Mechanics
- **Backend API (`productController.js`):** 
  - **Fetching:** `GET /api/products` performs a `LEFT JOIN` on `product_collections` and `collections`, using PostgreSQL's `json_agg()` to embed an array of collection objects (with `id`, `name`, `slug`) directly into each product.
  - **Creating/Updating:** The endpoint accepts an array of `collectionIds`. It saves the product, clears any old mappings in `product_collections`, and bulk-inserts the new mappings.
  - **Filtering:** Accepts `?collection=slug` query parameter to filter the product catalog dynamically via a SQL `WHERE` clause joining the collections table.
- **Frontend Admin Dashboard (`AdminProducts.jsx`):** 
  - **Upload Form:** Renders collections as a checklist (multi-select), converting selections into an array of IDs attached to the `FormData` payload.
  - **CSV Bulk Import/Export:** Dedicated `Collections` column handles semicolon-separated collection names (e.g., `New Arrivals; Best Sellers`). The parser matches strings against active database records to resolve the correct `collectionIds` for bulk API submission.
- **Storefront Merchandising (`Shop.jsx`):** Collections function purely as merchandising filters (e.g., routing to `/shop?collection=signature-bubu`), keeping core inventory categories stable while allowing flexible marketing campaigns.

---

## 4. Repository Directory Structure

```
Bubu lagos/
├── blueprint.md                       ← Project Master Blueprint
├── improvement.md                     ← Implementation & Polish History
├── render.yaml                        ← Render Blueprint deployment specification
├── docker-compose.yml                 ← Local multi-container development configuration
│
├── backend/                           ← Node.js Express REST API Service
│   ├── Dockerfile
│   ├── package.json                   (express, pg, bcrypt, jsonwebtoken, paystack, resend, cloudinary, multer, helmet, express-rate-limit)
│   ├── vitest.config.js
│   ├── .eslintrc.json
│   ├── migrations/                    (Raw SQL schema migration files 001 - 017)
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_customers.sql
│   │   ├── ...
│   │   └── 017_admin_lockout_and_drop_order_customer.sql
│   └── src/
│       ├── index.js                   (Express application entry point & server setup)
│       ├── db.js                      (PostgreSQL pool configuration & health stats)
│       ├── migrate.js                 (Migration runner script)
│       ├── config/                    (Cloudinary, Paystack, Resend configurations)
│       ├── controllers/               (Product, Order, Customer, Admin, Marketing, etc.)
│       ├── middleware/                (auth.js, adminAuth.js, rateLimiters.js, errorHandler.js)
│       ├── routes/                    (API route definitions for all endpoints)
│       ├── services/                  (cronService.js, emailService.js, paystackService.js)
│       ├── uploads/                   (Local image upload destination fallback)
│       └── utils/                     (Logger, validators, helpers)
│
└── bubu-lagos-web/                    ← Vite React Single Page Application (Storefront + Admin)
    ├── package.json                   (react 18, react-router-dom 7, framer-motion 12, tailwindcss 4, lucide-react, recharts)
    ├── vite.config.js
    ├── vitest.config.js
    ├── vercel.json                    (API proxy rewrites + SPA fallback configuration)
    ├── index.html
    └── src/
        ├── main.jsx                   (React root + BrowserRouter)
        ├── App.jsx                    (Route declarations & global providers)
        ├── index.css                  (Tailwind CSS v4 + @theme design tokens)
        ├── components/                (Storefront UI: Header, Footer, Layout, ProductCard, etc.)
        ├── pages/                     (Storefront routes: Home, Shop, ProductDetail, Cart, Checkout, etc.)
        ├── admin/                     (Admin pages & components: Dashboard, AdminProducts, AdminOrders, etc.)
        ├── context/                   (AuthContext, CartContext, ToastContext)
        ├── utils/                     (api.js fetch client wrapper)
        └── lib/                       (utils.js, sampleProducts.js fallback data)
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
  --color-accent: #0F3D2E;        /* Forest green accent */
  --color-accent-strong: #1F4D3A;

  --font-primary: "Comfortaa", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-heading: "Nixie One", "Bebas Neue", "Impact", sans-serif;
}
```

Custom utilities & keyframes:
- `.scrollbar-hide` — suppresses horizontal scrollbars in touch carousels
- `.shimmer-light` / `.shimmer-dark` — animated skeleton loading states (1.6s linear iteration)
- `.cursor-image-track` — custom floating cursor follower on product hover
- `@utility container` — max width 1400px, centered layout, responsive padding

---

## 6. Route Registry

### Public Storefront Routes (`bubu-lagos-web`)
| Path | Component | Header Style | Description |
|------|-----------|--------------|-------------|
| `/` | `Home` | `transparent` | Hero mosaic, curated carousel, heritage story |
| `/shop` | `Shop` | `solid` | Product catalog, filter chips, search, price range |
| `/product/:id` | `ProductDetail` | `solid` | Gallery, variant selector, related items |
| `/search` | `Search` | `solid` | Dedicated product search experience |
| `/contact` | `Contact` | `solid` | Store contact info & message dispatch form |
| `/cart` | `Cart` | `solid` | Line items summary, coupon/gift card redemption |
| `/checkout` | `Checkout` | `solid` | Customer details, shipping address, Paystack flow |
| `/payment/verify` | `PaymentVerify` | `solid` | Payment verification polling & success state |
| `/login` | `Login` | `solid` | Customer login & registration tabs |
| `/forgot-password` | `ForgotPassword` | `solid` | Password reset request form |
| `/reset-password` | `ResetPassword` | `solid` | Token password reset submission |
| `/account` | `Account` | `solid` | Customer order history & account details |
| `*` | `NotFound` | `solid` | 404 Error page with animated recovery options |

### Admin Back-Office Routes (`/admin`)
| Path | Component | Auth Guard | Functionality |
|------|-----------|------------|---------------|
| `/admin/login` | `AdminLogin` | Public | Staff authentication form |
| `/admin` | `Dashboard` | `AdminRoute` | Analytics, KPI cards, trend charts |
| `/admin/products` | `AdminProducts` | `AdminRoute` | Product CRUD & Bulk CSV import |
| `/admin/orders` | `AdminOrders` | `AdminRoute` | Order management & fulfillment tracking |
| `/admin/customers` | `AdminCustomers` | `AdminRoute` | Customer profiles & order histories |
| `/admin/messages` | `AdminMessages` | `AdminRoute` | Contact message inbox management |
| `/admin/marketing` | `AdminMarketing` | `AdminRoute` | Coupon & Gift Card campaign management |
| `/admin/settings` | `AdminSettings` | `AdminRoute` | Store profile & shipping configuration |

---

## 7. API Architecture & Data Flow

1. **Authentication Flow:**
   - Admin authentication uses JWT tokens (`adminToken`) verified by backend middleware (`adminAuth.js`).
   - Customer authentication uses JWT tokens (`authToken`) or supports guest checkouts storing orders by customer email.
2. **API Client (`src/utils/api.js`):**
   - Centralized fetch wrapper automatically appending `Authorization: Bearer <token>`.
   - Distinguishes admin routes (`/admin/*`) to attach `adminToken`, otherwise utilizing `authToken`.
   - Handles standard response parsing and structured error throwing (`error.status`, `error.data`).
3. **Payment & Webhook Pipeline:**
   - Order creation initializes a Paystack transaction and returns a payment URL.
   - Upon payment completion, frontend redirects to `/payment/verify?reference=...`.
   - Paystack webhooks (`POST /api/webhooks/paystack`) verify HMAC SHA-512 signatures to automatically update order status to `paid`, update inventory, and trigger confirmation emails.
4. **Media Handling:**
   - Image uploads stream through `uploadRoutes.js` using `multer` + Cloudinary. Pre-existing image relative paths are resolved using `getImageUrl()` helper.

---

## 8. Backend REST API Endpoints

### Storefront & Public API
- `GET /api/health` — Diagnostics endpoint (DB connection, pool stats, service integrations)
- `GET /api/products` — List active products (supports `search`, `category`, `minPrice`, `maxPrice`, `page`, `limit`)
- `GET /api/products/:id` — Detailed product view
- `GET /api/categories` — List active product categories
- `POST /api/customers/register` — Customer account creation
- `POST /api/customers/login` — Customer authentication
- `POST /api/customers/forgot-password` — Trigger password reset email
- `POST /api/customers/reset-password` — Process password reset token
- `GET /api/customers/orders` — Customer authenticated order history
- `POST /api/orders` — Initialize new order & Paystack payment URL
- `GET /api/orders/verify/:reference` — Verify order payment status
- `POST /api/contact` — Dispatch contact inquiry
- `POST /api/marketing/subscribe` — Newsletter subscription
- `POST /api/gift-cards/validate` — Validate gift card code
- `POST /api/coupons/validate` — Validate promo coupon code
- `POST /api/webhooks/paystack` — Paystack webhook listener (HMAC signature verified)

### Admin API (Protected by JWT)
- `POST /api/admin/login` — Staff login & JWT generation
- `GET /api/admin/dashboard/stats` — Revenue, order metrics, sales charts
- `GET /api/admin/products` / `POST /api/admin/products` / `PUT /api/admin/products/:id` / `DELETE /api/admin/products/:id` — Product CRUD
- `POST /api/admin/products/bulk` — CSV batch product creation
- `GET /api/admin/orders` / `GET /api/admin/orders/:id` / `PUT /api/admin/orders/:id` — Order status management
- `PUT /api/admin/orders/:id/tracking` — Assign shipping carrier & tracking code
- `GET /api/admin/customers` / `GET /api/admin/customers/:id` — Customer management
- `GET /api/admin/messages` / `GET /api/admin/messages/:id` — Contact inbox management
- `GET/POST/PUT/DELETE /api/admin/coupons` — Coupon code management
- `GET/POST/PUT/DELETE /api/admin/gift-cards` — Gift Card management
- `GET /api/admin/settings` / `PUT /api/admin/settings` — General store configuration

---

## 9. Development & Deployment Scripts

### Backend (`backend/`)
```bash
cd backend
npm install          # Install dependencies
npm run dev          # Start server with Nodemon watcher
npm start            # Production server startup
npm run migrate      # Execute pending SQL database migrations
npm test             # Run Vitest API test suite
npm run lint         # Run ESLint check
```

### Frontend Storefront (`bubu-lagos-web/`)
```bash
cd bubu-lagos-web
npm install          # Install dependencies
npm run dev          # Start Vite development server
npm run build        # Build production bundles into dist/
npm run preview      # Preview production build locally
npm test             # Run Vitest frontend test suite
npm run lint         # Run ESLint check
```

### Containerized Environment (Root)
```bash
docker-compose up -d --build   # Launch PostgreSQL, Backend, and Frontend containers locally
```

---

## 10. Development Guidelines & Conventions

1. **Architecture Separation:** Frontend UI logic resides strictly within `bubu-lagos-web/`. Backend API controllers, models, and database interactions reside within `backend/`.
2. **Database Changes:** Never modify production database schemas directly. Always add an incremental SQL file under `backend/migrations/` and run `npm run migrate`.
3. **API Access:** Frontend components must interact with the backend via `src/utils/api.js`. Never invoke raw `fetch()` directly inside UI components.
4. **Motion & Accessibility:** Ensure all `framer-motion` components respect `useReducedMotion()` to accommodate user accessibility settings.
5. **State Feedback:** Always notify users of background operations using `useToast()` notifications (success, error, warning).

---

## 11. Search Engine Optimization (SEO) & Metadata Architecture

### Dynamic Meta & Social Graph
- **Dynamic Title & Description:** Integrated route-level `Meta.jsx` component that dynamically injects page titles, meta descriptions, canonical URLs, and Open Graph tags for every product and collection.
- **Social Graph Sharing:** `og:title`, `og:description`, `og:image`, `twitter:card` (summary_large_image) pre-configured for every item in the catalog.
- **Search Crawling Directives:** Native `/sitemap.xml` and `/robots.txt` endpoints generated dynamically from backend database routes.

### Structured Data (JSON-LD Schemas)
- **Product Schema (`schema.org/Product`):** Injects product name, images, description, SKU, brand ("Bubu Lagos"), offers (`AggregateOffer` with price, currency "NGN", and availability status).
- **Collection Schema (`schema.org/ItemList`):** Rich search indexing for collection pages detailing item positions and category links.
- **Organization & Breadcrumbs (`schema.org/Organization`, `BreadcrumbList`):** Structured markup for luxury brand knowledge panels and search result breadcrumbs.

---

## 12. Performance Standards & Core Web Vitals

### Lighthouse Performance Targets
- **Lighthouse Performance Score:** ≥ 95 / 100
- **Accessibility (A11y):** ≥ 95 / 100 (WCAG 2.2 AA compliant)
- **Best Practices:** 100 / 100
- **SEO Score:** 100 / 100

### Core Web Vitals Benchmarks
- **Largest Contentful Paint (LCP):** < 2.5 seconds (optimized Cloudinary WebP/AVIF auto-format delivery)
- **Interaction to Next Paint (INP):** < 200 milliseconds (smooth Framer Motion spring interactions)
- **Cumulative Layout Shift (CLS):** < 0.1 (pre-calculated aspect ratio image containers)

---

## 13. Security Architecture & Data Protection

- **Secure HTTP Headers:** Configured with `helmet()` middleware enforcing Strict-Transport-Security (HSTS), X-Content-Type-Options, X-Frame-Options, and Content-Security-Policy (CSP).
- **SQL Injection Prevention:** 100% parameterized queries via PostgreSQL `pg` connection pool. Zero string interpolation in SQL logic.
- **XSS & Input Sanitization:** Sanitized input parameters on all POST/PUT routes using `express-validator` and `DOMPurify` on frontend rich content.
- **Rate Limiting & Protection:** Express IP rate limiting on public routes (100 req/15min) and strict throttling on authentication endpoints (5 req/15min).
- **Media Upload Security:** Strict MIME-type checking (`image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/quicktime`) and 10MB file size limit enforced prior to Cloudinary streaming.
- **Audit Logging:** System security logs capturing admin actions, inventory updates, status updates, and login attempts stored in PostgreSQL.

---

## 14. Analytics, Pixels & Conversion Funnel Tracking

- **Google Analytics 4 (GA4):** Full e-commerce tracking initialization (`view_item_list`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`).
- **Meta & TikTok Pixels:** Conversion tracking for social campaign attribution and custom custom audience lookalikes.
- **Server-Side Event Tracking:** Paystack webhook listener dispatches server-to-server purchase events to ensure zero attribution loss from client ad-blockers.
- **Funnel Analytics:** Real-time conversion drop-off monitoring across cart drawer views, checkout initializations, and payment completions.

---

## 15. CMS & Dynamic Storefront Content Management

Admin interface supports full dynamic editing of marketing copy and customer-facing policies without requiring codebase redeployments:

- **Homepage Content:** Manage hero announcements, brand promises, curated collection lookbooks, and featured product selections.
- **Collection Banners:** Edit category banner imagery, subtitles, and seasonal promotional text.
- **Boutique Policies:** Dynamic management of Client Concierge details, Atelier Appointments, Shipping & Returns policy, Terms of Service, and Privacy Policy.

---

## 16. Atelier Inventory & Stock Management

- **Low Stock Threshold Alerts:** Automated admin dashboard notifications when product variant stock drops below 5 units.
- **Reserved Cart Stock:** Temporary stock reservation during checkout initiation to prevent overselling of limited-run luxury garments.
- **Variant Inventory & SKU Generation:** Unique SKU generation per size/colorway combination (`BL-SIG-SAH-S`, `BL-OCC-IND-M`).
- **Stock Movement Audit Trail:** Historical log recording every stock reduction, manual restock, or returned item adjustment.

---

## 17. Fashion Product Attributes & Sizing System

Catalog items include comprehensive luxury fashion metadata:

- **Identifiers & Pricing:** Unique SKU, Base Price, Variant Surcharges.
- **Fabric & Craftsmanship:** Material composition (e.g., *100% Raw Saharan Linen, Woven Aso-Oke, Silk Crepe, Midnight Velvet*).
- **Fit & Silhouette:** Garment fit guide (e.g., *Fluid Oversized Fit, Structured Waist, Tailored Collar*).
- **Model Details:** Model height and wearing size (e.g., *Model is 5'10" / 178cm wearing size Medium*).
- **Care Instructions:** Professional dry clean only / steam iron guidance.
- **Country of Origin:** *Handcrafted in Lagos, Nigeria*.

---

## 18. Customer Experience & Retention Engine

- **Wishlist Engine:** Instant item bookmarking with client-side persistence and heart indicator feedback on product tiles.
- **Recently Viewed Drawer:** Persistent history tracking recently explored silhouettes for fast re-engagement.
- **Smart Atelier Recommendations:** Contextual item pairing ("Complete the Look") dynamically linking Bubus with matching Accessories and Headwraps.
- **Back-in-Stock Notifications:** Customer email registration for out-of-stock sizes with automatic dispatch upon restock.
- **Bubu Lagos Gift Cards:** Instant digital gift card voucher generation (₦100,000 - ₦1,000,000) with custom recipient message dispatch.

---

## 19. Deployment Architecture & Infrastructure Topology

```
                  ┌─────────────────────────────────────┐
                  │              Customer               │
                  └──────────────────┬──────────────────┘
                                     │
                        HTTPS / TLS 1.3 Requests
                                     │
                  ┌──────────────────▼──────────────────┐
                  │    Vercel Frontend (React + Vite)   │
                  └──────────────────┬──────────────────┘
                                     │
                           REST API Calls (JSON)
                                     │
                  ┌──────────────────▼──────────────────┐
                  │    Render Backend API (Node.js)     │
                  └──────┬───────────┬───────────┬──────┘
                         │           │           │
           SQL Queries   │           │ Uploads   │ Webhooks / Emails
                         │           │           │
 ┌───────────────────────▼──┐  ┌─────▼────────┐ ┌▼─────────────────────┐
 │ Supabase PostgreSQL (DB) │  │ Cloudinary   │ │ Paystack / Resend   │
 └──────────────────────────┘  └──────────────┘ └─────────────────────┘
```

---

## 20. Design System Tokens & Foundations

- **8px Spacing Scale:** Systematic spacing utility tokens (`gap-2` [8px], `gap-4` [16px], `gap-6` [24px], `gap-8` [32px], `gap-12` [48px]).
- **Color Palette:**
  - `primary` / `accent`: Deep Emerald (`#0F3D2E`)
  - `accent-strong`: Royal Forest (`#0A291E`)
  - `background-light`: Cream Silk (`#FAF9F6`)
  - `text`: Charcoal (`#1A1A1A`)
  - `text-light`: Muted Grey (`#666666`)
- **Typography Scale:**
  - Display Headings: Playfair Display / Cormorant Garamond (Serif, uppercase, wide tracking)
  - Body & UI: Inter / Plus Jakarta Sans (Sans-serif, clean, tabular numbers)
- **Elevation & Shadows:** Ambient soft shadows (`shadow-[0_8px_24px_rgba(15,61,46,0.15)]`).
- **Motion Durations & Easing:**
  - Fast micro-interactions: 200ms
  - Reveal transitions: 500ms - 700ms
  - Easing: Custom cubic-bezier `[0.22, 1, 0.36, 1]` (Fluid Luxury Ease)

---

## 21. Production Launch Verification Checklist

- [x] **Responsive Layout:** Tested across mobile (375px), tablet (768px), desktop (1440px), and ultrawide.
- [x] **Accessibility (WCAG 2.2 AA):** All interactive controls include explicit `aria-label`, visible focus rings, and proper color contrast.
- [x] **Product Category Taxonomy:** 100% synchronized across frontend UI (`SAMPLE_CATEGORIES`), backend migrations (`018_seed_official_categories.sql`), and DB seeding logic (`seed.js`).
- [x] **SEO & Structured Data:** Open Graph tags, canonical URLs, and `schema.org/Product` JSON-LD verified on product pages.
- [x] **Security & Environment:** Environment variables secured, API rate limiting enabled, Helmet headers active, SQL injection protected.
- [x] **Performance & Web Vitals:** Asset optimization via Vite bundling, Cloudinary WebP formatting, lazy-loading image tags.
- [x] **Payment Gateway:** Paystack inline checkout and webhook processing fully functional.
- [x] **Transactional Email:** Resend API initialized for client receipts and atelier inquiries.
- [x] **CI/CD & Builds:** Zero-error production build verified via `npm run build`.

---

## 22. Roadmap & Future Improvements

1. **Multi-Currency Converter:** Real-time currency switching (NGN, USD, EUR, GBP) for international clients.
2. **Virtual Fitting Room / AR:** Interactive 3D silhouette view and virtual drape preview.
3. **VIP Private Concierge Chat:** Integrated WhatsApp Business and live client chat for bespoke fittings.
