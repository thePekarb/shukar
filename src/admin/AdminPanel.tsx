import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { defaultBlocks, type ContentBlock } from '../lib/cms'
import { getSupabaseBrowserClient } from '../lib/supabase'
import {
  articles as fallbackArticles,
  categories,
  newsCards as fallbackNewsCards,
  products as fallbackProducts,
  type StoryCard,
} from '../store'

type AdminPanelProps = {
  isSupabaseConfigured: boolean
  routeLink: string
}

type AdminProduct = {
  id?: number
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
  fish: string
  water: string
  method: string
  material: string
  badges_text: string
  accent: string
  specs_text: string
  images: string[]
  is_published: boolean
}

type AdminPost = StoryCard & {
  section: 'news' | 'blog'
  is_published: boolean
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-я0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function productToAdmin(product: (typeof fallbackProducts)[number]): AdminProduct {
  return {
    id: product.id,
    category_slug: product.categorySlug,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: product.price,
    stock_status: product.stock,
    stock_quantity: product.stockQuantity,
    short_text: product.short,
    description: product.description,
    season: product.season,
    fish: product.fish,
    water: product.water,
    method: product.method,
    material: product.material,
    badges_text: product.badges.join(', '),
    accent: product.accent,
    specs_text: product.specs.map(([label, value]) => `${label}: ${value}`).join('\n'),
    images: product.images,
    is_published: true,
  }
}

function storyToAdmin(story: StoryCard, section: 'news' | 'blog'): AdminPost {
  return {
    ...story,
    section,
    is_published: true,
  }
}

function parseSpecs(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label, ...rest] = line.split(':')
      return {
        label: label.trim(),
        value: rest.join(':').trim(),
        sort_order: index,
      }
    })
    .filter((item) => item.label && item.value)
}

function getPublicPathFromUrl(url: string, bucket: string) {
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = url.indexOf(marker)
  return index >= 0 ? url.slice(index + marker.length) : null
}

function makeUploadPath(folder: string, slug: string, file: File) {
  const safeName = file.name.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '')
  return `${folder}/${slug}/${file.lastModified || 'file'}-${safeName}`
}

