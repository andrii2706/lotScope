create table if not exists companies (
  id text primary key,
  name text not null,
  plan text not null default 'trial',
  credits integer not null default 0 check (credits >= 0),
  period_end timestamptz,
  recurring_ref text,
  recurring_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  company_id text not null references companies(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'expert')),
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user on sessions(user_id);

create table if not exists invites (
  token_hash text primary key,
  company_id text not null references companies(id) on delete cascade,
  role text not null check (role in ('manager', 'expert')),
  created_by text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  order_reference text primary key,
  company_id text not null references companies(id) on delete cascade,
  plan text not null,
  amount numeric(12, 2) not null,
  currency text not null default 'UAH',
  method text not null check (method in ('card', 'invoice', 'manual')),
  status text not null check (status in ('pending', 'approved', 'declined', 'refunded')),
  raw jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists payments_company on payments(company_id, created_at desc);

create table if not exists usage (
  id bigserial primary key,
  company_id text not null references companies(id) on delete cascade,
  user_id text references users(id) on delete set null,
  kind text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists usage_company on usage(company_id, created_at desc);

create table if not exists lessons (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  rule text not null,
  tag text not null,
  report_id text not null default '',
  report_title text not null default '',
  expert text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists lessons_company on lessons(company_id, created_at desc);

alter table users alter column password_hash drop not null;
alter table users add column if not exists google_sub text;
create unique index if not exists users_google_sub on users(google_sub) where google_sub is not null;
alter table users add column if not exists active boolean not null default true;
alter table companies add column if not exists seats integer not null default 2 check (seats >= 1);

create table if not exists lot_unlocks (
  id bigserial primary key,
  company_id text not null references companies(id) on delete cascade,
  keys text[] not null,
  user_id text references users(id) on delete set null,
  analysis_used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists lot_unlocks_company on lot_unlocks(company_id);
create index if not exists lot_unlocks_keys on lot_unlocks using gin(keys);

alter table companies add column if not exists kind text not null default 'team';
alter table companies drop constraint if exists companies_kind_check;
alter table companies add constraint companies_kind_check check (kind in ('team', 'personal'));
alter table companies add column if not exists suspended boolean not null default false;
alter table companies add column if not exists suspended_reason text not null default '';
alter table companies add column if not exists settings jsonb not null default '{}'::jsonb;

alter table users drop constraint if exists users_role_check;
update users set role = 'admin' where role = 'owner';
alter table users add constraint users_role_check check (role in ('admin', 'manager', 'expert', 'user'));

alter table invites drop constraint if exists invites_role_check;
alter table invites add constraint invites_role_check check (role in ('admin', 'manager', 'expert'));

create table if not exists reports (
  id text primary key,
  company_id text not null references companies(id) on delete cascade,
  user_id text references users(id) on delete set null,
  title text not null default '',
  vin text not null default '',
  body jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists reports_company on reports(company_id, created_at desc);
create index if not exists reports_user on reports(user_id, created_at desc);

create table if not exists report_photos (
  report_id text not null references reports(id) on delete cascade,
  idx integer not null,
  data text not null,
  primary key (report_id, idx)
);

create table if not exists audit_log (
  id bigserial primary key,
  company_id text references companies(id) on delete set null,
  user_id text references users(id) on delete set null,
  actor text not null default '',
  role text not null default '',
  action text not null,
  target text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists audit_company on audit_log(company_id, created_at desc);
create index if not exists audit_user on audit_log(user_id, created_at desc);
create index if not exists audit_time on audit_log(created_at desc);
