create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to anon, authenticated;

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
revoke all on table public.admin_users from anon, authenticated;
grant select on table public.admin_users to authenticated;

create policy "Administrators can read their own access record"
  on public.admin_users
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function private.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create or replace function private.has_admin_mfa()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'aal') = 'aal2', false);
$$;

revoke all on function private.is_admin_user() from public, anon;
revoke all on function private.has_admin_mfa() from public, anon;
grant execute on function private.is_admin_user() to authenticated;
grant execute on function private.has_admin_mfa() to authenticated;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('perfume', 'clothing')),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  brand text check (brand is null or char_length(brand) <= 120),
  description text not null default '' check (char_length(description) <= 3000),
  audience text check (audience is null or audience in ('Masculino', 'Feminino', 'Unissex')),
  clothing_type text check (
    clothing_type is null
    or clothing_type in ('Blusas', 'Calças', 'Vestidos', 'Casacos', 'Saias', 'Acessórios', 'Outros')
  ),
  family text check (family is null or char_length(family) <= 120),
  volume_ml integer check (volume_ml is null or volume_ml between 1 and 5000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  is_new boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (category = 'perfume'
      and audience is not null
      and clothing_type is null)
    or
    (category = 'clothing'
      and audience is null
      and clothing_type is not null
      and family is null
      and volume_ml is null)
  )
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null check (char_length(label) between 1 and 60),
  sku text unique check (sku is null or char_length(sku) <= 80),
  price numeric(12, 2) not null check (price > 0),
  compare_at_price numeric(12, 2) check (
    compare_at_price is null or compare_at_price >= price
  ),
  stock integer not null default 0 check (stock between 0 and 10000000),
  created_at timestamptz not null default now(),
  unique (product_id, label)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products (id) on delete cascade,
  storage_path text not null unique,
  alt_text text not null check (char_length(alt_text) between 1 and 180),
  sort_order smallint not null default 0 check (sort_order between 0 and 20),
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('created', 'updated', 'deleted')),
  product_id uuid not null,
  product_name text not null,
  created_at timestamptz not null default now()
);

create or replace function private.set_product_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_products_updated_at
  before update on public.products
  for each row execute function private.set_product_updated_at();

create or replace function private.audit_product_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.admin_audit_log (actor_id, action, product_id, product_name)
    values ((select auth.uid()), 'deleted', old.id, old.name);
    return old;
  end if;

  insert into public.admin_audit_log (actor_id, action, product_id, product_name)
  values (
    (select auth.uid()),
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    new.id,
    new.name
  );
  return new;
end;
$$;

create trigger audit_products
  after insert or update or delete on public.products
  for each row execute function private.audit_product_change();

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.admin_audit_log enable row level security;

grant select on table public.products, public.product_variants, public.product_images
  to anon, authenticated;
grant insert, update, delete on table public.products, public.product_variants, public.product_images
  to authenticated;
grant select on table public.admin_audit_log to authenticated;

create policy "Published products are public; administrators can manage all products"
  on public.products
  for select
  to anon, authenticated
  using (
    status = 'published'
    or (
      (select private.is_admin_user())
      and (select private.has_admin_mfa())
    )
  );

