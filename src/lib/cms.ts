import {
  articles as fallbackArticles,
  categories as fallbackCategories,
  newsCards as fallbackNewsCards,
  products as fallbackProducts,
  type Product,
  type StoryCard,
} from '../store'
import { getSupabaseBrowserClient, isSupabaseContentEnabled } from './supabase'

export type ContentBlock = {
  key: string
  eyebrow: string
  title: string
  text: string
  actionLabel: string
  actionTo: string
  imageUrl: string | null
  external: boolean
  variant: 'news' | 'advice' | 'gallery' | 'about' | 'default'
}

export type CmsSnapshot = {
  blocks: Record<string, ContentBlock>
  products: Product[]
  articles: StoryCard[]
  newsCards: StoryCard[]
}

type ProductRow = {
  id: string
  category_slug: string
  slug: string
  name: string
  brand: string
  price: string
  stock_status: Product['stock']
  stock_quantity: number
  short_text: string
  description: string
  season: string
  fish: string
  water: string
  method: string
  material: string
  badges: string[] | null
  accent: string | null
  sort_order: number | null
  product_images?: { image_url: string | null; sort_order: number | null }[]
  product_specs?: { label: string; value: string; sort_order: number | null }[]
  recommended_ids?: number[] | null
}

type StoryRow = {
  slug: string
  title: string
  excerpt: string
  date_label: string
  kind: StoryCard['kind']
  section: 'news' | 'blog'
}

type BlockRow = {
  block_key: string
  eyebrow: string | null
  title: string | null
  body: string | null
  action_label: string | null
  action_to: string | null
  image_url: string | null
  external_link: boolean | null
  variant: ContentBlock['variant'] | null
}

export const defaultBlocks: Record<string, ContentBlock> = {
  hero_home: {
    key: 'hero_home',
    eyebrow: 'Магазин рыбалки в Волгограде',
    title: 'Подберите снасти для ближайшего выезда.',
    text: 'Посмотрите ассортимент, уточните наличие и приезжайте в магазин за живым выбором и понятным подбором.',
    actionLabel: 'Смотреть каталог',
    actionTo: '/catalog',
    imageUrl: null,
    external: false,
    variant: 'default',
  },
  catalog_banner: {
    key: 'catalog_banner',
    eyebrow: 'Каталог',
    title: 'Свой стиль ловли, а не случайные карточки',
    text: 'Быстро переходите в нужные категории и собирайте удобный список перед визитом.',
    actionLabel: 'Открыть каталог',
    actionTo: '/catalog',
    imageUrl: null,
    external: false,
    variant: 'default',
  },
  news_banner: {
    key: 'news_banner',
    eyebrow: 'Новости и акции',
    title: 'Следите за поступлениями, акциями и быстрым резервом',
    text: 'Смотрите, что уже приехало к сезону и что удобно отложить перед визитом.',
    actionLabel: 'Все новости и акции',
    actionTo: '/news',
    imageUrl: null,
    external: false,
    variant: 'news',
  },
  blog_banner: {
    key: 'blog_banner',
    eyebrow: 'Советы',
    title: 'Начните с коротких и понятных разборов',
    text: 'Подборки и советы помогают быстрее выбрать снасть под реальный сценарий.',
    actionLabel: 'Открыть советы',
    actionTo: '/blog',
    imageUrl: null,
    external: false,
    variant: 'advice',
  },
  gallery_banner: {
    key: 'gallery_banner',
    eyebrow: 'Галерея',
    title: 'Так выглядит магазин, в который приятно приехать за выбором вживую',
    text: 'Свет, фактуры, полки и детали снастей помогают еще до визита почувствовать атмосферу и уровень подачи ассортимента.',
    actionLabel: 'Построить маршрут',
    actionTo: '',
    imageUrl: null,
    external: true,
    variant: 'gallery',
  },
  about_banner: {
    key: 'about_banner',
    eyebrow: 'О магазине',
    title: 'Ассортимент и консультация работают вместе',
    text: 'Сравните варианты, уточните наличие и получите понятный совет прямо в магазине.',
    actionLabel: 'Связаться с магазином',
    actionTo: '',
    imageUrl: null,
    external: true,
    variant: 'about',
  },
}

