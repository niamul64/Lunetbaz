# Lunetbuz – Client (Next.js)

The web client for **Lunetbuz** has three apps in one Next.js project:

| Area | Path | Who uses it |
|---|---|---|
| **Storefront** | `/`, `/search`, `/c/*`, `/p/*`, `/shop/*`, `/campaigns/*`, `/cart`, `/checkout`, `/account/*` | Customers |
| **Seller Center** | `/seller/*` | Shop Admin, Shop Manager, Shop Staff |
| **Admin portal** | `/admin/*` | Super Admin, Admin, Operations Manager, Campaign Manager, Verification Officer, Product Reviewer, Finance Executive, Content Manager, Call Center Executive |

There is no backend yet. **Every request goes to the real API endpoint paths, and a mock transport answers them from [`dummy_data/`](dummy_data).** When the NestJS backend exists, set one environment variable and the client calls it instead.

## Quick start

```bash
pnpm install
cp .env.example .env.local      # optional, the defaults use mock mode
pnpm dev                         # http://localhost:3000
```

Open **/login**. In mock mode it lists every demo account grouped by portal; click one to sign in. All accounts use the password `Password@123`.

| Role | Email |
|---|---|
| Super Admin | superadmin@lunetbuz.com |
| Admin | admin@lunetbuz.com |
| Operations Manager | manager@lunetbuz.com |
| Campaign Manager | campaign@lunetbuz.com |
| Verification Officer (×2, needed for the four-eyes rule) | verifier1@lunetbuz.com, verifier2@lunetbuz.com |
| Product Reviewer | reviewer@lunetbuz.com |
| Finance Executive | finance@lunetbuz.com |
| Content Manager | content@lunetbuz.com |
| Call Center Executive | callcenter@lunetbuz.com |
| Shop Admin / Manager / Staff (TechHaat) | shopadmin@ / shopmanager@ / staff@techhaat.com |
| Shop Admin (pending shop) | shopadmin@newshop.com |
| Customer | customer@gmail.com, rahim@gmail.com |
| Suspended customer (login is refused) | blocked@gmail.com |

In the browser, mutations made in mock mode are saved to `localStorage`. Use **user menu → Reset demo data** in either portal to restore the seed.

Scripts: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`, `pnpm images:generate`.

**Product images:** the dummy catalog uses generated SVG illustrations in `public/images/products/` (2–3 per product: main shot, second color or angle, close-up). `pnpm images:generate` redraws them from `scripts/generate-product-images.mjs` and updates the image paths in `dummy_data/`, changing only those lines. Real photos uploaded through the API replace them automatically.

## Tech stack

- Next.js 16 (App Router, Turbopack, **Cache Components + Partial Prefetching**, `proxy.ts`), React 19, TypeScript (strict)
- Tailwind CSS 4 with design tokens in `src/app/globals.css` and Radix UI primitives (accessible)
- TanStack Query 5 for server state, Zustand for client state (session, cart)
- react-hook-form + Zod for forms, sonner for toasts, lucide icons

## Architecture

```
clientend/
├── dummy_data/                 Mock database (JSON) – one file per domain
│   ├── auth.json               Roles (with permissions) + demo users
│   ├── shops.json, products.json, categories.json
│   ├── campaigns.json          Campaigns + shop applications
│   ├── verification.json       Verified-badge requests, inspections, change requests, badge history
│   ├── orders.json, reviews.json, tickets.json, finance.json
│   └── cms.json, vouchers.json, locations.json, customers.json, audit_logs.json
└── src/
    ├── app/
    │   ├── (store)/            Storefront (server-rendered + cached for SEO)
    │   ├── (auth)/             Login / register
    │   ├── seller/             Seller Center (client-rendered behind auth)
    │   └── admin/              Admin portal (client-rendered behind auth)
    ├── components/
    │   ├── ui/                 Design-system primitives (Button, Input, Dialog, Tabs…)
    │   ├── common/             Shared domain UI (DataTable, StatusBadge, guards, media…)
    │   ├── store/ seller/ admin/ portal/ auth/
    ├── config/                 env, site, navigation (menus driven by permissions)
    ├── hooks/                  useUrlState (filters in the URL), useWishlist, useLogout
    ├── lib/
    │   ├── api/client.ts       API client + transport selection (mock | http)
    │   ├── api/mock/           Mock backend: router, in-memory DB, handlers per domain
    │   └── auth/permissions.ts Permission keys + hasPermission()
    ├── server/catalog.ts       Cached server reads for public pages ('use cache' + cacheTag)
    ├── services/               Typed API layer + React Query options per domain
    ├── stores/                 session.store.ts, cart.store.ts
    ├── types/                  Domain types (mirror backend DTOs)
    └── proxy.ts                Optimistic route protection per portal
```

### How a request flows

```
Page / component
  └─ useQuery(sellerQueries.products(params))        // src/services/*.service.ts
       └─ sellerService.products()  →  api.get("/seller/products", { query })
            └─ transport
                 ├─ mock  →  src/lib/api/mock/handlers/seller.ts   (reads dummy_data)
                 └─ http  →  fetch(`${NEXT_PUBLIC_API_URL}/seller/products?...`)
