import type { StoryCard } from '../store'

export type ProductSpec = {
  id?: number
  product_id?: number
  label: string
  value: string
  sort_order: number
}

export type AdminProduct = {
  id?: number
  category_id?: number
  category_slug: string
  slug: string
  name: string
  brand: string
  price: string
  stock_status: 'В наличии' | 'Под заказ' | 'Уточнить наличие'
  stock_quantity: number
  short_text: string
  description: string
  season: string
  fish: string // legacy
  fish_ids: number[] // new array for fish types
  water: string
  method: string
  material: string
  badges_text: string
  accent: string
  specs_text: string // legacy or simple text format
  product_specs: ProductSpec[] // dynamic array
  images: string[]
  is_published: boolean
}

export type AdminPost = StoryCard & {
  id?: number
  section: 'news' | 'blog'
  is_published: boolean
  images?: string[] // loaded from post_images
}

export type Category = {
  id: number
  slug: string
  name: string
  image_url: string | null
}

export type FishType = {
  id: number
  name: string
}

export type GalleryImage = {
  id?: number
  image_url: string
  caption?: string
  sort_order?: number
}

export type SiteSettings = {
  phone: string
  address: string
  working_hours: string
  vk_link: string
  whatsapp_link: string
  avito_link: string
  about_text: string
  about_image_url: string
}
