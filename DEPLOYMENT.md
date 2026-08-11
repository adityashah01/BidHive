# Deployment & Neon PostgreSQL Migration Guide

This guide outlines how to configure, deploy, and run the BidHive application using **Neon PostgreSQL** as the sole database provider, entirely removing Google Cloud SQL.

---

## 1. Creating a Neon PostgreSQL Project

1. Visit the [Neon Console](https://console.neon.tech/) and sign up or log in.
2. Click **Create Project**.
3. Name your project (e.g., `bidhive-db`), select your preferred cloud provider and region (AWS US East is default), and keep PostgreSQL version 16 (or higher).
4. Click **Create Project**.
5. Once created, a popup will display your connection details. Choose **Connection String** from the dropdown.
6. Make sure to toggle **Pooled connection** or **Direct connection** to copy the respective strings.
   * **DATABASE_URL** is standard for applications (with pooling).
   * **DIRECT_URL** can be used for running migrations or direct access.

---

## 2. Setting Up Environment Variables

Create a `.env` file in the root of the project (copying `.env.example` as a starting point) and populate the values:

```env
# ==========================================
# Neon PostgreSQL Database Configuration
# ==========================================
DATABASE_URL="postgresql://neondb_owner:[YOUR_PASSWORD]@ep-cool-snowflake-12345.east-us-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://neondb_owner:[YOUR_PASSWORD]@ep-cool-snowflake-12345.east-us-2.aws.neon.tech/neondb?sslmode=require"

# ==========================================
# Authentication & Session Secrets
# ==========================================
JWT_SECRET="generate-a-secure-random-key"
SESSION_SECRET="generate-another-secure-random-key"

# ==========================================
# Simulated or Real SMTP Email Configuration
# ==========================================
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="smtp-username"
SMTP_PASSWORD="smtp-password"
SMTP_FROM="noreply@bidhive.com.np"

# ==========================================
# Application Configuration
# ==========================================
NODE_ENV="production"
PORT=3000
APP_URL="https://your-app-domain.com"

# ==========================================
# Payments & Escrow Integrations
# ==========================================
PAYMENT_EMAIL="escrow@bidhive.com.np"

# ==========================================
# Google Gemini AI Integration
# ==========================================
GEMINI_API_KEY="your-google-gemini-api-key"
```

---

## 3. Database Schema Initialization & Seeding

The application is engineered to be **completely zero-ops**!

1. When you start the application server (`npm run start` or `npm run dev`), the server will automatically detect the presence of `DATABASE_URL`.
2. It will run all pending SQL migrations found in the `/drizzle` folder on your Neon PostgreSQL instance using the programmatic Drizzle migrator.
3. Once the schema is successfully created, it will run the initial professional Nepalese data seeder if the database is currently empty.

Alternatively, you can manually push or manage the database schema using Drizzle Kit:

* **Generate migrations manually:**
  ```bash
  npx drizzle-kit generate --config=src/db/drizzle.config.ts
  ```
* **Push the schema directly to Neon without migrations:**
  ```bash
  npx drizzle-kit push --config=src/db/drizzle.config.ts
  ```
* **Inspect the database visually using Drizzle Studio:**
  ```bash
  npx drizzle-kit studio --config=src/db/drizzle.config.ts
  ```

---

## 4. Production Start Guide

To run the application in production:

1. Build both the Vite frontend bundle and the Node.js Express backend server:
   ```bash
   npm run build
   ```
2. Start the compiled production bundle:
   ```bash
   npm run start
   ```

The server will bind to port `3000` and host `0.0.0.0`, serving the frontend and API routes with top performance.

---

## 5. Directory of Mandatory URLs for Configuration

Here are all the critical dashboards and integration portals required to configure the application:

### 🗄️ Neon Console
* **URL:** [https://console.neon.tech/](https://console.neon.tech/)
* **Why:** To create your serverless PostgreSQL database, manage branches, inspect tables, and obtain the secure `DATABASE_URL` and `DIRECT_URL`.
* **Credentials to Copy:** `DATABASE_URL` (pooled connection string, including `sslmode=require`).

### 🤖 Google AI Studio / Gemini API Dashboard
* **URL:** [https://aistudio.google.com/](https://aistudio.google.com/)
* **Why:** To generate your API Key for Gemini.
* **Credentials to Copy:** `GEMINI_API_KEY`.

### 📧 Mailtrap (or chosen SMTP Provider)
* **URL:** [https://mailtrap.io/](https://mailtrap.io/)
* **Why:** For receiving sandbox verification, listing notifications, and escrow updates.
* **Credentials to Copy:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`.