```

Pages never import JSON or call `fetch` directly. They only use the service layer.

### Roles and permissions (RBAC)

- Roles and their permissions live in `dummy_data/auth.json`. In production they come from the backend with the session (`POST /auth/login`, `GET /auth/me`).
- The UI checks **permissions only, never role names** (`src/lib/auth/permissions.ts`). Changing what a role can do is a data change. Super Admins can edit it live in **Admin → Roles & permissions**.
- Sidebar menus (`src/config/navigation.ts`), dashboard widgets and queues, action buttons (`<Can>`) and whole pages (`<RequirePermission>`) all adapt to the signed-in user.
- Security is enforced by the API. The mock handlers enforce the same permissions, so 403 states behave realistically. `proxy.ts` only redirects users to the right portal and is not a security boundary.

### Business rules implemented

- **Lunetbuz Verified Badge:**
  - A seller applies with documents.
  - An officer inspects the product with a checklist, then a **different** officer must approve (four-eyes rule).
  - The product's content is locked while it is verified, suspended or being verified: seller edits fail with `409 CONTENT_LOCKED`. Price and stock stay editable.
  - Changes to locked content go through **change requests**.
  - A badge can be suspended (for example after a customer complaint), reinstated or revoked. Revoking adds a strike to the shop.
- **Campaigns:**
  - Campaigns move through these stages: draft → registration open → closed → scheduled → live → ended → settled.
  - Shop applications are checked against the rules: minimum discount, minimum stock, product cap, minimum shop rating, allowed categories and verified-only.
  - Each item is approved or rejected separately, with a reason.
  - While a campaign is live, its prices apply automatically on the storefront and at checkout.
- **Checkout:**
  - Orders are split into one package per shop.
  - The delivery fee depends on the zone (inside Dhaka, suburbs, outside Dhaka) and weight.
  - Vouchers work at platform and shop level.
  - Requests use an `Idempotency-Key`.
  - COD is blocked for high-risk customers.
- **Orders:**
  - The seller moves a package through confirm → pack → ready to ship (courier and tracking number).
  - Operations staff simulate courier events (shipped, delivered, returned) and handle cancellations.
- **Support:** call-center staff log calls as tickets, assign them and escalate. An authenticity complaint can suspend a product's Verified badge.
- **Finance:** a payout is approved, then marked paid with a transfer reference, or put on hold.
- **Audit log:** every administrative action is recorded.

## Connecting the NestJS backend

1. Set `NEXT_PUBLIC_API_MODE=http` and `NEXT_PUBLIC_API_URL=https://api.lunetbuz.com/api/v1`.
2. Implement the endpoints listed in `src/services/*.service.ts`. The mock handlers in `src/lib/api/mock/handlers/` are the reference for request and response shapes and business rules (about 100 endpoints).
3. Use these contracts:
   - Lists return `{ data: T[], meta: { page, pageSize, total, totalPages } }`.
   - Errors return `{ error: { code, message, details? } }`. Validation errors use `422` with `details.fieldErrors`, which forms show inline.
   - Auth uses a Bearer access token. For production, prefer a short-lived access token in memory plus an httpOnly refresh cookie (see `src/stores/session.store.ts`), and have the API set the `lb_session` hint cookie, or keep setting it from the client.
   - Uploads: `POST /uploads/presign` returns `{ uploadUrl, publicUrl }` (see `src/services/upload.service.ts`).
4. Add your CDN host to `NEXT_PUBLIC_IMAGE_HOSTS` so real product images go through `next/image`.
5. Set `REVALIDATE_SECRET` and have the backend's `cache-invalidation` worker call `POST /api/revalidate` on domain events (see **Caching** below).

## Caching

The full strategy is in proposal.md §11. On the client side:

| Layer | Where | What |
|---|---|---|
| Server cache | `src/server/catalog.ts` | `"use cache"` reads for public storefront data only. Lifetimes are the named profiles in `next.config.ts` (`storefront`, `product`, `campaign`, `reference`). |
| Cache tags | `src/lib/cache/tags.ts` | `home`, `categories`, `products`, `campaigns`, `product:<slug>`, `shop:<slug>`, `campaign:<slug>`. Each read carries a specific tag plus its collection tags. |
| On-demand invalidation | `src/app/api/revalidate/route.ts` | `POST` with header `x-revalidate-secret` and body `{ "tags": [...], "mode": "stale" \| "expire" }`. Tags are validated against the list above. `stale` = stale-while-revalidate; `expire` = drop immediately (bans, wrong prices). |
| Client cache tiers | `src/lib/cache/query-policy.ts` | `static` · `reference` (10 min) · `catalog` (1 min) · `private` (30 s) · `live` (10 s, refetch on focus, polled every minute) · `transactional` (0, cart and checkout totals). Every query factory in `src/services/*` picks one. |
| Prefetch | `ProductListing` | The next results page is prefetched. `<Link>` prefetches page shells (Partial Prefetching). |
| Browser storage | `src/stores/*` | Session and cart lines only. Prices are always re-quoted. Private query data is cleared on logout or account switch. |

Example call from the backend:

```bash
curl -X POST https://lunetbuz.com/api/revalidate \
  -H "x-revalidate-secret: $REVALIDATE_SECRET" -H "Content-Type: application/json" \
  -d '{"tags":["product:samsung-galaxy-a56-5g","shop:techhaat"]}'
```

In mock mode, edits made in the portals live in the browser, so the server-cached storefront still shows the seed data. With the real backend, the revalidation call keeps them in sync.

Once the backend exists you can delete `dummy_data/` and `src/lib/api/mock/`. Nothing else imports them.

## Conventions

- Filters, tabs and pagination live in the URL (`useUrlState`), so list views can be shared and survive reloads.
- Every list has loading, empty and error states (`DataTable`). Consequential actions use `ConfirmDialog`, which can ask for a reason that goes into the audit log.
- Money is in whole BDT (`formatPrice` → `৳1,23,456`). Dates are shown in the Asia/Dhaka timezone.
- Accessibility: Radix primitives, labelled form fields (`Field`), visible focus rings, and `aria-*` attributes on custom widgets.
