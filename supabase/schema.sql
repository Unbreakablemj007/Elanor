-- =============================================================================
-- Miss Elanor — database schema (Supabase / Postgres)
--
-- Mirrors the app's data model. Only users listed in public.staff can read or
-- write anything (Row Level Security). Multi-step writes (sales, returns,
-- stock changes, product saves) run inside one function call, so they either
-- fully succeed or change nothing.
--
-- This file is the full schema for a fresh project. It is already applied to
-- the live project; keep it in sync when the database changes.
-- =============================================================================

-- ---------- Staff allowlist -------------------------------------------------
create table if not exists public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  -- 'owner' sees and changes everything; 'cashier' can only make sales.
  role text not null default 'owner' check (role in ('owner', 'cashier')),
  created_at timestamptz not null default now()
);

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.staff where user_id = auth.uid()); $$;
revoke execute on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

create or replace function private.is_owner()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.staff where user_id = auth.uid() and role = 'owner'); $$;
revoke execute on function private.is_owner() from public, anon;
grant execute on function private.is_owner() to authenticated;

-- ---------- Settings and dropdown lists --------------------------------------
create table public.settings (
  key text primary key,
  value text not null default '',
  description text not null default ''
);

create table public.lists (
  list_name text not null check (list_name in ('categories','sizes','colors','expense_categories')),
  value text not null check (value <> ''),
  sort_order integer not null default 0,
  primary key (list_name, value)
);

