# Supabase setup for `shukar v2`

## 1. Add project keys to Vite

1. Open Supabase dashboard.
2. Go to `Project Settings -> API`.
3. Copy:
   - `Project URL`
   - `anon public` key
4. Create `.env` in the project root from `.env.example`.

Example:

```bash
cp .env.example .env
```

Then fill in:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_SUPABASE_CONTENT_ENABLED=true
```

## 2. Run SQL schema

1. Open `SQL Editor` in Supabase.
2. Paste the contents of `supabase/schema.sql`.
3. Run the script once.

The script creates:

- `admin_profiles`
- `content_blocks`
- `posts`
- `products`
- `product_specs`
- `product_images`
- RLS policies
- storage buckets `site-media` and `product-media`

## 3. Create the first admin user

Option A, via dashboard:

1. Open `Authentication -> Users`.
2. Create a new email/password user.
3. Copy that user's UUID.
4. Run:

```sql
insert into public.admin_profiles (user_id, email, full_name)
select id, email, 'Главный админ'
from auth.users
where email = 'admin@example.com'
on conflict (user_id) do update
set email = excluded.email,
    full_name = excluded.full_name;
```

Option B, if the user already exists:

```sql
insert into public.admin_profiles (user_id, email, full_name)
select id, email, 'Главный админ'
from auth.users
where email = 'admin@example.com'
on conflict (user_id) do update
set email = excluded.email,
    full_name = excluded.full_name;
```

After that, open:

`/adminpanel`

and sign in with the same email/password.

## 3.1 Fix for `admin_profiles` / RLS if `/adminpanel` returns 500

If the user exists but admin access check crashes with a `500`, run this patch once:

```sql
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins can view admin profiles" on public.admin_profiles;
drop policy if exists "admins and self can view admin profiles" on public.admin_profiles;

create policy "admins and self can view admin profiles"
on public.admin_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());
```

## 4. What is editable in `/adminpanel`

- Hero block
- Section banners
- Products
- Product specs
- Up to 10 product images
- News / offers / advice posts

## 5. Current frontend data model

### Products

- `category_slug`
- `slug`
- `name`
- `brand`
- `price`
- `stock_status`
- `stock_quantity`
- `short_text`
- `description`
- `season`
- `fish`
- `water`
- `method`
- `material`
- `badges`
- `accent`
- `sort_order`
- `is_published`

### Product specs

Store one characteristic per row in `product_specs`:

- `label`: for example `Длина`
- `value`: for example `2.44 м`

### Product images

Store one image per row in `product_images`, ordered by `sort_order`.

## 6. SEO and catalog pagination

- Category URLs: `/catalog/:categorySlug`
- Product URLs: `/catalog/:categorySlug/:productSlug`
- Catalog pagination in the UI: 9 cards per page via `?page=2`

If later you want fully static SEO pagination routes like `/catalog/page/2`, we can add them in the next iteration without changing the data model.
