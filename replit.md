# Overview

**الراقي للمنتجات السودانية (Al-Raqi Sudanese Products)** is a full-stack e-commerce platform specializing in Sudanese food products. It's designed as an Amazon-style online store with a culturally relevant Arabic-first interface (RTL layout), featuring product browsing, category filtering, shopping cart functionality, and order placement. The platform targets Sudanese food items including spices, grains, oils, dates, and traditional dishes.

# User Preferences

Preferred communication style: Simple, everyday language. The user communicates in Arabic.

# Recent Changes

- **2026-02-11**: Full-stack conversion complete. Database created with products, categories, cart_items, orders tables. All frontend pages now fetch real data from API. Cart operations (add, update quantity, remove) fully functional with session-based tracking via `x-session-id` header stored in localStorage. Seed endpoint populates 8 Sudanese products and 5 categories. Auth page exists with simulated login (not yet connected to real backend auth).

# Environment Variables (production / Render)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `ADMIN_PASSWORD` | yes | Admin "master" password (env login always works). The old default `admin12345` is rejected. |
| `ADMIN_USERNAME` | no | Defaults to `admin` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | recommended | Image uploads. Without them images are stored on the local disk only. Never commit these. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | for password reset emails | |
| `PUBLIC_URL` | no | Base URL used in emails/WhatsApp links (falls back to Render's `RENDER_EXTERNAL_URL`) |
| `GOOGLE_CLIENT_ID` | for Google sign-in | |

Security notes: prices are always computed on the server; password-reset and biometric tokens are stored only as SHA-256 hashes; sessions expire (customers 30 days, admin 7 days); login/reset/order endpoints are rate-limited. `npm run db:push` no longer uses `--force`, so it refuses schema changes that would delete data. Emergency admin reset: `ADMIN_PASSWORD="..." npx tsx scripts/reset-admin.ts`.

# Testing

End-to-end security/functional tests live in `tests/e2e.mjs` (50 checks: price tampering, password reset, admin auth, cart ownership, sessions, rate limits, link previews…). They run automatically on GitHub (`.github/workflows/ci.yml`) for every push and pull request. To run locally against an EMPTY test database (never the real store):

```
npm run build
DATABASE_URL=postgres://… DATABASE_SSL=false npx drizzle-kit push
DATABASE_URL=postgres://… DATABASE_SSL=false npm test
```

`.github/workflows/keep-alive.yml` pings the store every 10 minutes during the day (07:00–24:00 Sudan time) so customers don't hit Render's free-plan cold start.

# System Architecture

## Frontend Architecture

- **Framework**: React 19 with TypeScript, built with Vite
- **Routing**: Wouter with routes: Home (`/`), Shop (`/shop`), Product Details (`/product/:id`), Cart (`/cart`), Auth (`/login`)
- **State Management**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom warm color palette (terracotta primary `hsl(25 85% 45%)`, deep teal secondary `hsl(180 35% 30%)`, papyrus white background `hsl(30 20% 98%)`)
- **Typography**: Tajawal font for Arabic text, Outfit for Latin/numerals
- **Layout**: RTL (right-to-left) direction throughout, mobile-first responsive design
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`
- **Cart Hook**: `client/src/hooks/use-cart.ts` — useCart, useCartCount, useAddToCart, useUpdateCartQuantity, useRemoveFromCart
- **API Helper**: `client/src/lib/api.ts` — apiRequest with auto session ID, getSessionId, seedDatabase

## Backend Architecture

- **Runtime**: Node.js with Express 5
- **Language**: TypeScript, executed via `tsx` in development
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Key Endpoints**:
  - `GET /api/products` — product listing (optional `?category=` filter)
  - `GET /api/products/:id` — single product details
  - `GET /api/categories` — category listing
  - `GET /api/cart` — get cart items with product details (uses x-session-id header)
  - `POST /api/cart` — add item to cart (body: productId, sessionId, quantity)
  - `PATCH /api/cart/:id` — update cart item quantity
  - `DELETE /api/cart/:id` — remove cart item
  - `POST /api/orders` — create order (body: sessionId, name, phone, address)
  - `POST /api/seed` — database seeding with sample data (idempotent)
- **Session Management**: Session-based cart using `x-session-id` header (stored in localStorage on client)
- **Storage**: DatabaseStorage class in `server/storage.ts` using Drizzle ORM with pg driver

## Data Storage

- **Database**: PostgreSQL via `DATABASE_URL` environment variable
- **ORM**: Drizzle ORM with node-postgres (pg) driver
- **Schema Location**: `shared/schema.ts` — shared between client and server
- **Tables**:
  - `users` — id (UUID), username, password, name, email
  - `products` — id (UUID), name, nameEn, description, price (integer in SDG), image, category, rating, reviews, badge, inStock
  - `categories` — id (string), name, icon
  - `cart_items` — id (UUID), sessionId, productId, quantity
  - `orders` — id (UUID), sessionId, total, status, name, phone, address, createdAt
- **Schema Sync**: `drizzle-kit push` for schema synchronization
- **Validation**: Zod schemas generated from Drizzle schemas via `drizzle-zod`

## Build System

- **Client Build**: Vite builds to `dist/public`
- **Server Build**: esbuild bundles server code to `dist/index.cjs`
- **Commands**:
  - `npm run dev` — starts dev server with Vite HMR
  - `npm run build` — builds both client and server for production
  - `npm start` — runs production build
  - `npm run db:push` — pushes schema to database

## Authentication

- Auth page exists at `/login` with login/register forms using simulated timeout (not yet connected to real backend auth)
- User table exists in the schema ready for real auth implementation

# Project Architecture

```
client/
  src/
    components/
      home/hero.tsx          # Hero section with CTA
      layout/navbar.tsx      # Global navbar with cart count
      layout/footer.tsx      # Site footer
      product/product-card.tsx # Reusable product card
      ui/                    # shadcn/ui components
    hooks/
      use-cart.ts            # Cart hooks (useCart, useAddToCart, etc.)
    lib/
      api.ts                 # API request helper with session management
      queryClient.ts         # TanStack Query client
    pages/
      home.tsx               # Homepage with categories + featured products
      shop.tsx               # Product catalog with filters
      product-details.tsx    # Single product view
      cart.tsx                # Shopping cart with order summary
      auth.tsx               # Login/register page
  public/
    images/                  # Generated images (hero, texture pattern)
server/
  index.ts                   # Express server setup
  routes.ts                  # API route definitions
  storage.ts                 # DatabaseStorage class with all CRUD operations
shared/
  schema.ts                  # Drizzle schema definitions
```
