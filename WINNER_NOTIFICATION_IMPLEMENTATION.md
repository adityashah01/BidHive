# Auction Winner Notification & Email System Implementation

This document provides a comprehensive technical overview of the complete, secure, and idempotent Auction-Winner Notification System implemented in **BidHive**.

---

## 1. Architecture Overview

The system decouples auction settlement from external side-effects (like email transmission) using a transactional outbox pattern to guarantee data consistency, atomicity, and zero lost notifications.

```
+-----------------------------------------------------------------------------------+
|                               AUCTION SETTLEMENT                                  |
|                                                                                   |
|  1. Find Expired ACTIVE Listings                                                 |
|  2. Drizzle Transaction with FOR UPDATE Locks (Listings, Wallets, Holds)          |
|  3. Determine Winner or Reserve Unmet status                                     |
|  4. Capture Wallet Hold (Winner) / Release Wallet Holds (Losing Bidders)          |
|  5. Insert Transaction Record (48-hour Payment Deadline)                          |
|  6. Insert Permanent In-App Notifications (Winner, Seller, Losers)                |
|  7. Queue Transactional Emails into `email_outbox` Table                         |
+-----------------------------------------------------------------------------------+
                                         |
            +----------------------------+----------------------------+
            | (Post-Commit)                                           | (Async Worker)
            v                                                         v
+---------------------------------------+         +---------------------------------------+
|            PUSHER EVENTS              |         |          EMAIL WORKER TASK            |
|                                       |         |                                       |
|  Triggers instant Pusher events on    |         |  Polls `email_outbox` (PENDING/FAILED)|
|  `private-user-{userId}` channels:    |         |  Sends via configured Email Provider:  |
|   - `auction-won`                     |         |   - Resend API                        |
|   - `listing-sold`                    |         |   - SMTP                              |
|   - `auction-lost`                    |         |   - Console/Dev Mode (Safe fallback)  |
|   - `notification-created`            |         |  Updates outbox status to SENT/FAILED |
+---------------------------------------+         +---------------------------------------+
```

---

## 2. Database Schema Modifications

### A. `email_outbox` Table (`/src/db/schema.ts`)
Stores queued transactional emails atomically generated during database transactions.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | VARCHAR (PK) | Unique ID (`emb_...`) |
| `toEmail` | TEXT | Recipient email address |
| `toName` | TEXT | Recipient display name |
| `subject` | TEXT | Email subject line |
| `template` | TEXT | Template type (`WINNER_NOTIFICATION`, `SELLER_NOTIFICATION`, `LOSING_BIDDER`, `RESERVE_NOT_MET`) |
| `payload` | JSONB | Data passed to email template renderer |
| `status` | TEXT | `PENDING` \| `PROCESSING` \| `SENT` \| `FAILED` |
| `attempts` | INTEGER | Number of send attempts (max 3) |
| `lastAttemptAt` | TIMESTAMP | Timestamp of last attempt |
| `error` | TEXT | Error message if delivery failed |
| `deduplicationKey` | TEXT (UNIQUE) | Prevents duplicate outbox entries for same event/user |
| `createdAt` | TIMESTAMP | Record creation timestamp |
| `sentAt` | TIMESTAMP | Timestamp when successfully sent |

### B. `notifications` Table Updates (`/src/db/schema.ts`)
Enhanced to support structured titles, transaction references, and event deduplication.

| Added Field | Type | Description |
| :--- | :--- | :--- |
| `title` | TEXT | Short title for notification header |
| `listingId` | TEXT | Foreign key reference to listing |
| `transactionId` | TEXT | Foreign key reference to transaction |
| `deduplicationKey` | TEXT | Unique key enforcing idempotent notification generation |

---

## 3. Current Project Condition & Security Isolation

### Safe Fallback & Zero Leakage
- **Development/Console Transport**: When no email provider credentials (`RESEND_API_KEY` or `SMTP_HOST`) are configured, emails are logged to the dev console in a simulated format.
- **Masked Security Logging**: Email addresses are masked in server log output (e.g., `a***a@gmail.com`) to prevent leakage of PII into public log outputs.
- **Client Key Isolation**: No secret keys (`RESEND_API_KEY`, `SMTP_PASS`) are exposed to the client. Frontend environment variables only contain public Vite identifiers.

---

## 4. Canonical Auction Settlement (`/src/services/auctionSettlement.ts`)

