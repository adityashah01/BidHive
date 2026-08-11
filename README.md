# BidHive Nepal — Second-Hand Auction Marketplace

BidHive Nepal is a real-time online second-hand auction marketplace built for the Nepali market. It features anti-sniping bid extensions, automatic proxy bidding, eSewa and Khalti QR code top-ups with administrator approval, and live Pusher notifications.

---

## 🚀 Quick Start Guide (Local Setup)

To run BidHive Nepal locally after downloading/extracting the project ZIP:

### 1. Prerequisites
- **Node.js**: v18.x or v20.x or higher
- **npm**: v9.x or higher
- **PostgreSQL Database** (e.g. Neon, Supabase, or local PostgreSQL instance)

### 2. Installation
```bash
# Install dependencies
npm install
```

### 3. Environment Variables Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Open `.env` and fill in your connection credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/bidhive_db"
JWT_SECRET="your-local-jwt-secret-key"
SESSION_SECRET="your-local-session-secret-key"
PORT=3000
```

### 4. Database Setup & Migrations
```bash
# Push database schema to your PostgreSQL database
npx drizzle-kit push
```

### 5. Running the Application
```bash
# Start Development Server (Full Stack: Express + Vite)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🛠️ Production Build & Start
```bash
# Compile client assets and bundle server.ts with esbuild
npm run build

# Launch compiled CommonJS server
npm run start
```

---

## 🌟 Core Features
- **Real-Time Bidding**: Powered by Pusher channels for live bid updates.
- **Wallet & QR Top-Ups**: Instant eSewa & Khalti QR scanner with receipt screenshot submission and admin verification.
- **Admin Moderation Panel**: Approve/reject listings, verify wallet top-up receipts, manage users, and inspect transaction ledgers.
- **Interactive Location Maps**: Integrated Leaflet map picker for item listings in Kathmandu Valley, Pokhara, and Nepal regions.
- **Anti-Sniping Engine**: Automatic 2-minute auction extension if a bid is placed in the final minutes.
