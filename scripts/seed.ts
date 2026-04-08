import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY // anon key is fine if RLS is bypassed or we use service role

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// From store.ts
const categories = [
  { slug: 'spinningi', name: 'Спиннинги', image: '/assets/categories/spinning.png' },
  { slug: 'katushki', name: 'Катушки', image: '/assets/categories/reel.png' },
  { slug: 'primanki', name: 'Приманки', image: '/assets/categories/lure.png' },
  { slug: 'leski-i-shnury', name: 'Лески и шнуры', image: '/assets/categories/line.png' },
  { slug: 'odezhda-i-obuv', name: 'Одежда и обувь', image: '/assets/categories/clothes.png' },
  { slug: 'aksessuary', name: 'Аксессуары', image: '/assets/categories/accessories.png' },
]

const fishTypes = [
  'Щука',
  'Судак',
  'Окунь',
  'Жерех',
  'Голавль',
  'Лещ',
  'Карась',
  'Карп',
  'Сазан',
  'Сом',
]

async function seed() {
  console.log('Seeding categories...')
  for (const [index, cat] of categories.entries()) {
    const { error } = await supabase.from('categories').upsert(
      { 
        slug: cat.slug, 
        name: cat.name, 
        image_url: cat.image,
        sort_order: index 
      },
      { onConflict: 'slug' }
    )
    if (error) {
      console.error('Error inserting category:', cat.slug, error.message)
    } else {
      console.log('Inserted:', cat.name)
    }
  }

  console.log('\nSeeding fish types...')
  for (const fish of fishTypes) {
    const { error } = await supabase.from('fish_types').upsert(
      { name: fish },
      { onConflict: 'name' }
    )
    if (error) {
      console.error('Error inserting fish:', fish, error.message)
    } else {
      console.log('Inserted:', fish)
    }
  }

  console.log('\nSeed completed.')
}

seed()
