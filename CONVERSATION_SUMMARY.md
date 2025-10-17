# Tweet Learning Path Tool - Development Conversation

**Thread URL:** https://ampcode.com/threads/T-dc7dbe98-4fea-4fe3-bcc1-0e32d679c7b8  
**Date:** October 17, 2025

## Overview

This conversation documents the design and architecture planning for a tweet analysis and learning path management tool that uses the Feynman technique for learning.

## Key Objectives

1. Create a tool that analyzes tweets and allows users to tag them as "repurpose" or "learn"
2. For "learn" tagged tweets, create learning paths with labels
3. Implement the Feynman technique as the core learning methodology
4. Use Supabase for database and authentication
5. Support multi-user functionality with proper data isolation

## Design Process

### Phase 1: Initial Architecture Design

**Request:** Design a system that takes tweets, analyzes them, and allows users to tag them. The "learn" selection creates a learning path and labels tweets for grouping.

**Solution:** Consulted with Oracle to design a comprehensive system with:
- Monolithic API + Web application
- SQLite database with Prisma ORM (initial design)
- Background worker for LLM analysis
- RESTful API endpoints
- React frontend with minimal UI

**Key Components:**
- **Data Models:** Tweet, LearningPath, Label, TweetLabel (join table)
- **Analysis Worker:** Uses OpenAI API to summarize tweets and suggest labels
- **Tagging Flow:** Users tag tweets as "repurpose" or "learn"
- **Label Management:** Multiple tweets can share labels, labels belong to learning paths

### Phase 2: Feynman Technique Integration

**Request:** Update the system to use the Feynman technique for learning paths.

**Feynman Technique Stages:**
1. Choose a concept to learn
2. Teach/explain it in simple terms
3. Identify knowledge gaps
4. Review and simplify further

**Solution:** Enhanced the architecture with:
- **New Models:**
  - `FeynmanSession`: Tracks learning progress through stages
  - `Explanation`: Versioned explanations with LLM evaluation
  - `Gap`: Knowledge gaps with tweet references for resolution

- **LLM Prompts:**
  - Evaluate explanation: Returns clarity score, grade level, complexity, key points
  - Suggest gaps: Identifies missing knowledge and assumptions
  - Simplify rewrite: Rewrites explanations for specific audiences

- **UI Workflow:**
  - Stepper component guiding users through Feynman stages
  - Explanation editor with versioning
  - Gaps panel for tracking and resolving knowledge gaps
  - Integration with existing tweet lists for context

### Phase 3: Supabase and User Management

**Request:** Use Supabase as the database and add user management with NextAuth for authorization.

**Solution:** Migrated architecture to multi-tenant with Supabase:

**Database Changes:**
- Replaced SQLite/Prisma with Supabase Postgres
- Added `userId` field to all tables (foreign key to auth.users)
- Implemented Row Level Security (RLS) policies on all tables
- Updated unique constraints to be scoped by userId

**Authentication:**
- **Primary:** Supabase Auth (OAuth/email providers)
- **Optional:** NextAuth as thin session wrapper (if needed)
- JWTs with auth.uid() for RLS enforcement
- API middleware validates tokens and injects user context

**Security Model:**
- End-user JWT-bound Supabase client for all user requests
- Service role key only for background worker (with explicit userId)
- RLS policies enforce user_id = auth.uid() on all operations
- Per-request Supabase client creation with user token

**Key Updates:**
- All API endpoints now require authentication
- Users can only access their own data (enforced at DB level)
- Supabase client setup for web and API
- Auth middleware for request validation

## Final Architecture

### Technology Stack
- **Backend:** Node.js 20+, TypeScript, Fastify, zod, @supabase/supabase-js
- **Frontend:** React + Vite + TypeScript, Tailwind CSS
- **Database:** Supabase Postgres with RLS
- **Auth:** Supabase Auth (JWT)
- **Background Jobs:** In-process queue (p-queue)
- **LLM:** OpenAI API (gpt-4o-mini)
- **Testing:** Vitest, supertest, React Testing Library
- **Lint/Format:** ESLint, Prettier

