# Tweet Learning Path Tool - AGENTS.md

## Overview

**Purpose:** Analyze tweets and organize them into curated learning paths. Each tweet can be tagged by a user as "repurpose" or "learn." "Learn" tweets are labeled and grouped into learning paths. Each Label represents a concept that can be learned using the Feynman technique:
1. Choose a concept
2. Teach/explain it in simple terms
3. Identify knowledge gaps
4. Review and simplify further

**Design Goals:** Human-in-the-loop curation, simple and maintainable architecture, minimal infrastructure. The Feynman technique is implemented as an iterative, lightweight workflow attached to Labels.

## System Architecture

### Components

1. **API + Web (Monolith)**
   - REST endpoints for tweet ingestion, tagging, label/path management, and retrieval (all protected by Supabase Auth)
   - Lightweight React UI with authentication
   - Background job runner (in-process) for async LLM analysis
   - All user-scoped DB operations run with end-user Supabase JWT (RLS enforces isolation)

2. **Analysis Worker (Module)**
   - Consumes "analyze_tweet" jobs
   - Calls LLM for summary/topics/suggested labels
   - Stores results in Supabase (uses service_role key, writes userId explicitly)

3. **Data Store**
   - Supabase Postgres (managed)
   - Row Level Security (RLS) enabled on all user tables for multi-tenant isolation

4. **Auth**
   - Supabase Auth provides user identities and JWTs
   - Web app signs in with @supabase/supabase-js
   - API validates JWTs via middleware

5. **LLM Provider**
   - OpenAI API (abstracted behind service interface)

## Data Flow

1. **Ingest tweet** (raw text or URL) → persist Tweet record (status=pending) → enqueue analyze_tweet job
2. **Analysis Worker:** summarize, extract topics, suggest labels → update Tweet.analysis fields; status=ready_for_tagging
3. **User tags tweet:** repurpose or learn
   - If repurpose: set tag=repurpose. Done.
   - If learn: choose/create Label; label is associated to exactly one LearningPath
4. **Assign label to tweet:** create TweetLabel join row; tweet now appears under the label inside its LearningPath
5. **View LearningPath:** ordered labels → ordered tweets per label
6. **Feynman learning flow** (per Label/concept):
   - Start or continue FeynmanSession for the Label (stage defaults to "choose")
   - Stage: choose → confirm concept (the Label) and review tweets
   - Stage: explain → user writes Explanation v1 (plain language); optionally run LLM evaluation
   - Stage: gaps → user adds Gap items (manually and/or via LLM suggestions), link relevant tweets; resolve gaps by reading/adding tweets and notes
   - Stage: simplify → create a new Explanation version that is simpler; optionally run LLM simplification/evaluation; repeat steps 2–4 until gaps resolved and clarity is good, then mark session complete

## Data Models

### Tweet
```typescript
{
  id: string (uuid)
  userId: string (uuid, fk auth.users.id, indexed)
  tweetId: string | null
  url: string | null
  authorHandle: string | null
  text: string
  createdAt: Date
  collectedAt: Date
  status: 'pending' | 'analyzed' | 'ready_for_tagging' | 'tagged'
  userTag: 'learn' | 'repurpose' | null
  analysis: {
    summary: string | null
    topics: string[] | null
    suggestedLabels: string[] | null
    confidence: number | null
  }
  // Unique (userId, tweetId) when tweetId present
}
```

### LearningPath
```typescript
{
  id: string
  userId: string (uuid, fk auth.users.id)
  title: string
  description: string | null
  position: int
  createdAt: Date
  updatedAt: Date
}
```

### Label
```typescript
{
  id: string
  userId: string (uuid, fk auth.users.id)
  name: string
  description: string | null
  learningPathId: string (foreign key)
  position: int
  createdAt: Date
  updatedAt: Date
  // Unique (userId, learningPathId, name)
}
```

### TweetLabel (Join Table)
```typescript
{
  id: string
  userId: string (uuid, fk auth.users.id)
  tweetId: string (foreign key)
  labelId: string (foreign key)
  position: int
  createdAt: Date
  // Unique (userId, tweetId, labelId)
}
```

### FeynmanSession
```typescript
{
  id: string
  userId: string (uuid, fk auth.users.id)
  labelId: string (foreign key to Label)
  stage: 'choose' | 'explain' | 'gaps' | 'simplify' | 'complete'
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  // Unique (userId, labelId, isActive=true)
}
```

