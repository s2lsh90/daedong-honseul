-- reviews 테이블
create table if not exists reviews (
  id uuid default gen_random_uuid() primary key,
  bar_id uuid references bars(id) on delete cascade,
  user_id uuid not null,
  nickname text not null,
  rating int check (rating between 1 and 5) not null,
  content text not null,
  created_at timestamptz default now()
);

-- 유저당 바 하나에 리뷰 하나
create unique index if not exists reviews_user_bar_unique on reviews(user_id, bar_id);

-- RLS 비활성화
alter table reviews disable row level security;
