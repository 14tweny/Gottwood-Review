# Festival Production Review

A technical debrief tool for festival production teams. Review lighting, sound, design, crowd flow and more — by area, by festival, by year.

## Stack
- React + Vite
- Supabase (Postgres database)
- Deployed on Vercel

---

## 1. Supabase Setup

Run this SQL in your Supabase SQL Editor:

```sql
create table reviews (
  id uuid default gen_random_uuid() primary key,
  festival text not null,
  year text not null,
  area_id text not null,
  area_name text not null,
  area_emoji text default '📍',
  category_id text not null,
  rating integer check (rating >= 1 and rating <= 5),
  worked_well text default '',
  needs_improvement text default '',
  notes text default '',
  updated_at timestamp with time zone default now(),
  unique(festival, year, area_id, category_id)
);

alter table reviews enable row level security;
create policy "Public read/write" on reviews for all using (true) with check (true);

-- Required for live sync across devices (Supabase Realtime)
alter publication supabase_realtime add table reviews;
```

---

## 2. Local Development

```bash
npm install
npm run dev
```

The `.env` file is already configured with your Supabase credentials.

---

## 3. Deploy to Vercel

1. Push this folder to a GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   # create a new repo on github.com, then:
   git remote add origin https://github.com/YOUR_USERNAME/festival-review.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com) → **Add New Project** → Import your GitHub repo

3. In the **Environment Variables** section add:
   - `VITE_SUPABASE_URL` = `https://qfcqjhpkvzkgzlfamdff.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon key

4. Click **Deploy** — you'll get a live URL in ~2 minutes.

5. Share the URL with your team. Done.

---

## Features
- Three festivals pre-loaded: Gottwood, Peep, Soysambu
- 10 production categories per area: Lighting, Sound, Design, Space, Decor, Crowd Flow, Power, Staging, Comms, Safety
- 5-point colour-coded rating system
- "What worked / needs improvement / notes" per category
- Add custom areas per festival
- Multi-year comparison (2022–2026)
- Auto-saves to Supabase on every change
- All team members see the same data in real time
