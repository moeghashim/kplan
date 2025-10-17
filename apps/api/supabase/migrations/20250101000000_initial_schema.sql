-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Tweets table
create table public.tweets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tweet_id text,
  url text,
  author_handle text,
  text text not null,
  created_at timestamptz,
  collected_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'analyzed', 'ready_for_tagging', 'tagged')),
  user_tag text check (user_tag in ('learn', 'repurpose')),
  analysis jsonb,
  constraint tweets_user_tweet_unique unique (user_id, tweet_id)
);

create index idx_tweets_user_id on public.tweets(user_id);
create index idx_tweets_status on public.tweets(status);
create index idx_tweets_user_tag on public.tweets(user_tag);

-- Enable RLS
alter table public.tweets enable row level security;

-- RLS policies for tweets
create policy "tweets_select_own" on public.tweets for select using (user_id = auth.uid());
create policy "tweets_insert_own" on public.tweets for insert with check (user_id = auth.uid());
create policy "tweets_update_own" on public.tweets for update using (user_id = auth.uid());
create policy "tweets_delete_own" on public.tweets for delete using (user_id = auth.uid());

-- Learning Paths table
create table public.learning_paths (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_learning_paths_user_id on public.learning_paths(user_id);
create index idx_learning_paths_position on public.learning_paths(user_id, position);

-- Enable RLS
alter table public.learning_paths enable row level security;

-- RLS policies for learning_paths
create policy "learning_paths_select_own" on public.learning_paths for select using (user_id = auth.uid());
create policy "learning_paths_insert_own" on public.learning_paths for insert with check (user_id = auth.uid());
create policy "learning_paths_update_own" on public.learning_paths for update using (user_id = auth.uid());
create policy "learning_paths_delete_own" on public.learning_paths for delete using (user_id = auth.uid());

-- Labels table
create table public.labels (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  learning_path_id uuid references public.learning_paths(id) on delete cascade not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint labels_user_path_name_unique unique (user_id, learning_path_id, name)
);

create index idx_labels_user_id on public.labels(user_id);
create index idx_labels_learning_path_id on public.labels(learning_path_id);
create index idx_labels_position on public.labels(learning_path_id, position);

-- Enable RLS
alter table public.labels enable row level security;

-- RLS policies for labels
create policy "labels_select_own" on public.labels for select using (user_id = auth.uid());
create policy "labels_insert_own" on public.labels for insert with check (user_id = auth.uid());
create policy "labels_update_own" on public.labels for update using (user_id = auth.uid());
create policy "labels_delete_own" on public.labels for delete using (user_id = auth.uid());

-- Tweet Labels join table
create table public.tweet_labels (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tweet_id uuid references public.tweets(id) on delete cascade not null,
  label_id uuid references public.labels(id) on delete cascade not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tweet_labels_user_tweet_label_unique unique (user_id, tweet_id, label_id)
);

create index idx_tweet_labels_user_id on public.tweet_labels(user_id);
create index idx_tweet_labels_tweet_id on public.tweet_labels(tweet_id);
create index idx_tweet_labels_label_id on public.tweet_labels(label_id);
create index idx_tweet_labels_position on public.tweet_labels(label_id, position);

-- Enable RLS
alter table public.tweet_labels enable row level security;

-- RLS policies for tweet_labels
create policy "tweet_labels_select_own" on public.tweet_labels for select using (user_id = auth.uid());
create policy "tweet_labels_insert_own" on public.tweet_labels for insert with check (user_id = auth.uid());
create policy "tweet_labels_update_own" on public.tweet_labels for update using (user_id = auth.uid());
create policy "tweet_labels_delete_own" on public.tweet_labels for delete using (user_id = auth.uid());

-- Feynman Sessions table
create table public.feynman_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label_id uuid references public.labels(id) on delete cascade not null,
  stage text not null default 'choose' check (stage in ('choose', 'explain', 'gaps', 'simplify', 'complete')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint feynman_sessions_user_label_active_unique unique (user_id, label_id, is_active) where (is_active = true)
);

create index idx_feynman_sessions_user_id on public.feynman_sessions(user_id);
create index idx_feynman_sessions_label_id on public.feynman_sessions(label_id);
create index idx_feynman_sessions_active on public.feynman_sessions(user_id, label_id, is_active);

-- Enable RLS
alter table public.feynman_sessions enable row level security;

-- RLS policies for feynman_sessions
create policy "feynman_sessions_select_own" on public.feynman_sessions for select using (user_id = auth.uid());
create policy "feynman_sessions_insert_own" on public.feynman_sessions for insert with check (user_id = auth.uid());
create policy "feynman_sessions_update_own" on public.feynman_sessions for update using (user_id = auth.uid());
create policy "feynman_sessions_delete_own" on public.feynman_sessions for delete using (user_id = auth.uid());

-- Explanations table
create table public.explanations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references public.feynman_sessions(id) on delete cascade not null,
  version integer not null,
  audience text,
  text text not null,
  llm_evaluation jsonb,
  created_at timestamptz not null default now()
);

create index idx_explanations_user_id on public.explanations(user_id);
create index idx_explanations_session_id on public.explanations(session_id);
create index idx_explanations_version on public.explanations(session_id, version);

-- Enable RLS
alter table public.explanations enable row level security;

-- RLS policies for explanations
create policy "explanations_select_own" on public.explanations for select using (user_id = auth.uid());
create policy "explanations_insert_own" on public.explanations for insert with check (user_id = auth.uid());
create policy "explanations_update_own" on public.explanations for update using (user_id = auth.uid());
create policy "explanations_delete_own" on public.explanations for delete using (user_id = auth.uid());

-- Gaps table
create table public.gaps (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id uuid references public.feynman_sessions(id) on delete cascade not null,
  explanation_version integer,
  description text not null,
  tweet_ids jsonb,
  resolved boolean not null default false,
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_gaps_user_id on public.gaps(user_id);
create index idx_gaps_session_id on public.gaps(session_id);
create index idx_gaps_resolved on public.gaps(session_id, resolved);

-- Enable RLS
alter table public.gaps enable row level security;

-- RLS policies for gaps
create policy "gaps_select_own" on public.gaps for select using (user_id = auth.uid());
create policy "gaps_insert_own" on public.gaps for insert with check (user_id = auth.uid());
create policy "gaps_update_own" on public.gaps for update using (user_id = auth.uid());
create policy "gaps_delete_own" on public.gaps for delete using (user_id = auth.uid());

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger update_learning_paths_updated_at before update on public.learning_paths
  for each row execute procedure update_updated_at_column();

create trigger update_labels_updated_at before update on public.labels
  for each row execute procedure update_updated_at_column();

create trigger update_feynman_sessions_updated_at before update on public.feynman_sessions
  for each row execute procedure update_updated_at_column();
