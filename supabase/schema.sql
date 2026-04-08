create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.admin_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'admin',
  created_at timestamptz not null default timezone('utc', now())
);

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

create table if not exists public.content_blocks (
  block_key text primary key,
  eyebrow text,
  title text,
  body text,
  action_label text,
  action_to text,
  image_url text,
  external_link boolean not null default false,
  variant text not null default 'default',
  updated_at timestamptz not null default timezone('utc', now()),
  constraint content_blocks_variant_check
    check (variant in ('default', 'news', 'advice', 'gallery', 'about'))
);

create table if not exists public.posts (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  date_label text not null default '',
  kind text not null default 'news',
  section text not null default 'news',
  is_published boolean not null default true,
  published_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint posts_kind_check check (kind in ('news', 'offer', 'advice')),
  constraint posts_section_check check (section in ('news', 'blog'))
);

create table if not exists public.products (
  id bigint generated always as identity primary key,
  category_slug text not null,
  slug text not null,
  name text not null,
  brand text not null default '',
  price text not null default '',
  stock_status text not null default 'Уточнить наличие',
  stock_quantity integer not null default 0,
  short_text text not null default '',
  description text not null default '',
  season text not null default '',
  fish text not null default '',
  water text not null default '',
  method text not null default '',
  material text not null default '',
  badges text[] not null default '{}',
  accent text not null default 'linear-gradient(135deg, #183a43 0%, #2d4a3e 42%, #e0b57b 100%)',
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint products_stock_status_check
    check (stock_status in ('В наличии', 'Под заказ', 'Уточнить наличие')),
  constraint products_unique_slug_per_category unique (category_slug, slug)
);

create table if not exists public.product_specs (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  label text not null,
  value text not null,
  sort_order integer not null default 0
);

create table if not exists public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0
);

create index if not exists posts_section_published_idx
  on public.posts(section, is_published, published_at desc);

create index if not exists products_category_published_idx
  on public.products(category_slug, is_published, sort_order asc);

create index if not exists products_brand_idx
  on public.products(brand);

create index if not exists products_slug_idx
  on public.products(slug);

create index if not exists product_specs_product_idx
  on public.product_specs(product_id, sort_order asc);

create index if not exists product_images_product_idx
  on public.product_images(product_id, sort_order asc);

drop trigger if exists set_updated_at_content_blocks on public.content_blocks;
create trigger set_updated_at_content_blocks
before update on public.content_blocks
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_posts on public.posts;
create trigger set_updated_at_posts
before update on public.posts
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_products on public.products;
create trigger set_updated_at_products
before update on public.products
for each row execute function public.set_updated_at();

alter table public.admin_profiles enable row level security;
alter table public.content_blocks enable row level security;
alter table public.posts enable row level security;
alter table public.products enable row level security;
alter table public.product_specs enable row level security;
alter table public.product_images enable row level security;

drop policy if exists "admins can view admin profiles" on public.admin_profiles;
drop policy if exists "admins and self can view admin profiles" on public.admin_profiles;
create policy "admins and self can view admin profiles"
on public.admin_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admins can manage admin profiles" on public.admin_profiles;
create policy "admins can manage admin profiles"
on public.admin_profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read content blocks" on public.content_blocks;
create policy "public can read content blocks"
on public.content_blocks
for select
to public
using (true);

drop policy if exists "admins can manage content blocks" on public.content_blocks;
create policy "admins can manage content blocks"
on public.content_blocks
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read published posts" on public.posts;
create policy "public can read published posts"
on public.posts
for select
to public
using (is_published = true);

drop policy if exists "admins can manage posts" on public.posts;
create policy "admins can manage posts"
on public.posts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read published products" on public.products;
create policy "public can read published products"
on public.products
for select
to public
using (is_published = true);

drop policy if exists "admins can manage products" on public.products;
create policy "admins can manage products"
on public.products
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read specs of published products" on public.product_specs;
create policy "public can read specs of published products"
on public.product_specs
for select
to public
using (
  exists (
    select 1
    from public.products p
    where p.id = product_specs.product_id
      and p.is_published = true
  )
);

drop policy if exists "admins can manage product specs" on public.product_specs;
create policy "admins can manage product specs"
on public.product_specs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "public can read images of published products" on public.product_images;
create policy "public can read images of published products"
on public.product_images
for select
to public
using (
  exists (
    select 1
    from public.products p
    where p.id = product_images.product_id
      and p.is_published = true
  )
);

drop policy if exists "admins can manage product images" on public.product_images;
create policy "admins can manage product images"
on public.product_images
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values
  ('site-media', 'site-media', true),
  ('product-media', 'product-media', true)
on conflict (id) do nothing;

drop policy if exists "public can view site media" on storage.objects;
create policy "public can view site media"
on storage.objects
for select
to public
using (bucket_id in ('site-media', 'product-media'));

drop policy if exists "admins can upload site media" on storage.objects;
create policy "admins can upload site media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('site-media', 'product-media')
  and public.is_admin()
);

drop policy if exists "admins can update site media" on storage.objects;
create policy "admins can update site media"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('site-media', 'product-media')
  and public.is_admin()
)
with check (
  bucket_id in ('site-media', 'product-media')
  and public.is_admin()
);

drop policy if exists "admins can delete site media" on storage.objects;
create policy "admins can delete site media"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('site-media', 'product-media')
  and public.is_admin()
);

insert into public.content_blocks (block_key, eyebrow, title, body, action_label, action_to, image_url, external_link, variant)
values
  ('hero_home', 'Магазин рыбалки в Волгограде', 'Подберите снасти для ближайшего выезда.', 'Посмотрите ассортимент, уточните наличие и приезжайте в магазин за живым выбором и понятным подбором.', 'Смотреть каталог', '/catalog', null, false, 'default'),
  ('catalog_banner', 'Каталог', 'Подберите снасти под свой стиль ловли, а не по случайным карточкам', 'Категории сделаны как для покупателя: можно быстро пойти в спиннинги, катушки, приманки, экипировку или сразу собрать удобный wishlist.', 'Открыть каталог', '/catalog', null, false, 'default'),
  ('news_banner', 'Новости и акции', 'Следите за поступлениями, полезными офферами и быстрым резервом', 'Смотрите, что приехало к сезону, какие позиции сейчас выгоднее взять и что можно быстро отложить перед визитом.', 'Все новости и акции', '/news', null, false, 'news'),
  ('blog_banner', 'Советы', 'Если не хочется ошибиться с покупкой, начните с коротких и понятных разборов', 'Материалы написаны так, чтобы покупателю было проще выбрать снасть, катушку или приманку под реальный сценарий.', 'Открыть советы', '/blog', null, false, 'advice'),
  ('gallery_banner', 'Галерея', 'Так выглядит магазин, в который приятно приехать за выбором вживую', 'Свет, фактуры, полки и детали снастей помогают еще до визита почувствовать атмосферу и уровень подачи ассортимента.', 'Построить маршрут', 'https://yandex.ru/maps/?text=%D0%92%D0%BE%D0%BB%D0%B3%D0%BE%D0%B3%D1%80%D0%B0%D0%B4%2C%20%D0%A3%D0%BD%D0%B8%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D1%82%D0%B5%D1%82%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%2C%2082', null, true, 'gallery'),
  ('about_banner', 'О магазине', 'ЩУКАРЬ — это магазин, где ассортимент и консультация работают вместе', 'Сюда удобно приехать, если нужно не просто купить снасть, а спокойно сравнить варианты, уточнить наличие и получить понятный совет.', 'Подробнее о магазине', '/about', null, false, 'about')
on conflict (block_key) do nothing;