export function getFallbackSnapshot(): CmsSnapshot {
  return {
    blocks: defaultBlocks,
    products: fallbackProducts,
    articles: fallbackArticles,
    newsCards: fallbackNewsCards,
  }
}

function normalizeProduct(row: ProductRow): Product {
  return {
    id: Number(row.id),
    slug: row.slug,
    categorySlug: row.category_slug,
    name: row.name,
    brand: row.brand,
    price: row.price,
    stock: row.stock_status,
    short: row.short_text,
    description: row.description,
    season: row.season,
    fish: row.fish,
    water: row.water,
    method: row.method,
    material: row.material,
    badges: row.badges ?? [],
    specs: (row.product_specs ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((item) => [item.label, item.value]),
    accent: row.accent ?? 'linear-gradient(135deg, #183a43 0%, #2d4a3e 42%, #e0b57b 100%)',
    stockQuantity: row.stock_quantity ?? 0,
    images: (row.product_images ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((item) => item.image_url ?? '')
      .filter(Boolean),
    recommendedIds: row.recommended_ids ?? [],
  }
}

function normalizeStory(row: StoryRow): StoryCard {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    date: row.date_label,
    kind: row.kind,
  }
}

function normalizeBlock(row: BlockRow): ContentBlock {
  return {
    key: row.block_key,
    eyebrow: row.eyebrow ?? '',
    title: row.title ?? '',
    text: row.body ?? '',
    actionLabel: row.action_label ?? '',
    actionTo: row.action_to ?? '',
    imageUrl: row.image_url ?? null,
    external: Boolean(row.external_link),
    variant: row.variant ?? 'default',
  }
}

export async function fetchCmsSnapshot(): Promise<CmsSnapshot> {
  if (!isSupabaseContentEnabled) {
    return getFallbackSnapshot()
  }

  const supabase = getSupabaseBrowserClient()

  if (!supabase) {
    return getFallbackSnapshot()
  }

  const [productsResult, storiesResult, blocksResult] = await Promise.all([
    supabase
      .from('products')
      .select(
        'id, category_slug, slug, name, brand, price, stock_status, stock_quantity, short_text, description, season, fish, water, method, material, badges, accent, sort_order, recommended_ids, product_images(image_url, sort_order), product_specs(label, value, sort_order)',
      )
      .eq('is_published', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('posts')
      .select('slug, title, excerpt, date_label, kind, section')
      .eq('is_published', true)
      .order('published_at', { ascending: false }),
    supabase.from('content_blocks').select(
      'block_key, eyebrow, title, body, action_label, action_to, image_url, external_link, variant',
    ),
  ])

  const snapshot = getFallbackSnapshot()

  if (!productsResult.error && productsResult.data?.length) {
    snapshot.products = productsResult.data.map((row) => normalizeProduct(row as ProductRow))
  }

  if (!storiesResult.error && storiesResult.data?.length) {
    const normalized = storiesResult.data.map((row) => normalizeStory(row as StoryRow))
    snapshot.articles = normalized.filter((item) =>
      storiesResult.data?.find((row) => row.slug === item.slug)?.section === 'blog',
    )
    snapshot.newsCards = normalized.filter((item) =>
      storiesResult.data?.find((row) => row.slug === item.slug)?.section === 'news',
    )
  }

  if (!blocksResult.error && blocksResult.data?.length) {
    const nextBlocks = { ...defaultBlocks }

    blocksResult.data.forEach((row) => {
      nextBlocks[row.block_key] = normalizeBlock(row as BlockRow)
    })

    snapshot.blocks = nextBlocks
  }

  return snapshot
}

export function getCategoryOptions() {
  return fallbackCategories
}