### Explanation
```typescript
{
  id: string
  userId: string (uuid, fk auth.users.id)
  sessionId: string (foreign key)
  version: number
  audience: string | null
  text: string
  llmEvaluation: {
    clarity: number | null
    gradeLevel: number | null
    complexity: 'simple' | 'ok' | 'too complex' | null
    keyPoints: string[] | null
    suggestedGaps: string[] | null
  } | null
  createdAt: Date
}
```

### Gap
```typescript
{
  id: string
  userId: string (uuid, fk auth.users.id)
  sessionId: string (foreign key)
  explanationVersion: number | null
  description: string
  tweetIds: string[] | null
  resolved: boolean
  resolutionNote: string | null
  createdAt: Date
  resolvedAt: Date | null
}
```

## Key Features & Workflows

### Ingest & Analyze Tweet
- POST /tweets with text or URL → returns tweet with status=pending
- Worker analyzes → updates analysis + status=ready_for_tagging

### Tagging
- POST /tweets/:id/tag with { userTag: "repurpose" | "learn" }
- If learn: UI offers create/select Label (and implicitly selects/creates LearningPath)

### Label Management
- Users create labels with a parent learning path
- Multiple tweets can share a label
- Labels are ordered within a path, tweets are ordered within a label

### Learning Path Management
- CRUD learning paths
- Viewing a path shows labels in order
- Expanding a label shows ordered tweets

### Reorganization
- Drag-and-drop reorder labels within a path
- Reorder tweets within a label
- Move tweet to another label in same or different path

### Search and Filter (MVP)
- Filter by tag (learn/repurpose), label, path
- Keyword search across tweet.text and analysis.summary

### Feynman Learning Workflow (per Label/concept)
- **Start session:** Create or resume the active FeynmanSession for the Label; stage=choose
- **Choose concept:** Confirm the Label represents the concept to learn; review tweets under the Label
- **Explain:** Write Explanation v1 in simple terms; set audience (default "peer new to topic"); optionally "Evaluate" → LLM returns clarity score, grade level, key points, and suggested gaps
- **Identify gaps:** Add Gap items; optionally attach relevant tweets that might help resolve; use "Suggest gaps from explanation" to auto-generate candidates; user selects which to keep; resolve gaps by reading tweets, adding notes; mark gaps resolved
- **Review & simplify:** Create a new Explanation version that is simpler, addressing gaps; optionally "Simplify with guidance" → LLM proposes a rewrite for a specified audience (e.g., "5-year-old"); re-run evaluation; when clarity high and gaps resolved, mark stage=complete

## Technology Stack

- **Backend:** Node.js 20+, TypeScript, Fastify (or Express), zod, Supabase Postgres (@supabase/supabase-js)
- **Frontend:** React + Vite + TypeScript, Tailwind CSS (optional)
- **Auth:** Supabase Auth (JWT), Row Level Security (RLS) on all user tables
- **Background Jobs:** In-process queue (simple FIFO with p-queue). Move to BullMQ + Redis later if needed
- **LLM:** OpenAI API (gpt-4o-mini or similar). Provider interface for model swapping
- **Testing:** Vitest, supertest for API, React Testing Library for UI
- **Lint/Format:** ESLint, Prettier

## API Surface (MVP)

### Tweets
- `POST /tweets { text?, url? }` → { tweet }
- `GET /tweets?status=&userTag=&labelId=&pathId=&q=` → { tweets }
- `GET /tweets/:id` → { tweet }
- `POST /tweets/:id/tag { userTag: "learn" | "repurpose" }` → { tweet }
- `POST /labels/:labelId/attach-tweet { tweetId, position? }` → { ok }
- `POST /labels/:labelId/detach-tweet { tweetId }` → { ok }

### Labels
- `POST /labels { name, learningPathId, description?, position? }` → { label }
- `PATCH /labels/:id { name?, description?, position?, learningPathId? }` → { label }
- `GET /labels?learningPathId=` → { labels }

### Learning Paths
- `POST /learning-paths { title, description?, position? }` → { path }
- `PATCH /learning-paths/:id { title?, description?, position? }` → { path }
- `GET /learning-paths` → { paths }
- `GET /learning-paths/:id` → { path, labels: [...], tweetsByLabel: { labelId: Tweet[] } }

### Admin/Jobs
- `POST /tweets/:id/reanalyze` → enqueue analysis

