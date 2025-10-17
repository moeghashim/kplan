# kplan - Tweet Learning Path Tool

A tool to analyze tweets and organize them into curated learning paths using the Feynman technique.

## Features

- **Tweet Analysis**: Automatically analyze tweets using OpenAI to extract summaries, topics, and suggested labels
- **Learning Paths**: Organize tweets into structured learning paths with labels
- **Feynman Technique**: Interactive learning workflow with explanation, gap identification, and simplification stages
- **Multi-user Support**: Full authentication and data isolation via Supabase RLS
- **Background Processing**: In-process job queue for async tweet analysis

## Architecture

- **Backend**: Fastify + TypeScript + Supabase
- **Frontend**: React + Vite + TypeScript
- **Database**: Supabase Postgres with Row Level Security
- **Auth**: Supabase Auth
- **LLM**: OpenAI API (gpt-4o-mini)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Supabase account
- OpenAI API key

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Edit the .env files with your credentials
```

### Database Setup

1. Create a new Supabase project
2. Run the migration file in the SQL editor:
   ```bash
   # Copy the contents of apps/api/supabase/migrations/20250101000000_initial_schema.sql
   # and run it in the Supabase SQL editor
   ```

### Development

```bash
# Start both API and web in dev mode
pnpm dev

# Or run individually
pnpm api:dev  # API on port 3000
pnpm web:dev  # Web on port 5173
```

### Build

```bash
# Build all packages
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Project Structure

```
kplan/
├── apps/
│   ├── api/          # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/    # Business logic
│   │   │   ├── plugins/     # Auth middleware
│   │   │   ├── queue/       # Job queue
│   │   │   └── db/          # Database clients
│   │   └── supabase/
│   │       └── migrations/  # SQL migrations
│   └── web/          # React web app
│       └── src/
│           ├── pages/       # Page components
│           ├── components/  # Reusable components
│           └── api/         # API client
└── packages/
    └── shared/       # Shared types and schemas
        └── src/
            ├── types/       # TypeScript types
            └── schemas/     # Zod validation schemas
```

## API Endpoints

### Tweets
- `POST /tweets` - Create tweet
- `GET /tweets` - List tweets (with filters)
- `GET /tweets/:id` - Get single tweet
- `POST /tweets/:id/tag` - Tag tweet as learn/repurpose
- `POST /tweets/:id/reanalyze` - Re-analyze tweet

### Learning Paths
- `POST /learning-paths` - Create path
- `GET /learning-paths` - List paths
- `GET /learning-paths/:id` - Get path with details
- `PATCH /learning-paths/:id` - Update path
- `DELETE /learning-paths/:id` - Delete path

### Labels
- `POST /labels` - Create label
- `GET /labels` - List labels
- `PATCH /labels/:id` - Update label
- `POST /labels/:labelId/attach-tweet` - Attach tweet to label
- `POST /labels/:labelId/detach-tweet` - Detach tweet from label

### Feynman Sessions
- `POST /feynman/sessions` - Create/get session
- `GET /feynman/sessions/:id` - Get session with details
- `POST /feynman/sessions/:id/advance` - Advance stage
- `POST /feynman/sessions/:id/explanations` - Create explanation
- `POST /feynman/explanations/:id/evaluate` - Evaluate explanation
- `POST /feynman/explanations/:id/simplify` - Simplify explanation
- `POST /feynman/sessions/:id/gaps` - Create gap
- `POST /feynman/sessions/:id/suggest-gaps` - Suggest gaps
- `PATCH /feynman/gaps/:id` - Update gap

## Environment Variables

### API
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
PORT=3000
NODE_ENV=development
```

### Web
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:3000
```

## Security

- All user data is isolated via Supabase Row Level Security (RLS)
- API endpoints require authentication via Supabase JWT
- Service role key is only used by background workers
- All requests use per-user Supabase clients

## Development Workflow

1. **Add a new feature**:
   - Add types to `packages/shared/src/types`
   - Add validation schemas to `packages/shared/src/schemas`
   - Implement API routes in `apps/api/src/routes`
   - Create UI components in `apps/web/src`

2. **Database changes**:
   - Create migration in `apps/api/supabase/migrations`
   - Apply via Supabase dashboard or CLI
   - Update types in shared package

3. **Testing**:
   ```bash
   pnpm test         # Run all tests
   pnpm api:test     # API tests
   pnpm web:test     # Web tests
   ```

## Next Steps

- [ ] Set up Supabase project and configure credentials
- [ ] Install dependencies: `pnpm install`
- [ ] Run database migrations
- [ ] Start development servers: `pnpm dev`
- [ ] Build web UI components
- [ ] Add comprehensive tests
- [ ] Set up CI/CD pipeline
- [ ] Deploy to production

## License

MIT

## Documentation

For detailed system architecture and design decisions, see [AGENTS.md](./AGENTS.md).
