-- TikTok intelligence table — content pattern learning for AI engine
create table tiktok_intelligence (
  id uuid default uuid_generate_v4() primary key,
  nicho text not null check (nicho in ('trekking', 'running', 'ciclismo', 'turismo_aventura')),
  plataforma text not null default 'tiktok',
  caption text,
  views bigint default 0,
  likes bigint default 0,
  comments bigint default 0,
  shares bigint default 0,
  hashtags text[],
  duracion integer, -- seconds
  video_url text,
  source_query text, -- hashtag(s) or profile(s) used to find this
  es_referencia boolean default false,
  scrapeado_en timestamptz default now()
);

alter table tiktok_intelligence enable row level security;

-- Service role bypasses RLS; anon/authenticated can't access directly
create policy "Admins can manage tiktok intelligence" on tiktok_intelligence for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
