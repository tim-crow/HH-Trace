# Hemp Harvests — Traceability System

Internal traceability and inventory management system for Hemp Harvests.

## Features

- **Receival** — log incoming raw materials with batch codes
- **Processing** — record dehulling, pressing, and additional processing (milling, blending, filtering, packing)
- **Outgoing** — track dispatched goods with customer and freight details
- **Live Inventory** — real-time view of all stock by product type, batch, and location
- **Order Management** — customer orders with status workflow and overdue tracking
- **Audit Log** — full history of who did what, when (admin only)
- **Role-based Access** — Admin (full access) and Operator (data entry) with PIN protection

## Product Types

| Category | Products |
|----------|----------|
| Raw | Whole Seeds |
| Dehulling | Hemp Hearts, Hemp Hulls, Hemp Lights, Overs |
| Pressing | Hemp Oil (Raw), Hemp Meal Cake, Hemp Protein Cake |
| Additional Processing | Hemp Oil (Filtered), Hemp Protein Powder (50), Hemp Protein Powder (65) |
| Finished Goods | Hemp Seeds (420g, 250g, 15kg), Oil 250ml, Protein Powder 65 (250g, 420g, 4.2kg, 15kg), Protein Powder 50 15kg |
| Other | Packaging |

## Tech Stack

- **Next.js** (React)
- **Tailwind CSS** + **shadcn/ui** components
- **Supabase** (PostgreSQL database)
- **Vercel** (hosting)

## Setup

```bash
pnpm install
pnpm dev
```

Requires `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