### Feynman Sessions
- `POST /feynman/sessions { labelId }` → { session } // creates or returns active session for label
- `GET /feynman/sessions?labelId=` → { sessions }
- `GET /feynman/sessions/:id` → { session, explanations, gaps }
- `POST /feynman/sessions/:id/advance` → { session } // advance to next stage

### Explanations
- `POST /feynman/sessions/:id/explanations { text, audience? }` → { explanation }
- `POST /feynman/explanations/:id/evaluate` → { explanation } // updates llmEvaluation
- `POST /feynman/explanations/:id/simplify { audience? }` → { draftText, notes } // returns suggested rewrite

### Gaps
- `POST /feynman/sessions/:id/gaps { description, tweetIds? }` → { gap }
- `POST /feynman/sessions/:id/suggest-gaps` → { suggestions: string[] } // from latest explanation
- `PATCH /feynman/gaps/:id { description?, tweetIds?, resolved?, resolutionNote? }` → { gap }

## LLM Prompts

### Tweet Analysis
**System:** "You are a classifier that summarizes tweets and proposes 1–3 short labels for learning path organization."

**User:** "Tweet: <text>. Respond with JSON: { summary: string (<= 200 chars), topics: string[], suggestedLabels: string[] (short, kebab/snake case), confidence: 0..1 }"

**Guardrails:** Fall back to empty suggestions on error; never block user tagging.

### Evaluate Explanation
**System:** "You are a clear, strict evaluator of explanations. Be concise and concrete."

**User:** "Context tweets (bullet list of summaries, optional). Explanation (audience=<audience>): <text>. Output JSON: { clarity: 0..1, gradeLevel: int, complexity: 'simple' | 'ok' | 'too complex', keyPoints: string[], suggestedGaps: string[] }"

### Suggest Gaps
**System:** "You identify missing knowledge and assumptions in an explanation."

**User:** "Given the explanation and the topic derived from the Label name and tweet summaries, list specific knowledge gaps and unstated assumptions the learner should research. Output JSON: { suggestions: string[] }"

### Simplify Rewrite
**System:** "You rewrite content for a specified audience with maximum simplicity and fidelity."

**User:** "Explanation vN: <text>. Audience: <audience>. Rewrite it in simpler terms while preserving correctness. Output plain text plus 3 bullets: what changed, any lost nuance, suggested analogy."

## Supabase Client Setup

### Web Client
```typescript
// apps/web/src/api/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  { auth: { persistSession: true, autoRefreshToken: true } }
);
```

### API Auth Middleware
```typescript
// apps/api/src/plugins/auth.ts
import { createClient } from '@supabase/supabase-js';

export async function authMiddleware(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).send({ error: 'Unauthorized' });

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return res.status(401).send({ error: 'Unauthorized' });

  req.userId = user.id;
  req.supabase = supabase; // Use this for all DB queries
}
```

### Worker Service Role Client
```typescript
// apps/api/src/db/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
```

## Row Level Security (RLS)

### Enable RLS on All Tables
```sql
alter table tweets enable row level security;
alter table learning_paths enable row level security;
alter table labels enable row level security;
alter table tweet_labels enable row level security;
alter table feynman_sessions enable row level security;
alter table explanations enable row level security;
alter table gaps enable row level security;
```

### Example RLS Policies (Apply to all tables)
```sql
-- Tweets
create policy "tweet_select_own" on public.tweets 
  for select using (user_id = auth.uid());
create policy "tweet_insert_own" on public.tweets 
  for insert with check (user_id = auth.uid());
create policy "tweet_update_own" on public.tweets 
  for update using (user_id = auth.uid());
create policy "tweet_delete_own" on public.tweets 
  for delete using (user_id = auth.uid());
```

## Code Organization

```
/apps/api
  src/
    index.ts (Fastify bootstrap)
    routes/
      tweets.ts
      labels.ts
      paths.ts
      feynman.ts
    services/
      analysis.ts (LLM calls)
      labels.ts
      paths.ts
      feynman.ts
    queue/
      inmemory.ts (enqueue, worker loop)
    plugins/
      auth.ts (Supabase auth middleware)
    db/
      supabaseAdmin.ts (service role client)
    schemas/
      *.ts (zod schemas)
  supabase/
    migrations/ (SQL migration files)
  test/
    api/*.test.ts

/apps/web
  src/
    pages/
      Inbox.tsx
      TweetDetail.tsx
      Paths.tsx
      Labels.tsx
      FeynmanWizard.tsx
    components/
      TweetCard.tsx
      LabelPicker.tsx
      PathTree.tsx
      ExplanationEditor.tsx
      GapsPanel.tsx
      FeynmanStepper.tsx
    api/
      supabase.ts (Supabase client)
      client.ts
    state/
      (zustand or React context)
  test/

/packages/shared
  types/ (DTOs, feynman.ts)
  schemas/ (zod, feynman.ts)
  api-client-types/
```