-- ---------- Catalogue --------------------------------------------------------
create table public.products (
  product_id text primary key,
  name text not null,
  category text not null default '',
  description text not null default '',
  cost_price_usd numeric(12,2) not null default 0 check (cost_price_usd >= 0),
  sell_price_usd numeric(12,2) not null default 0 check (sell_price_usd >= 0),
  image_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.variants (
  variant_id text primary key,
  product_id text not null references public.products(product_id) on delete cascade,
  size text not null,
  color text not null default '',
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer check (low_stock_threshold >= 0), -- null = use settings.low_stock_default
  updated_at timestamptz not null default now(),
  constraint variants_unique_size_color unique (product_id, size, color) deferrable initially deferred
);
create index variants_product_idx on public.variants(product_id);

-- ---------- Customers and expenses -------------------------------------------
create table public.customers (
  customer_id text primary key,
  name text not null,
  phone text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.expenses (
  expense_id text primary key,
  date date not null,
  category text not null,
  description text not null default '',
  amount numeric(16,2) not null check (amount > 0),
  currency text not null check (currency in ('USD','LBP')),
  exchange_rate numeric(14,2) not null check (exchange_rate > 0),
  amount_usd numeric(12,2) not null,
  created_by text not null default ''
);
create index expenses_date_idx on public.expenses(date desc);

-- ---------- Sales ------------------------------------------------------------
create table public.sales (
  sale_id text primary key,
  date timestamptz not null default now(),
  customer_id text references public.customers(customer_id) on delete set null,
  subtotal_usd numeric(12,2) not null default 0,
  discount_usd numeric(12,2) not null default 0,
  total_usd numeric(12,2) not null default 0,
  exchange_rate numeric(14,2) not null check (exchange_rate > 0),
  total_lbp numeric(16,0) not null default 0,
  paid_usd numeric(12,2) not null default 0,
  paid_lbp numeric(16,0) not null default 0,
  change_usd numeric(12,2) not null default 0,
  change_lbp numeric(16,0) not null default 0,
  payment_method text not null default 'cash',
  status text not null default 'completed' check (status in ('completed','partially_returned','returned')),
  created_by text not null default '',
  notes text not null default ''
);
create index sales_date_idx on public.sales(date desc);
create index sales_customer_idx on public.sales(customer_id);

create table public.sale_items (
  line_id text primary key,
  sale_id text not null references public.sales(sale_id) on delete cascade,
  variant_id text not null references public.variants(variant_id),
  product_id text not null,
  product_name text not null,
  size text not null default '',
  color text not null default '',
  qty integer not null check (qty > 0),
  unit_price_usd numeric(12,2) not null,
  unit_cost_usd numeric(12,2) not null default 0,
  line_total_usd numeric(12,2) not null,
  returned_qty integer not null default 0,
  constraint sale_items_returned_range check (returned_qty between 0 and qty)
);
create index sale_items_sale_idx on public.sale_items(sale_id);
create index sale_items_variant_idx on public.sale_items(variant_id);

-- ---------- Stock history ----------------------------------------------------
create table public.stock_movements (
  movement_id text primary key,
  date timestamptz not null default now(),
  variant_id text not null references public.variants(variant_id) on delete cascade,
  type text not null check (type in ('restock','sale','return','adjustment')),
  qty_change integer not null check (qty_change <> 0),
  reference_id text not null default '',
  created_by text not null default '',
  notes text not null default ''
);
create index stock_movements_variant_idx on public.stock_movements(variant_id);
create index stock_movements_date_idx on public.stock_movements(date desc);

-- ---------- Row Level Security: staff only -----------------------------------
do $$
declare tbl text;
begin
  foreach tbl in array array['staff','settings','lists','products','variants','customers',
                             'expenses','sales','sale_items','stock_movements']
  loop
    execute format('alter table public.%I enable row level security', tbl);
    execute format('revoke all on public.%I from anon', tbl);
  end loop;
  foreach tbl in array array['settings','lists','products','variants','customers',
                             'expenses','sales','sale_items','stock_movements']
  loop
    execute format(
      'create policy "staff full access" on public.%I for all to authenticated
         using ((select private.is_staff())) with check ((select private.is_staff()))', tbl);
  end loop;
end $$;

drop policy if exists "staff can read staff list" on public.staff;
create policy "staff can read staff list" on public.staff
  for select to authenticated using ((select private.is_staff()));

-- Cashiers: restrictive policies are AND-ed with "staff full access", so they
-- keep read access (catalogue, customers, sales for receipts) but every change
-- other than recording a sale (record_sale) or adding a customer needs an owner.
do $$
declare tbl text;
begin
  foreach tbl in array array['products','variants','lists','settings','sales','sale_items'] loop
    execute format('create policy "owners insert" on public.%I as restrictive for insert to authenticated with check ((select private.is_owner()))', tbl);
    execute format('create policy "owners update" on public.%I as restrictive for update to authenticated using ((select private.is_owner())) with check ((select private.is_owner()))', tbl);
    execute format('create policy "owners delete" on public.%I as restrictive for delete to authenticated using ((select private.is_owner()))', tbl);
  end loop;
  foreach tbl in array array['expenses','stock_movements'] loop
    execute format('create policy "owners only" on public.%I as restrictive for all to authenticated using ((select private.is_owner())) with check ((select private.is_owner()))', tbl);
  end loop;
end $$;
create policy "owners update" on public.customers as restrictive for update to authenticated
  using ((select private.is_owner())) with check ((select private.is_owner()));
create policy "owners delete" on public.customers as restrictive for delete to authenticated
  using ((select private.is_owner()));

-- ---------- Atomic write functions (run as the signed-in user, RLS applies) --

-- Apply stock movements: change each variant's quantity (never below zero)
-- and record the movement. Raises a readable error if stock is short.
create or replace function private.apply_movements(p_movements jsonb)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  m jsonb;
  v_change integer;
  v_label text;
  v_qty integer;
begin
  for m in select * from jsonb_array_elements(coalesce(p_movements, '[]'::jsonb)) loop
    v_change := (m->>'qty_change')::integer;
    update public.variants
       set quantity = quantity + v_change,
           updated_at = coalesce((m->>'date')::timestamptz, now())
     where variant_id = m->>'variant_id'
       and quantity + v_change >= 0;
    if not found then
      select p.name || ' ' || concat_ws(' / ', nullif(v.size, ''), nullif(v.color, '')), v.quantity
        into v_label, v_qty
        from public.variants v join public.products p on p.product_id = v.product_id
       where v.variant_id = m->>'variant_id';
      if v_label is null then
        raise exception 'Item % was not found.', m->>'variant_id';
      end if;
      raise exception 'Only % left of %. Please update and try again.', greatest(v_qty, 0), v_label;
    end if;
    insert into public.stock_movements (movement_id, date, variant_id, type, qty_change, reference_id, created_by, notes)
    select r.movement_id, coalesce(r.date, now()), r.variant_id, r.type, r.qty_change,
           coalesce(r.reference_id, ''), coalesce(r.created_by, ''), coalesce(r.notes, '')
      from jsonb_populate_record(null::public.stock_movements, m) r;
  end loop;
end;
$$;
revoke execute on function private.apply_movements(jsonb) from public, anon;
grant execute on function private.apply_movements(jsonb) to authenticated;

-- Save a sale, its lines and the stock decrease in one go.
-- Runs with the function owner's rights after checking the caller is staff, so
-- cashiers can sell without direct write access to sales, items or stock.
create or replace function public.record_sale(p_sale jsonb, p_items jsonb, p_movements jsonb)
returns text
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_staff() then raise exception 'Not authorized'; end if;
  insert into public.sales select * from jsonb_populate_record(null::public.sales, p_sale);
  insert into public.sale_items select * from jsonb_populate_recordset(null::public.sale_items, p_items);
  perform private.apply_movements(p_movements);
  return p_sale->>'sale_id';
end;
$$;

-- Return items from a sale: bump returned_qty, put stock back, update status.
create or replace function public.apply_return(p_sale_id text, p_lines jsonb, p_movements jsonb)
returns text
language plpgsql security invoker set search_path = ''
as $$
declare
  l jsonb;
  v_status text;
begin
  for l in select * from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) loop
    update public.sale_items
       set returned_qty = returned_qty + (l->>'qty')::integer
     where line_id = l->>'line_id'
       and sale_id = p_sale_id
       and returned_qty + (l->>'qty')::integer <= qty;
    if not found then
      raise exception 'Some of these items were already returned. Refresh the page and try again.';
    end if;
  end loop;
  perform private.apply_movements(p_movements);
  select case when bool_and(returned_qty >= qty) then 'returned' else 'partially_returned' end
    into v_status
    from public.sale_items where sale_id = p_sale_id;
  update public.sales set status = v_status where sale_id = p_sale_id;
  if not found then raise exception 'Sale % was not found.', p_sale_id; end if;
  return v_status;
end;
$$;

-- Restock or adjust one variant. Returns the new quantity.
create or replace function public.change_stock(p_movement jsonb)
returns integer
language plpgsql security invoker set search_path = ''
as $$
declare v_qty integer;
begin
  perform private.apply_movements(jsonb_build_array(p_movement));
  select quantity into v_qty from public.variants where variant_id = p_movement->>'variant_id';
  return v_qty;
end;
$$;

-- Create a product with its sizes; opening stock goes through movements.
create or replace function public.create_product(p_product jsonb, p_variants jsonb, p_movements jsonb)
returns text
language plpgsql security invoker set search_path = ''
as $$
begin
  insert into public.products select * from jsonb_populate_record(null::public.products, p_product);
  insert into public.variants (variant_id, product_id, size, color, quantity, low_stock_threshold, updated_at)
  select r.variant_id, r.product_id, r.size, coalesce(r.color, ''), 0, r.low_stock_threshold, coalesce(r.updated_at, now())
    from jsonb_populate_recordset(null::public.variants, coalesce(p_variants, '[]'::jsonb)) r;
  perform private.apply_movements(p_movements);
  return p_product->>'product_id';
end;
$$;

-- Edit a product: details, existing sizes (not quantities), and new sizes.
create or replace function public.save_product(
  p_product_id text, p_product jsonb, p_variant_patches jsonb, p_new_variants jsonb, p_movements jsonb)
returns text
language plpgsql security invoker set search_path = ''
as $$
declare vp jsonb;
begin
  update public.products set
    name = p_product->>'name',
    category = coalesce(p_product->>'category', ''),
    description = coalesce(p_product->>'description', ''),
    cost_price_usd = (p_product->>'cost_price_usd')::numeric,
    sell_price_usd = (p_product->>'sell_price_usd')::numeric,
    image_url = coalesce(p_product->>'image_url', ''),
    updated_at = coalesce((p_product->>'updated_at')::timestamptz, now())
  where product_id = p_product_id;
  if not found then raise exception 'Product % was not found.', p_product_id; end if;

  for vp in select * from jsonb_array_elements(coalesce(p_variant_patches, '[]'::jsonb)) loop
    update public.variants set
      size = vp->>'size',
      color = coalesce(vp->>'color', ''),
      low_stock_threshold = (vp->>'low_stock_threshold')::integer,
      updated_at = coalesce((vp->>'updated_at')::timestamptz, now())
    where variant_id = vp->>'variant_id' and product_id = p_product_id;
    if not found then raise exception 'Size % was not found.', vp->>'variant_id'; end if;
  end loop;

  insert into public.variants (variant_id, product_id, size, color, quantity, low_stock_threshold, updated_at)
  select r.variant_id, p_product_id, r.size, coalesce(r.color, ''), 0, r.low_stock_threshold, coalesce(r.updated_at, now())
    from jsonb_populate_recordset(null::public.variants, coalesce(p_new_variants, '[]'::jsonb)) r;

  perform private.apply_movements(p_movements);
  return p_product_id;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'public.record_sale(jsonb, jsonb, jsonb)',
    'public.apply_return(text, jsonb, jsonb)',
    'public.change_stock(jsonb)',
    'public.create_product(jsonb, jsonb, jsonb)',
    'public.save_product(text, jsonb, jsonb, jsonb, jsonb)']
  loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ---------- Product photos (Supabase Storage) -------------------------------
-- Public-read bucket; only staff can upload, replace or remove.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "staff upload product images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select private.is_staff()));
create policy "staff update product images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select private.is_staff()))
  with check (bucket_id = 'product-images' and (select private.is_staff()));
create policy "staff delete product images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select private.is_staff()));
-- Only owners change product photos.
create policy "owners write product images" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'product-images' or (select private.is_owner()));
create policy "owners update product images" on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'product-images' or (select private.is_owner()));
create policy "owners delete product images" on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'product-images' or (select private.is_owner()));

