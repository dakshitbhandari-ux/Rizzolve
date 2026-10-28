# Doubt Chain Backend (Serverless Postgres / Supabase)

Doubt Chain is a B2B SaaS platform for university peer-to-peer doubt resolution — a gamified Stack Overflow designed for academia.

This backend bypasses traditional Express servers in favor of a serverless, Postgres-first architecture leveraging Supabase, Row Level Security (RLS) for tenant isolation, and `pg_trgm` for instant duplicate doubt detection.

---

## Architecture Overview

1. **Multi-Tenant Isolation**:
   - Every core entity (`profiles`, `communities`, `doubts`, `answers`) belongs to a `university_id`.
   - Postgres Row Level Security (RLS) ensures users can **only query, insert, or modify data belonging to their own university**.
   - Helper function `public.get_auth_university_id()` caches tenant lookup safely via `SECURITY DEFINER` and `STABLE`.

2. **Gamification Engine**:
   - **Profiles**: Track `reputation` points and `badges`.
   - **Doubts**: Support `bounty_amount` (reputation points pledged by the author) and `net_score` (`upvoted_by` vs `downvoted_by`).
   - **Answers**: Support `is_accepted` (which releases bounties/reputation) and `is_instructor_endorsed` (faculty validation).

3. **Search-Before-Posting Duplicate Detection**:
   - Powered by the PostgreSQL `pg_trgm` extension and a GIN index on `doubts.title`.
   - The `search_similar_doubts(search_query)` RPC performs real-time fuzzy text matching ranked by trigram similarity, strictly scoped to the student's university.

---

## Directory Structure

```text
├── lib/
│   ├── database.types.ts         # TypeScript schema definitions (Tables, Relationships, RPCs, Enums)
│   └── supabase.ts               # Fully-typed Supabase client initialization
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql # Core DDL, FK constraints, gamification, indexes, and RLS policies
│       └── 002_search_rpc.sql     # pg_trgm fuzzy similarity search function
├── .env.example                  # Template for required environment variables
├── package.json                  # Dependencies: @supabase/supabase-js, supabase (dev), typescript
├── tsconfig.json                 # TypeScript compiler configuration
└── README.md
```

---

## Local Development Workflow

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your project's `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### 2. Local Supabase CLI Commands

To run a local Postgres & Supabase stack:

```bash
# Initialize Supabase config (first time)
npx supabase init

# Start local Supabase containers (Postgres, Auth, Storage, Studio)
npm run db:start

# Apply migrations
npm run db:reset

# Regenerate TypeScript types from your local database schema
npm run db:types
```

### 3. Build & Typecheck

```bash
npm run build
```

---

## Using the Client in Application Code

```typescript
import { supabase } from './lib/supabase';

// 1. Instant fuzzy duplicate search before student posts a new doubt
const { data: duplicates, error: searchError } = await supabase.rpc('search_similar_doubts', {
  search_query: 'How to implement Dijkstra in Python?',
  similarity_threshold: 0.25,
  match_limit: 5,
});

// 2. Fetching doubts (RLS automatically filters by caller's university_id)
const { data: doubts, error } = await supabase
  .from('doubts')
  .select(`
    id,
    title,
    body,
    status,
    bounty_amount,
    net_score,
    created_at,
    author:profiles(name, avatar_url, reputation)
  `)
  .order('created_at', { ascending: false });
```