## Commands

### Core Commands
```bash
pnpm dev          # Start both API and web in dev mode
pnpm build        # Build all packages
pnpm start        # Start production API
pnpm typecheck    # Run TypeScript type checking
pnpm lint         # Run ESLint
pnpm format       # Format code with Prettier
pnpm ci           # Run full CI pipeline (lint + typecheck + test)
```

### API Commands
```bash
pnpm api:dev           # Start API in dev mode (tsx apps/api/src/index.ts)
pnpm api:test          # Run API tests (vitest run apps/api)
pnpm db:gen            # Generate SQL migrations
pnpm db:push           # Apply local SQL to Supabase (supabase db push)
pnpm db:reset          # Reset database (supabase db reset)
pnpm supabase:start    # Start local Supabase (Docker)
pnpm supabase:stop     # Stop local Supabase
```

### Web Commands
```bash
pnpm web:dev      # Start web app in dev mode (vite)
pnpm web:build    # Build web app (vite build)
pnpm web:test     # Run web tests (vitest run apps/web)
```

## Implementation Milestones

1. **Schema + API skeleton** (M) - Tweet, Label, LearningPath, joins; basic REST; SQLite
2. **Ingestion + analysis worker** (M) - In-process queue; LLM integration; error handling
3. **Tagging flow** (M) - repurpose/learn with label attach and path linkage
4. **Minimal UI** (L) - Inbox, Tweet detail, Path viewer; search/filter
5. **Reordering logic** (M) - Labels in path, tweets in label
6. **Feynman core** (M-L) - Schema + Prisma models/migrations; API routes + service; UI: Feynman tab with stepper, explanation editor, gaps panel, evaluation; LLM integration: 3 prompts + error handling
7. **Polish** (M) - Tests, lint, seed data, dockerfile (optional)

*Scope estimates: S <1h, M 1–3h, L 1–2d, XL >2d*

## Code Style & Conventions

- Use TypeScript strict mode
- Follow functional programming patterns where possible
- Use zod for all request/response validation
- Keep components small and focused
- Use explicit types, avoid `any`
- Write tests for business logic and API endpoints
- Follow REST conventions for API endpoints

## Environment Variables

### API
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-api-key-here
PORT=3000
NODE_ENV=development
```

### Web
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Risks & Guardrails

- **LLM variability:** Capture confidence and show suggestions as non-binding; keep manual override
- **Data integrity:** Enforce unique (tweetId) and unique (label.name within learningPath); cascade deletes carefully
- **Ordering drift:** Store explicit position fields and provide reorder APIs using integer positions
- **Tweet source:** If scraping URLs, be aware of API/TOS; allow manual paste to avoid dependence
- **RLS bypass risk:** If the API accidentally uses service_role key for user requests, RLS is bypassed. Never use service role in request-bound code; enforce a lint rule or wrapper
- **Token expiration:** Handle 401 from Supabase, refresh in client via supabase-js auto-refresh
- **Missing RLS:** Ensure all tables include userId and have RLS enabled. Missing userId or missing policy = data leaks

## Future Enhancements (Advanced Path)

When scale or complexity demands it, consider:
- **Multi-user:** OAuth login, RBAC, per-user/project isolation
- **Better Queue:** BullMQ + Redis for retries and back-pressure
- **Semantic Search:** pgvector embeddings for similarity search and auto-grouping
- **Real-time Updates:** WebSocket or SSE for live UI updates
- **Analytics:** Progress metrics, completion tracking, export to markdown/Notion
- **UI Enhancements:** Rich drag-and-drop, keyboard shortcuts, bulk operations

## Notes on Auth: Supabase Auth vs NextAuth

**Current Recommendation:** Use Supabase Auth only. It provides OAuth/email providers, JWTs with auth.uid(), and first-class RLS integration. Fewer moving parts and simpler operations.

**If you need NextAuth:**
- Use NextAuth primarily for UI/session ergonomics
- Store the Supabase access_token on the session and forward it in API requests
- Continue to enforce authorization via Supabase RLS; do not duplicate user tables
- NextAuth acts as a thin wrapper, not a replacement for Supabase Auth
