# BidHive Security & Performance Remediation Report

## 1. Authentication & Security
- **Firebase Authentication Hardening**: Removed the insecure `demo_`/`usr-` JWT fallback mechanism from `src/middleware/auth.ts`. The platform now strictly requires a cryptographically verified Firebase ID Token via the `adminAuth.verifyIdToken` Firebase Admin SDK.
- **Admin Privilege Escalation**: Fixed the POST `/api/auth/role` endpoint to explicitly reject self-assignment of the `ADMIN` role, preventing unauthorized users from escalating their privileges.
- **Sensitive Endpoint Protection**: Protected the `/api/auth/recent-emails` debugging endpoint. It now requires the `ADMIN` role and is disabled in production (`NODE_ENV === 'production'`).
- **Cryptographic Hashing**: Implemented SHA-256 hashing for 2FA OTP codes and password reset tokens in `server.ts`. Raw tokens are no longer stored in plain text in the PostgreSQL database.
- **Removed Weak Randomness**: Replaced instances of `Math.random()` with the cryptographically secure `crypto.randomUUID()` and `crypto.randomInt()` in Node.js.

## 2. Financial Integrity & Auctions
- **Auto-bid Logic**: Addressed missing backend functionality by implementing complete CRUD endpoints for the `autoBidConfigs` table (`POST`, `GET`, `DELETE` at `/api/listings/:id/autobid`).
- **Precision Monetary Storage**: Updated `src/db/schema.ts` to use a custom PostgreSQL `money` type mapped to `numeric(14,2)` for all monetary fields to prevent floating-point arithmetic errors.
- **Top-up Approval Fix**: Removed the duplicate `walletTopups` model from `schema.ts` and corrected the import in `server.ts`. Refactored the `POST /api/admin/topups/:requestId/approve` route to correctly query the `topupRequests` table.
- **Database CHECK Constraints**: Hardened `schema.ts` by adding PostgreSQL `CHECK` constraints to enforce:
  - `price_check`: `starting_price > 0` and `reserve_price >= starting_price`.
  - `dates_check`: `end_time > start_time`.
  - `balance_check`: `available_balance >= 0` and `held_balance >= 0`.
  - `bid_amount_check`: `amount > 0`.
- **Location Saving Fixed**: Corrected the listing insertion query in `server.ts` to successfully persist the `locationName` submitted by the frontend form.

## 3. Asynchronous Operations
- **Auction Completion Scheduler**: Installed `node-cron` and implemented a background cron job in `server.ts` that runs every minute to automatically execute `concludeExpiredAuctions()`, ensuring listings transition cleanly to `SOLD` or `ENDED`.

## 4. Frontend & Performance
- **Approval Intent Fix**: Refactored `src/App.tsx` to respect the `status` provided by `CreateListingForm` instead of unconditionally hardcoding it to `ACTIVE`.
- **Dynamic Class Rendering**: Fixed literal string interpolation (`\${...}`) errors in `AddMoneyModal.tsx`, `WalletPage.tsx`, and `AdminWalletPanel.tsx` to enable proper Tailwind CSS conditional rendering.
- **Bundle Optimization (Code Splitting)**: Implemented React `lazy` and `Suspense` for heavy components, specifically wrapping `Login`, `ListingDetail`, `CreateListingForm`, `AdminPanel`, `WalletPage`, and `PaymentPage` to drastically reduce the size of the initial Vite JS chunk.
- **Type Safety Sync**: Aligned `src/types.ts` with the database schema by adding the `DELETED` listing status and correcting the `balance` fields to `availableBalance` and `heldBalance`.

## 5. Developer Experience & Testing
- **Package Manager Sync**: Successfully resolved the `ENOTEMPTY` block in the Node environment, rebuilding `package-lock.json` and synchronizing dependencies via a clean `npm install`.
- **Testing Infrastructure**: Added `vitest` and `supertest` dependencies, mapped `npm run test` and `test:coverage`, and initialized a starter testing file in `tests/auth.test.ts` to ensure CI pipeline integration readiness.
