# Khata Book — Vite + React + MUI + Firebase

Mobile-first digital khata (ledger) for small shopkeepers. Core MVP.

## Features (MVP)
- Firebase Email/Password auth (register, login, verify, forgot password, logout, persistent).
- Customers: create, list, search, edit, delete, per-customer ledger with running balance.
- Transactions: credit (customer owes you) / payment (customer paid).
- Dashboard: total to receive, to pay, today's collection & payment, recent activity.
- Bottom navigation, mobile-first MUI Material 3 look, dark mode toggle.
- Installable PWA (manifest + icons).

## Run locally
```
bun install
bun run dev
```

## Deploy to Vercel
1. Push this repo to GitHub.
2. Import in Vercel — framework auto-detects as Vite.
3. `vercel.json` already configured (SPA rewrites, build command, output `dist`).
4. Firebase web config is embedded in `src/lib/firebase.ts` (Firebase web `apiKey` is a public identifier, safe to commit).

## Firestore data model
```
users/{uid}/customers/{customerId}
  name, phone, address, notes, openingBalance, photoURL, createdAt
users/{uid}/customers/{customerId}/transactions/{txnId}
  type: 'credit' | 'payment', amount, description, paymentMethod, date, createdAt
users/{uid}/settings/{profile}
```
Deploy `firestore.rules` via Firebase console or `firebase deploy --only firestore:rules`.

## Roadmap (not in MVP)
Expense/Income modules, PDF/Excel export, offline sync, voice notes, image attachments, notifications, backup/restore, i18n. Ask and I'll add them.