export function AdminPanel({ isSupabaseConfigured, routeLink }: AdminPanelProps) {
  const supabase = getSupabaseBrowserClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(() => Boolean(supabase))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [blocks, setBlocks] = useState<Record<string, ContentBlock>>(defaultBlocks)
  const [products, setProducts] = useState<AdminProduct[]>(() => fallbackProducts.map(productToAdmin))
  const [posts, setPosts] = useState<AdminPost[]>(() => [
    ...fallbackArticles.map((item) => storyToAdmin(item, 'blog')),
    ...fallbackNewsCards.map((item) => storyToAdmin(item, 'news')),
  ])
  const [activeTab, setActiveTab] = useState<'overview' | 'blocks' | 'products' | 'posts'>('overview')
  const [status, setStatus] = useState('')

  const postGroups = useMemo(
    () => ({
      blog: posts.filter((post) => post.section === 'blog'),
      news: posts.filter((post) => post.section === 'news'),
    }),
    [posts],
  )

  const verifyAdmin = useCallback(
    async (userId: string) => {
      if (!supabase) {
        return false
      }

      const { data } = await supabase
        .from('admin_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      const hasAdminAccess = Boolean(data)
      setIsAdmin(hasAdminAccess)
      return hasAdminAccess
    },
    [supabase],
  )

  const loadAdminData = useCallback(async () => {
    if (!supabase) {
      return
    }

    const [blockResult, productResult, postResult] = await Promise.all([
      supabase.from('content_blocks').select('*'),
      supabase
        .from('products')
        .select('*, product_images(image_url, sort_order), product_specs(label, value, sort_order)')
        .order('sort_order', { ascending: true }),
      supabase.from('posts').select('*').order('published_at', { ascending: false }),
    ])

    if (blockResult.data?.length) {
      const nextBlocks = { ...defaultBlocks }
      blockResult.data.forEach((row) => {
        nextBlocks[row.block_key] = {
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
      })
      setBlocks(nextBlocks)
    }

    if (productResult.data?.length) {
      setProducts(
        productResult.data.map((row) => ({
          id: Number(row.id),
          category_slug: row.category_slug,
          slug: row.slug,
          name: row.name,
          brand: row.brand,
          price: row.price,
          stock_status: row.stock_status,
          stock_quantity: row.stock_quantity ?? 0,
          short_text: row.short_text,
          description: row.description,
          season: row.season,
          fish: row.fish,
          water: row.water,
          method: row.method,
          material: row.material,
          badges_text: (row.badges ?? []).join(', '),
          accent: row.accent ?? '',
          specs_text: (row.product_specs ?? [])
            .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
            .map((item: { label: string; value: string }) => `${item.label}: ${item.value}`)
            .join('\n'),
          images: (row.product_images ?? [])
            .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
            .map((item: { image_url: string }) => item.image_url),
          is_published: row.is_published ?? true,
        })),
      )
    }

    if (postResult.data?.length) {
      setPosts(
        postResult.data.map((row) => ({
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt,
          date: row.date_label,
          kind: row.kind,
          section: row.section,
          is_published: row.is_published ?? true,
        })),
      )
    }
  }, [supabase])

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session ?? null)
      if (data.session) {
        const hasAdminAccess = await verifyAdmin(data.session.user.id)
        if (hasAdminAccess) {
          await loadAdminData()
        }
      }
      setCheckingAuth(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        const hasAdminAccess = await verifyAdmin(nextSession.user.id)
        if (hasAdminAccess) {
          await loadAdminData()
        }
      } else {
        setIsAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [loadAdminData, supabase, verifyAdmin])

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!supabase) {
      return
    }

    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setAuthError(error.message)
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return
    }
    await supabase.auth.signOut()
  }

  async function saveBlock(block: ContentBlock) {
    if (!supabase) {
      return
    }

    const { error } = await supabase.from('content_blocks').upsert({
      block_key: block.key,
      eyebrow: block.eyebrow,
      title: block.title,
      body: block.text,
      action_label: block.actionLabel,
      action_to: block.actionTo,
      image_url: block.imageUrl,
      external_link: block.external,
      variant: block.variant,
    })

    setStatus(error ? error.message : `Блок ${block.key} сохранен.`)
  }

  async function uploadBlockImage(blockKey: string, file: File) {
    if (!supabase) {
      return
    }

    const path = makeUploadPath('blocks', blockKey, file)
    const { error } = await supabase.storage.from('site-media').upload(path, file, {
      upsert: true,
    })

    if (error) {
      setStatus(error.message)
      return
    }

    const { data } = supabase.storage.from('site-media').getPublicUrl(path)
    setBlocks((current) => ({
      ...current,
      [blockKey]: {
        ...current[blockKey],
        imageUrl: data.publicUrl,
      },
    }))
    setStatus('Изображение блока загружено. Нажмите «Сохранить блок».')
  }

  async function saveProduct(product: AdminProduct) {
    if (!supabase) {
      return
    }

    const payload = {
      category_slug: product.category_slug,
      slug: product.slug || slugify(product.name),
      name: product.name,
      brand: product.brand,
      price: product.price,
      stock_status: product.stock_status,
      stock_quantity: product.stock_quantity,
      short_text: product.short_text,
      description: product.description,
      season: product.season,
      fish: product.fish,
      water: product.water,
      method: product.method,
      material: product.material,
      badges: product.badges_text
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      accent: product.accent,
      is_published: product.is_published,
    }

    const result = product.id
      ? await supabase.from('products').update(payload).eq('id', product.id).select('id').single()
      : await supabase.from('products').insert(payload).select('id').single()

    if (result.error || !result.data) {
      setStatus(result.error?.message ?? 'Не удалось сохранить товар.')
      return
    }

    const productId = Number(result.data.id)

    await supabase.from('product_specs').delete().eq('product_id', productId)
    const specs = parseSpecs(product.specs_text)
    if (specs.length) {
      await supabase.from('product_specs').insert(
        specs.map((item) => ({ ...item, product_id: productId })),
      )
    }

    await supabase.from('product_images').delete().eq('product_id', productId)
    if (product.images.length) {
      await supabase.from('product_images').insert(
        product.images.slice(0, 10).map((imageUrl, index) => ({
          product_id: productId,
          image_url: imageUrl,
          sort_order: index,
        })),
      )
    }

    setProducts((current) =>
      current.map((item) => (item === product ? { ...product, id: productId } : item)),
    )
    setStatus(`Товар «${product.name}» сохранен.`)
  }

  async function uploadProductImage(productIndex: number, file: File) {
    if (!supabase) {
      return
    }

    const product = products[productIndex]
    const path = makeUploadPath('products', product.slug || slugify(product.name), file)
    const { error } = await supabase.storage.from('product-media').upload(path, file, { upsert: true })

    if (error) {
      setStatus(error.message)
      return
    }

    const { data } = supabase.storage.from('product-media').getPublicUrl(path)
    const nextImages = [...product.images, data.publicUrl].slice(0, 10)

    setProducts((current) =>
      current.map((item, index) => (index === productIndex ? { ...item, images: nextImages } : item)),
    )

    if (product.id) {
      await supabase.from('product_images').insert({
        product_id: product.id,
        image_url: data.publicUrl,
        sort_order: nextImages.length - 1,
      })
    }

    setStatus('Фото товара загружено.')
  }

  async function removeProductImage(productIndex: number, imageIndex: number) {
    if (!supabase) {
      return
    }

    const product = products[productIndex]
    const imageUrl = product.images[imageIndex]
    const storagePath = getPublicPathFromUrl(imageUrl, 'product-media')

    setProducts((current) =>
      current.map((item, index) =>
        index === productIndex
          ? { ...item, images: item.images.filter((_, idx) => idx !== imageIndex) }
          : item,
      ),
    )

    if (product.id) {
      await supabase.from('product_images').delete().eq('product_id', product.id).eq('image_url', imageUrl)
    }

    if (storagePath) {
      await supabase.storage.from('product-media').remove([storagePath])
    }
  }

  async function savePost(post: AdminPost) {
    if (!supabase) {
      return
    }

    const { error } = await supabase.from('posts').upsert(
      {
        slug: post.slug || slugify(post.title),
        title: post.title,
        excerpt: post.excerpt,
        date_label: post.date,
        kind: post.kind,
        section: post.section,
        is_published: post.is_published,
      },
      { onConflict: 'slug' },
    )

    setStatus(error ? error.message : `Пост «${post.title}» сохранен.`)
  }

  if (!isSupabaseConfigured) {
    return (
      <section className="section container">
        <div className="admin-shell">
          <h1 className="page-title">Админ-панель</h1>
          <p className="page-lead">
            Сначала добавьте `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`, затем выполните SQL
            из `supabase/schema.sql`.
          </p>
          <div className="admin-actions">
            <Link className="button primary" to="/">
              Вернуться на сайт
            </Link>
            <a className="button secondary" href={routeLink} target="_blank" rel="noreferrer">
              Открыть маршрут магазина
            </a>
          </div>
        </div>
      </section>
    )
  }

  if (checkingAuth) {
    return (
      <section className="section container">
        <div className="admin-shell">
          <h1 className="page-title">Проверяем доступ в админ-панель</h1>
        </div>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="section container">
        <form className="admin-auth" onSubmit={handleSignIn}>
          <h1 className="page-title">Вход в /adminpanel</h1>
          <p className="page-lead">Войдите через Supabase Auth под админским аккаунтом.</p>
          <label className="field">
            <span>Email</span>
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label className="field">
            <span>Пароль</span>
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
          </label>
          {authError && <p className="status-line">{authError}</p>}
          <button className="button primary" type="submit">
            Войти
          </button>
        </form>
      </section>
    )
  }

  if (!isAdmin) {
    return (
      <section className="section container">
        <div className="admin-shell">
          <h1 className="page-title">Доступ ограничен</h1>
          <p className="page-lead">Аккаунт вошел в систему, но не найден в таблице `admin_profiles`.</p>
          <button className="button secondary" onClick={() => void handleSignOut()}>
            Выйти
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="section container">
      <div className="admin-shell">
        <div className="admin-topbar">
          <div>
            <p className="eyebrow">CMS и товары</p>
            <h1 className="page-title">Админ-панель ЩУКАРЯ</h1>
          </div>
          <div className="admin-actions">
            <Link className="button secondary" to="/">
              Открыть сайт
            </Link>
            <button className="button ghost" onClick={() => void handleSignOut()}>
              Выйти
            </button>
          </div>
        </div>

        <div className="admin-tabs">
          {[
            ['overview', 'Обзор'],
            ['blocks', 'Блоки'],
            ['products', 'Товары'],
            ['posts', 'Советы и новости'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={activeTab === value ? 'chip active' : 'chip'}
              onClick={() => setActiveTab(value as typeof activeTab)}
            >
              {label}
            </button>
          ))}
        </div>

        {status && <p className="status-line">{status}</p>}

        {activeTab === 'overview' && (
          <div className="admin-grid">
            <article className="admin-card">
              <strong>Что уже подключено</strong>
              <p>Auth для входа в `/adminpanel`, товары, изображения товаров, посты и контентные блоки.</p>
            </article>
            <article className="admin-card">
              <strong>Что редактируется</strong>
              <p>Hero и баннеры через `content_blocks`, товары и их характеристики через `products` и `product_specs`.</p>
            </article>
            <article className="admin-card">
              <strong>Изображения</strong>
              <p>Медиа загружается в buckets `site-media` и `product-media`. Для товара можно держать до 10 фото.</p>
            </article>
          </div>
        )}

        {activeTab === 'blocks' && (
          <div className="admin-stack">
            {Object.values(blocks).map((block) => (
              <article key={block.key} className="admin-card">
                <div className="admin-card-head">
                  <strong>{block.key}</strong>
                  <button className="button secondary" onClick={() => void saveBlock(block)}>
                    Сохранить блок
                  </button>
                </div>
                <div className="admin-form-grid">
                  <label className="field">
                    <span>Eyebrow</span>
                    <input
                      value={block.eyebrow}
                      onChange={(event) =>
                        setBlocks((current) => ({
                          ...current,
                          [block.key]: { ...block, eyebrow: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Заголовок</span>
                    <input
                      value={block.title}
                      onChange={(event) =>
                        setBlocks((current) => ({
                          ...current,
                          [block.key]: { ...block, title: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="field full">
                    <span>Текст</span>
                    <textarea
                      rows={4}
                      value={block.text}
                      onChange={(event) =>
                        setBlocks((current) => ({
                          ...current,
                          [block.key]: { ...block, text: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Кнопка</span>
                    <input
                      value={block.actionLabel}
                      onChange={(event) =>
                        setBlocks((current) => ({
                          ...current,
                          [block.key]: { ...block, actionLabel: event.target.value },
                        }))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Ссылка</span>
                    <input
                      value={block.actionTo}
                      onChange={(event) =>
                        setBlocks((current) => ({
                          ...current,
                          [block.key]: { ...block, actionTo: event.target.value },
                        }))
                      }
                    />
                  </label>
                </div>
                <div className="admin-media-row">
                  {block.imageUrl ? <img src={block.imageUrl} alt="" className="admin-preview" /> : <div className="admin-preview placeholder">Нет изображения</div>}
                  <div className="admin-actions">
                    <label className="button ghost">
                      Загрузить фото
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            void uploadBlockImage(block.key, file)
                          }
                        }}
                      />
                    </label>
                    {block.imageUrl && (
                      <button
                        className="button secondary"
                        onClick={() =>
                          setBlocks((current) => ({
                            ...current,
                            [block.key]: { ...block, imageUrl: null },
                          }))
                        }
                      >
                        Убрать фото
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="admin-stack">
            <button
              className="button primary"
              onClick={() =>
                setProducts((current) => [
                  {
                    category_slug: categories[0].slug,
                    slug: `new-${Date.now()}`,
                    name: 'Новый товар',
                    brand: '',
                    price: '',
                    stock_status: 'В наличии',
                    stock_quantity: 0,
                    short_text: '',
                    description: '',
                    season: '',
                    fish: '',
                    water: '',
                    method: '',
                    material: '',
                    badges_text: '',
                    accent: 'linear-gradient(135deg, #183a43 0%, #2d4a3e 42%, #e0b57b 100%)',
                    specs_text: '',
                    images: [],
                    is_published: true,
                  },
                  ...current,
                ])
              }
            >
              Добавить товар
            </button>

            {products.map((product, productIndex) => (
              <article key={`${product.slug}-${productIndex}`} className="admin-card">
                <div className="admin-card-head">
                  <strong>{product.name || 'Новый товар'}</strong>
                  <button className="button secondary" onClick={() => void saveProduct(product)}>
                    Сохранить товар
                  </button>
                </div>
                <div className="admin-form-grid">
                  <label className="field">
                    <span>Название</span>
                    <input
                      value={product.name}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex
                              ? {
                                  ...item,
                                  name: event.target.value,
                                  slug: item.slug.startsWith('new-') ? slugify(event.target.value) : item.slug,
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Slug</span>
                    <input
                      value={product.slug}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, slug: slugify(event.target.value) } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Категория</span>
                    <select
                      value={product.category_slug}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, category_slug: event.target.value } : item,
                          ),
                        )
                      }
                    >
                      {categories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Бренд</span>
                    <input
                      value={product.brand}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, brand: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Цена</span>
                    <input
                      value={product.price}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, price: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Остаток</span>
                    <input
                      type="number"
                      value={product.stock_quantity}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex
                              ? { ...item, stock_quantity: Number(event.target.value) || 0 }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field full">
                    <span>Короткий текст</span>
                    <textarea
                      rows={2}
                      value={product.short_text}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, short_text: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field full">
                    <span>Описание</span>
                    <textarea
                      rows={4}
                      value={product.description}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, description: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Рыба</span>
                    <input
                      value={product.fish}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, fish: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Способ ловли</span>
                    <input
                      value={product.method}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, method: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Бейджи</span>
                    <input
                      value={product.badges_text}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, badges_text: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field full">
                    <span>Характеристики</span>
                    <textarea
                      rows={5}
                      value={product.specs_text}
                      onChange={(event) =>
                        setProducts((current) =>
                          current.map((item, index) =>
                            index === productIndex ? { ...item, specs_text: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
                <div className="admin-media-column">
                  <div className="admin-image-list">
                    {product.images.map((imageUrl, imageIndex) => (
                      <div key={imageUrl} className="admin-image-card">
                        <img src={imageUrl} alt="" className="admin-preview" />
                        <button
                          className="button ghost"
                          onClick={() => void removeProductImage(productIndex, imageIndex)}
                        >
                          Удалить фото
                        </button>
                      </div>
                    ))}
                  </div>
                  {product.images.length < 10 && (
                    <label className="button ghost">
                      Загрузить фото товара
                      <input
                        hidden
                        type="file"
                        accept="image/*"
                        onChange={(event) => {
                          const file = event.target.files?.[0]
                          if (file) {
                            void uploadProductImage(productIndex, file)
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="admin-stack">
            <div className="admin-grid">
              <article className="admin-card">
                <strong>Советы</strong>
                <p>{postGroups.blog.length} материалов</p>
              </article>
              <article className="admin-card">
                <strong>Новости и акции</strong>
                <p>{postGroups.news.length} материалов</p>
              </article>
            </div>

            {posts.map((post, index) => (
              <article key={`${post.slug}-${index}`} className="admin-card">
                <div className="admin-card-head">
                  <strong>{post.title}</strong>
                  <button className="button secondary" onClick={() => void savePost(post)}>
                    Сохранить пост
                  </button>
                </div>
                <div className="admin-form-grid">
                  <label className="field">
                    <span>Заголовок</span>
                    <input
                      value={post.title}
                      onChange={(event) =>
                        setPosts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, title: event.target.value, slug: slugify(event.target.value) }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Дата</span>
                    <input
                      value={post.date}
                      onChange={(event) =>
                        setPosts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, date: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Секция</span>
                    <select
                      value={post.section}
                      onChange={(event) =>
                        setPosts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, section: event.target.value as 'news' | 'blog' }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="blog">Советы</option>
                      <option value="news">Новости и акции</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Тип</span>
                    <select
                      value={post.kind}
                      onChange={(event) =>
                        setPosts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, kind: event.target.value as StoryCard['kind'] }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="advice">Совет</option>
                      <option value="news">Новость</option>
                      <option value="offer">Акция</option>
                    </select>
                  </label>
                  <label className="field full">
                    <span>Краткое описание</span>
                    <textarea
                      rows={3}
                      value={post.excerpt}
                      onChange={(event) =>
                        setPosts((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, excerpt: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
