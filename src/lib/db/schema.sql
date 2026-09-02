-- Phase 2. Aucune table ne stocke de fichier source : seul le résultat structuré
-- est conservé, et uniquement pour un compte.

create table users (
  id                     text primary key,
  email                  text not null unique,
  created_at             timestamptz not null default now(),
  plan                   text not null default 'free' check (plan in ('free','pro')),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan_renews_at         timestamptz
);

create table daily_usage (
  user_id     text references users(id) on delete cascade,
  ip_hash     text not null,
  day         date not null,
  conversions integer not null default 0,
  primary key (ip_hash, day)
);

create table conversions (
  id          text primary key,
  user_id     text not null references users(id) on delete cascade,
  batch_hash  text not null,
  subject     text not null,
  title       text not null,
  language    text not null,
  payload     jsonb not null,
  page_count  integer not null,
  exam_date   date,
  created_at  timestamptz not null default now()
);
create index conversions_user_created on conversions (user_id, created_at desc);
create unique index conversions_user_hash on conversions (user_id, batch_hash);

create table card_progress (
  conversion_id text not null references conversions(id) on delete cascade,
  card_id       text not null,
  state         text not null check (state in ('known','shaky','unknown')),
  reviewed_at   timestamptz not null default now(),
  review_count  integer not null default 1,
  primary key (conversion_id, card_id)
);

create table review_reminders (
  conversion_id text not null references conversions(id) on delete cascade,
  user_id       text not null references users(id) on delete cascade,
  offset_days   integer not null check (offset_days in (1,3,7)),
  due_at        timestamptz not null,
  sent_at       timestamptz,
  primary key (conversion_id, offset_days)
);
create index review_reminders_due on review_reminders (due_at) where sent_at is null;

create table share_links (
  token         text primary key,
  conversion_id text not null references conversions(id) on delete cascade,
  created_at    timestamptz not null default now(),
  views         integer not null default 0,
  revoked_at    timestamptz
);

-- Preuve sociale : alimentée par les vraies conversions, jamais amorcée.
create table conversion_counter (
  day   date primary key,
  total integer not null default 0
);