### Data Models

All models include `userId` for multi-tenancy:

1. **Tweet** - Raw tweet data with analysis results
2. **LearningPath** - Top-level learning path container
3. **Label** - Concepts within learning paths
4. **TweetLabel** - Join table linking tweets to labels
5. **FeynmanSession** - Learning session with stage tracking
6. **Explanation** - Versioned explanations with LLM evaluation
7. **Gap** - Knowledge gaps with resolution tracking

### API Structure

**Tweets:** Ingestion, tagging, analysis, filtering  
**Labels:** CRUD, tweet attachment  
**Learning Paths:** CRUD, viewing with nested data  
**Feynman Sessions:** Create, advance stages  
**Explanations:** Create, evaluate, simplify  
**Gaps:** Create, suggest, resolve  

All endpoints protected by Supabase Auth middleware.

### Implementation Milestones

1. Schema + API skeleton (M)
2. Ingestion + analysis worker (M)
3. Tagging flow (M)
4. Minimal UI (L)
5. Reordering logic (M)
6. Feynman core (M-L)
7. Polish (M)

*Scope: S <1h, M 1–3h, L 1–2d, XL >2d*

## Key Design Decisions

### Why Supabase Auth over NextAuth?
- First-class RLS integration with auth.uid()
- Fewer moving parts and simpler operations
- Built-in OAuth/email providers
- Automatic token refresh
- NextAuth recommended only if needed for provider aggregation or custom sessions

### Why RLS?
- Database-level security enforcement
- No manual ACL logic in application code
- Impossible to accidentally bypass with correct setup
- Per-request user context automatically applied

### Why In-Process Queue?
- Simpler infrastructure for MVP
- No Redis dependency
- Easy to migrate to BullMQ later if needed

### Why Feynman Technique?
- Proven learning methodology
- Structured approach to knowledge gaps
- Natural fit for tweet-based learning
- Encourages active learning over passive consumption

## Security Guardrails

1. **Never use service_role in request handlers** - Only for background workers
2. **All tables must have RLS enabled** - CI check recommended
3. **Always set userId explicitly on INSERT** - Never rely on defaults
4. **Handle token expiration gracefully** - Use supabase-js auto-refresh
5. **Validate all user input** - Use zod schemas

## Future Enhancements

- Better queue with BullMQ + Redis
- Semantic search with pgvector embeddings
- Real-time updates via WebSocket/SSE
- Analytics and progress tracking
- Export to markdown/Notion
- Rich drag-and-drop UI
- Keyboard shortcuts and bulk operations

## Files Created

- `/Users/moe/kplan/AGENTS.md` - Complete system documentation

## Commands Reference

```bash
# Development
pnpm dev          # Start both API and web
pnpm build        # Build all packages
pnpm typecheck    # Run type checking
pnpm lint         # Run linting
pnpm ci           # Full CI pipeline

# Database
pnpm db:push      # Apply migrations to Supabase
pnpm db:reset     # Reset database
pnpm supabase:start  # Start local Supabase

# API
pnpm api:dev      # Start API dev server
pnpm api:test     # Run API tests

# Web
pnpm web:dev      # Start web dev server
pnpm web:build    # Build web app
pnpm web:test     # Run web tests
```

## Environment Variables

### API
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-api-key
PORT=3000
NODE_ENV=development
```

### Web
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Next Steps

1. Set up Supabase project and obtain credentials
2. Create database schema with RLS policies
3. Implement API endpoints with auth middleware
4. Build React UI with authentication flow
5. Integrate OpenAI API for analysis
6. Test end-to-end with real user accounts
7. Deploy to production

## Oracle Consultations

Used Oracle (GPT-5 reasoning model) three times for:
1. Initial system architecture and MVP design
2. Feynman technique integration strategy
3. Supabase migration and multi-tenant authentication design

Oracle provided detailed analysis of trade-offs, risks, and implementation approaches for each phase.
