/* Pushpa Jewellers — database tables (Postgres).
   Applied automatically on the first request after a deploy; every
   statement is safe to run again. */
module.exports = `
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  role text not null default 'staff' check (role in ('owner', 'staff')),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists invites (
  email text primary key,
  name text not null default '',
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists settings (
  id int primary key check (id = 1),
  data jsonb not null
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text not null default 'other',
  badge text not null default '',
  description text not null default '',
  metal text not null default 'yellow_gold',
  karat int,
  weight_g numeric(10, 3),
  stones text not null default '',
  pricing_mode text not null default 'gold_rate' check (pricing_mode in ('gold_rate', 'fixed')),
  making_type text not null default 'percent' check (making_type in ('percent', 'flat')),
  making_value numeric not null default 0,
  stone_value numeric not null default 0,
  fixed_price numeric not null default 0,
  show_price boolean not null default true,
  images jsonb not null default '[]',
  stock jsonb not null default '{}',
  low_stock_at int not null default 1,
  status text not null default 'published' check (status in ('published', 'draft', 'archived')),
  featured_rank int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  showroom text not null,
  delta int not null,
  reason text not null,
  note text not null default '',
  order_number text not null default '',
  at timestamptz not null default now(),
  by_name text not null default ''
);
create index if not exists stock_movements_at on stock_movements (at desc);
create index if not exists stock_movements_product on stock_movements (product_id, at desc);

create table if not exists gold_rates (
  date date primary key,
  per_gram jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create sequence if not exists order_number_seq start 1001;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  channel text not null default 'walk_in',
  showroom text not null,
  customer jsonb not null,
  items jsonb not null,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  paid numeric not null default 0,
  payment_status text not null default 'unpaid',
  payments jsonb not null default '[]',
  fulfilment text not null default 'pickup',
  due_date date,
  status text not null default 'new',
  tracking jsonb not null default '{"courier": "", "number": ""}',
  notes text not null default '',
  history jsonb not null default '[]'
);
create index if not exists orders_created on orders (created_at desc);
create index if not exists orders_status on orders (status);
`;