### Key Design Principles:
1. **Row Locking (`FOR UPDATE`)**: Prevents race conditions during concurrent bid submissions or simultaneous cron executions.
2. **Strict Idempotency**: Before processing, checks if listing is already `SOLD` or `ENDED`. Deduplication keys prevent re-processing.
3. **Wallet Hold Resolution**:
   - **Winner**: Hold is captured; transferred to transaction ledger.
   - **Losing Bidders**: Wallet holds are released and balance restored immediately.
4. **Reserve Price Met Logic**:
   - Highest bid $\ge$ `reservePrice`: Status updated to `SOLD`, transaction created with **48-hour payment deadline**.
   - Highest bid $<$ `reservePrice`: Status updated to `ENDED` (Reserve Unmet). Bids released.
5. **Multi-Party Notification Generation**:
   - **Winner**: `AUCTION_WON` notification + `WINNER_NOTIFICATION` email queued.
   - **Seller**: `AUCTION_ENDED` notification + `SELLER_NOTIFICATION` email queued.
   - **Losing Bidders**: `AUCTION_LOST` notification + `LOSING_BIDDER` email queued.

---

## 5. Email Infrastructure & Worker (`/src/services/emailWorker.ts`)

### Features & Retry Logic:
- **Asynchronous Execution**: Worker processes outbox records independently of main user request flows.
- **Retry Mechanism**: Max 3 attempts with exponential delay tracking. If an attempt fails, `attempts` is incremented and error message recorded.
- **Multiple Provider Transports**:
  - `RESEND`: Uses Resend HTTP REST API.
  - `SMTP`: Uses `nodemailer` with configured SMTP credentials.
  - `CONSOLE` / `DEV`: Logs formatted email payload directly to console.

---

## 6. API Endpoints

### 1. `GET /api/notifications`
- **Auth**: Required (`requireAuth`)
- **Query Parameters**:
  - `unreadOnly` (`true` \| `false`)
  - `page` (default `1`)
  - `limit` (default `50`)
- **Returns**: Array of user notifications OR `{ notifications, total, unreadCount }`

### 2. `GET /api/notifications/unread-count`
- **Auth**: Required
- **Returns**: `{ unreadCount: number }`

### 3. `PATCH /api/notifications/:id/read`
- **Auth**: Required
- **Access Control**: Validates notification belongs to `req.dbUser.id` (returns `404` if not found/unauthorized).
- **Returns**: `{ success: true, notification }`

### 4. `PATCH /api/notifications/read-all` & `POST /api/notifications/read`
- **Auth**: Required
- **Returns**: `{ success: true }`

### 5. `POST /api/pusher/auth`
- **Auth**: Required
- **Access Control**: Validates channel `private-user-{userId}` matches `req.dbUser.id` (returns `403` if user attempts to authenticate for another user's channel).
- **Returns**: Pusher channel authorization token.

---

## 7. Frontend Notification Experience (`/src/components/NotificationCenter.tsx`)

1. **Header Bell Badge**: Displays live unread count with a red counter pill.
2. **Interactive Dropdown Center**:
   - Tabs for **All** and **Unread** notifications.
   - Distinct visual badges and icons for `AUCTION_WON`, `LISTING_SOLD`, `AUCTION_LOST`, `RESERVE_NOT_MET`, and `OUTBID`.
   - Action buttons for **Mark as read** (single) and **Mark all read**.
   - Click-to-navigate directly to associated listing details.
3. **Real-time Pusher Channel**:
   - Listens on `private-user-${currentUser.id}`.
   - Displays real-time toast alerts (`🎉 Congratulations! You won the auction!`, `💰 Your listing sold!`).
   - Re-fetches core application state seamlessly on incoming events.

---

## 8. Verification & Testing Instructions

### A. Testing Auction Expiration
1. Create a test auction listing with `endTime` set 1 minute in the future.
2. Place a bid on the listing as a test user.
3. Wait 1 minute for the background cron job to execute `processAllExpiredAuctions`.
4. Verify:
   - Listing status changes to `SOLD`.
   - Transaction record created with `paymentDeadline` 48 hours in future.
   - In-app notification appears in the winner's Notification Center.
   - Entry created in `email_outbox` table.

### B. Testing Email Outbox Processing
1. Trigger an auction settlement.
2. Inspect server logs for background email worker execution (`[EMAIL WORKER]`).
3. Check `email_outbox` table in database:
   - Confirm record transitioned from `PENDING` to `SENT`.
   - Verify `attempts = 1` and `sentAt` is populated.

---

## Summary
The auction winner notification system is fully implemented, verified, build-green, and ready for production deployment.