create policy "Only MFA administrators can create products"
  on public.products
  for insert
  to authenticated
  with check (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create policy "Only MFA administrators can update products"
  on public.products
  for update
  to authenticated
  using (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  )
  with check (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create policy "Only MFA administrators can delete products"
  on public.products
  for delete
  to authenticated
  using (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create policy "Published product variants are public"
  on public.product_variants
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_variants.product_id
        and products.status = 'published'
    )
    or (
      (select private.is_admin_user())
      and (select private.has_admin_mfa())
    )
  );

create policy "Only MFA administrators can create product variants"
  on public.product_variants
  for insert
  to authenticated
  with check (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create policy "Only MFA administrators can update product variants"
  on public.product_variants
  for update
  to authenticated
  using (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  )
  with check (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create policy "Only MFA administrators can delete product variants"
  on public.product_variants
  for delete
  to authenticated
  using (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create policy "Published product images are visible; administrators can view all"
  on public.product_images
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.status = 'published'
    )
    or (
      (select private.is_admin_user())
      and (select private.has_admin_mfa())
    )
  );

create policy "Only MFA administrators can manage product images"
  on public.product_images
  for all
  to authenticated
  using (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  )
  with check (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create policy "Administrators can read product audit entries"
  on public.admin_audit_log
  for select
  to authenticated
  using (
    (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create policy "Published product images can be read"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'product-images'
    and exists (
      select 1 from public.products
      where products.id::text = (storage.foldername(name))[1]
        and products.status = 'published'
    )
  );

create policy "Administrators can read private product images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create policy "Administrators can upload product images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and (select private.is_admin_user())
    and (select private.has_admin_mfa())
    and exists (
      select 1 from public.products
      where products.id::text = (storage.foldername(name))[1]
    )
  );

create policy "Administrators can replace product images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select private.is_admin_user())
    and (select private.has_admin_mfa())
  )
  with check (
    bucket_id = 'product-images'
    and (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create policy "Administrators can remove product images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and (select private.is_admin_user())
    and (select private.has_admin_mfa())
  );

create or replace function public.save_admin_product(
  p_product_id uuid,
  p_category text,
  p_audience text,
  p_clothing_type text,
  p_name text,
  p_slug text,
  p_brand text,
  p_description text,
  p_family text,
  p_volume_ml integer,
  p_status text,
  p_is_new boolean,
  p_is_featured boolean,
  p_variants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
begin
  if not (select private.is_admin_user())
     or not (select private.has_admin_mfa()) then
    raise exception using errcode = '42501', message = 'Not authorized';
  end if;

  if p_category is null
     or p_category not in ('perfume', 'clothing')
     or (
       p_category = 'perfume'
       and (
         p_audience is null
         or p_audience not in ('Masculino', 'Feminino', 'Unissex')
         or p_clothing_type is not null
       )
     )
     or (
       p_category = 'clothing'
       and (
         p_audience is not null
         or p_clothing_type is null
         or p_clothing_type not in ('Blusas', 'Calças', 'Vestidos', 'Casacos', 'Saias', 'Acessórios', 'Outros')
       )
     )
     or p_status is null
     or p_status not in ('draft', 'published')
     or p_is_new is null
     or p_is_featured is null
     or p_name is null
     or char_length(trim(p_name)) not between 1 and 120
     or p_slug is null
     or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or p_description is null
     or char_length(p_description) > 3000
     or (p_category = 'clothing' and (p_family is not null or p_volume_ml is not null))
     or (p_category = 'perfume' and p_volume_ml is not null and p_volume_ml not between 1 and 5000) then
    raise exception using errcode = '22023', message = 'Invalid product data';
  end if;

  if p_variants is null
     or jsonb_typeof(p_variants) <> 'array'
     or jsonb_array_length(p_variants) not between 1 and 20 then
    raise exception using errcode = '22023', message = 'Invalid product variants';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_variants) as variant(
      label text,
      sku text,
      price numeric,
      compare_at_price numeric,
      stock integer
    )
    where variant.label is null
       or char_length(trim(variant.label)) not between 1 and 60
       or (variant.sku is not null and char_length(variant.sku) > 80)
       or variant.price is null
       or variant.price <= 0
       or (variant.compare_at_price is not null and variant.compare_at_price < variant.price)
       or variant.stock is null
       or variant.stock not between 0 and 10000000
  ) then
    raise exception using errcode = '22023', message = 'Invalid product variants';
  end if;

  if p_product_id is null then
    insert into public.products (
      category,
      audience,
      clothing_type,
      name,
      slug,
      brand,
      description,
      family,
      volume_ml,
      status,
      is_new,
      is_featured
    )
    values (
      p_category,
      p_audience,
      p_clothing_type,
      trim(p_name),
      p_slug,
      nullif(trim(p_brand), ''),
      p_description,
      nullif(trim(p_family), ''),
      p_volume_ml,
      p_status,
      p_is_new,
      p_is_featured
    )
    returning id into saved_id;
  else
    update public.products
    set
      category = p_category,
      audience = p_audience,
      clothing_type = p_clothing_type,
      name = trim(p_name),
      slug = p_slug,
      brand = nullif(trim(p_brand), ''),
      description = p_description,
      family = nullif(trim(p_family), ''),
      volume_ml = p_volume_ml,
      status = p_status,
      is_new = p_is_new,
      is_featured = p_is_featured
    where id = p_product_id
    returning id into saved_id;

    if saved_id is null then
      raise exception using errcode = 'P0002', message = 'Product not found';
    end if;

    delete from public.product_variants
    where product_id = saved_id;
  end if;

  insert into public.product_variants (
    product_id,
    label,
    sku,
    price,
    compare_at_price,
    stock
  )
  select
    saved_id,
    trim(variant.label),
    nullif(trim(variant.sku), ''),
    variant.price,
    variant.compare_at_price,
    variant.stock
  from jsonb_to_recordset(p_variants) as variant(
    label text,
    sku text,
    price numeric,
    compare_at_price numeric,
    stock integer
  );

  return saved_id;
end;
$$;

revoke all on function public.save_admin_product(
  uuid, text, text, text, text, text, text, text, text, integer, text, boolean, boolean, jsonb
) from public, anon;
grant execute on function public.save_admin_product(
  uuid, text, text, text, text, text, text, text, text, integer, text, boolean, boolean, jsonb
) to authenticated;
