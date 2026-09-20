# Product Price Tracker

A web app that tracks product prices and stock levels over time by scraping a demo e-commerce site. Built with Node.js, Express, Prisma ORM, Supabase (PostgreSQL), Playwright, and React + Vite + Tailwind CSS.

## 🔗 Live Demo

| | URL |
|---|---|
| **Frontend** | [https://product-price-tracker-two.vercel.app](https://product-price-tracker-two.vercel.app) |
| **Backend API** | [https://product-price-tracker-9hse.onrender.com](https://product-price-tracker-9hse.onrender.com) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | Node.js, Express |
| Database ORM | Prisma |
| Database | Supabase (PostgreSQL) |
| Scraper | Playwright (Chromium) |
| Frontend | React, Vite, Tailwind CSS |
| Automation | GitHub Actions |

---

## Local Setup Guide

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Supabase](https://supabase.com/) account (free tier works)
- Git

---

### Step 1 — Create a Supabase Database

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project**, give it a name, set a database password, and choose a region.
3. Once the project is ready, go to **Project Settings → Database → Connection string**.
4. Click the **ORM** tab (or **Prisma** tab) — this gives you the pre-formatted URLs ready to paste directly into your `.env`:
   - `DATABASE_URL` — the transaction pooler URL (port 6543, with `?pgbouncer=true`)
   - `DIRECT_URL` — the direct connection URL (port 5432)

---

### Step 2 — Configure the Backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:

```env
# Transaction pooler — used by the app at runtime
DATABASE_URL="postgresql://<user>:<password>@<host>:6543/<db>?pgbouncer=true"

# Direct connection — used by Prisma for migrations
DIRECT_URL="postgresql://<user>:<password>@<host>:5432/<db>"
```

> Replace the placeholders with your actual Supabase connection strings from Step 1.

---

### Step 3 — Push the Database Schema

Run the following command to create all tables (`Item`, `CronItems`, `History`) in your Supabase database:

```bash
npx prisma db push
```

You should see a confirmation that the schema was applied successfully.

---

### Step 4 — Seed the Item Catalog

Run `index.js` once to fetch all products from the demo store and save them to your `Item` table:

```bash
node index.js
```

Expected output:
```
Fetched 500 products
Inserting products into the database...
Successfully inserted 500 items.
```

This populates the search catalog. You only need to run this once.

---

### Step 5 — Start the Backend Server

```bash
node server.js
```

The server starts on `http://localhost:3000` with these endpoints:

| Endpoint | Description |
|---|---|
| `GET /items/search?name=<query>` | Search the product catalog |
| `GET /items/track/:productId` | Start tracking a product |
| `GET /cronitems` | List all tracked products |
| `GET /history/:productId` | Get price history for a product |

---

### Step 6 — Configure the Frontend

The frontend is pre-configured to point to the production Render URL. For local development, switch it back to `localhost`.

Open `frontend/src/App.jsx` and replace all occurrences of:
```
https://product-price-tracker-9hse.onrender.com
```
with:
```
http://localhost:3000
```

Do the same in `frontend/src/ProductHistory.jsx`.

Then start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

### Step 7 — Run the Scraper

To scrape the current price and stock of all tracked products and save results to the `History` table:

```bash
cd backend
node scrape.mjs --all
```

To scrape a single product by ID:

```bash
node scrape.mjs <productId>
```

To watch the browser visually (headed mode, useful for debugging):

```bash
node scrape.mjs --all --headed
node scrape.mjs --all --headed --debug
```

---

## GitHub Actions (Automated Scraping)

The repo includes a workflow at `.github/workflows/scrape.yml` that automatically runs the scraper every 2 hours.

### Setup

Add the following secrets to your GitHub repository under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `DATABASE_URL` | Your Supabase transaction pooler URL |
| `DIRECT_URL` | Your Supabase direct connection URL |

You can also trigger it manually from the **Actions** tab → **Scheduled Product Scrape** → **Run workflow**.

---

## Project Structure

```
Product_Price_tracker/
├── .github/
│   └── workflows/
│       └── scrape.yml         # GitHub Actions cron workflow
├── backend/
│   ├── prisma/
│   │   └── schema.prisma      # Database schema (Item, CronItems, History)
│   ├── .env.example           # Template for environment variables
│   ├── index.js               # One-time seed script to populate Item table
│   ├── prismaClient.js        # Prisma client singleton
│   ├── scrape.mjs             # Playwright scraper (single or --all mode)
│   └── server.js              # Express API server
└── frontend/
    └── src/
        ├── App.jsx            # Main dashboard (search + tracked items)
        └── ProductHistory.jsx # Price & stock history chart per product
```

---

## Database Schema

| Table | Purpose |
|---|---|
| `Item` | Full product catalog (populated by `index.js`) |
| `CronItems` | Products being tracked (added via `/items/track/:id`) |
| `History` | Scrape results per product over time (price, stock, errors) |
