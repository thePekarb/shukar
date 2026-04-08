-- migration_v2.sql
-- Run this in Supabase SQL editor to create the new tables for the advanced admin panel

-- 1. Сategories table
create table if not exists public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name text not null,
  image_url text,
  description text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- 2. Fish types table
create table if not exists public.fish_types (
  id bigint generated always as identity primary key,
  name text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

-- 3. Update products to reference category and fish types (array of IDs or just names)
-- Since products already exist, let's just make sure we have an array for fish types if needed,
-- but for simplicity we can keep using the `fish` text field on products as a comma-separated string,
-- or add a new `fish_ids` array. Let's add an array.
alter table public.products add column if not exists category_id bigint references public.categories(id) on delete set null;
alter table public.products add column if not exists fish_ids bigint[] default '{}';

-- 4. Post images table (for Offers/News/Advice)
create table if not exists public.post_images (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.posts(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0
);

-- 5. Gallery images table
create table if not exists public.gallery_images (
  id bigint generated always as identity primary key,
  image_url text not null,
  caption text default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

-- 6. Site settings table (singleton pattern)
create table if not exists public.site_settings (
  id integer primary key check (id = 1), -- Only one row allowed
  phone text default '+7 (937) 748-48-48',
  address text default 'Университетский проспект, 82',
  working_hours text default 'Пн–Сб 09:00–19:00 | Вс 09:00–17:00',
  vk_link text default '',
  whatsapp_link text default '',
  avito_link text default '',
  about_text text default 'Современный офлайн-магазин рыбалки в Волгограде...',
  about_image_url text default '',
  updated_at timestamptz not null default timezone('utc', now())
);

-- Triggers for updated_at
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_categories_updated_at') then
    create trigger set_categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'set_site_settings_updated_at') then
    create trigger set_site_settings_updated_at before update on public.site_settings for each row execute function public.set_updated_at();
  end if;
end $$;

-- Enable RLS and add basic policies
alter table public.categories enable row level security;
alter table public.fish_types enable row level security;
alter table public.post_images enable row level security;
alter table public.gallery_images enable row level security;
alter table public.site_settings enable row level security;

-- Policies for anon (read-only)
create policy "Allow public read-only access on categories" on public.categories for select using (true);
create policy "Allow public read-only access on fish_types" on public.fish_types for select using (true);
create policy "Allow public read-only access on post_images" on public.post_images for select using (true);
create policy "Allow public read-only access on gallery_images" on public.gallery_images for select using (true);
create policy "Allow public read-only access on site_settings" on public.site_settings for select using (true);

-- Policies for admins (full access)
create policy "Admins can manage categories" on public.categories for all using (is_admin());
create policy "Admins can manage fish_types" on public.fish_types for all using (is_admin());
create policy "Admins can manage post_images" on public.post_images for all using (is_admin());
create policy "Admins can manage gallery_images" on public.gallery_images for all using (is_admin());
create policy "Admins can manage site_settings" on public.site_settings for all using (is_admin());

-- Insert default settings row if it doesnt exist
insert into public.site_settings (id) values (1) on conflict do nothing;