-- ---------- Starting values --------------------------------------------------
insert into public.settings (key, value, description) values
  ('shop_name', 'Miss Elanor', 'Shown in the app header and on receipts'),
  ('exchange_rate_lbp_per_usd', '89500', 'Current LBP per 1 USD - update when the market rate changes'),
  ('low_stock_default', '2', 'Default quantity at or below which a size is flagged as low stock'),
  ('lbp_rounding', '5000', 'Round LBP amounts to the nearest multiple of this')
on conflict (key) do nothing;

insert into public.lists (list_name, value, sort_order) values
  ('categories','Dresses',1),('categories','Tops',2),('categories','Jeans',3),('categories','Pants',3),
  ('categories','Skirts',4),('categories','Jackets',5),('categories','Accessories',6),
  ('sizes','XS',1),('sizes','S',2),('sizes','M',3),('sizes','L',4),
  ('sizes','XL',5),('sizes','XXL',6),('sizes','One Size',7),
  ('sizes','25',125),('sizes','26',126),('sizes','27',127),('sizes','28',128),('sizes','29',129),
  ('sizes','30',130),('sizes','31',131),('sizes','34',134),('sizes','36',136),('sizes','38',138),
  ('sizes','40',140),('sizes','42',142),('sizes','44',144),
  ('colors','Black',1),('colors','White',2),('colors','Beige',3),('colors','Navy',4),
  ('colors','Red',5),('colors','Pink',6),('colors','Green',7),
  ('colors','Blue',8),('colors','Light Blue',9),('colors','Burgundy',10),('colors','Grey',11),('colors','Brown',12),('colors','Yellow',13),
  ('expense_categories','Rent',1),('expense_categories','Electricity / Generator',2),
  ('expense_categories','Salaries',3),('expense_categories','Supplier payment',4),
  ('expense_categories','Shipping / Delivery',5),('expense_categories','Marketing',6),
  ('expense_categories','Other',7)
on conflict do nothing;
