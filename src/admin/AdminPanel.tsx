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

function notifyCmsRefresh() {
  window.dispatchEvent(new Event('cms:refresh'))
}

export function AdminPanel({ isSupabaseConfigured, routeLink }: AdminPanelProps) {
  const supabase = getSupabaseBrowserClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(() => Boolean(supabase))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [adminCheckError, setAdminCheckError] = useState('')
  const [blocks, setBlocks] = useState<Record<string, ContentBlock>>(defaultBlocks)
  const [products, setProducts] = useState<AdminProduct[]>(() => fallbackProducts.map(productToAdmin))
  const [posts, setPosts] = useState<AdminPost[]>(() => [
    ...fallbackArticles.map((item) => storyToAdmin(item, 'blog')),
    ...fallbackNewsCards.map((item) => storyToAdmin(item, 'news')),
  ])
  const [activeTab, setActiveTab] = useState<'editor' | 'overview' | 'blocks' | 'products' | 'posts'>('editor')
  const [status, setStatus] = useState('')

  const postGroups = useMemo(
    () => ({
      blog: posts.filter((post) => post.section === 'blog'),
      news: posts.filter((post) => post.section === 'news'),
    }),
    [posts],
  )

  const updateBlock = useCallback((blockKey: string, patch: Partial<ContentBlock>) => {
    setBlocks((current) => ({
      ...current,
      [blockKey]: { ...current[blockKey], ...patch },
    }))
  }, [])

  const updateProduct = useCallback((index: number, patch: Partial<AdminProduct>) => {
    setProducts((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }, [])

  const updatePost = useCallback((index: number, patch: Partial<AdminPost>) => {
    setPosts((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    )
  }, [])

  const verifyAdmin = useCallback(
    async (userId: string) => {
      if (!supabase) {
        return false
      }

      const { data, error } = await supabase
        .from('admin_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        setAdminCheckError(
          'Не удалось проверить права администратора. Обычно это значит, что в Supabase не применен SQL fix для admin_profiles и RLS.',
        )
        setIsAdmin(false)
        return false
      }

      setAdminCheckError('')
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
    setAdminCheckError('')
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
    if (!error) {
      notifyCmsRefresh()
    }
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
    await supabase.from('content_blocks').update({ image_url: data.publicUrl }).eq('block_key', blockKey)
    setBlocks((current) => ({
      ...current,
      [blockKey]: {
        ...current[blockKey],
        imageUrl: data.publicUrl,
      },
    }))
    setStatus('Изображение блока загружено.')
    notifyCmsRefresh()
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
    notifyCmsRefresh()
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
    notifyCmsRefresh()
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

    notifyCmsRefresh()
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
    if (!error) {
      notifyCmsRefresh()
    }
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
          {adminCheckError && <p className="status-line">{adminCheckError}</p>}
          <button className="button secondary" onClick={() => void handleSignOut()}>
            Выйти
          </button>
        </div>
      </section>
    )
  }

  return (
    <>
      <div className="admin-floating-bar">
        <div className="container admin-floating-inner">
          <div className="admin-floating-left">
            <span className="admin-floating-badge">Режим редактирования</span>
            <div className="admin-tabs">
              {[
                ['editor', 'Визуальный режим'],
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
          </div>
          <div className="admin-floating-right">
            <Link className="button secondary" to="/">
              Открыть сайт
            </Link>
            <button className="button ghost" onClick={() => void handleSignOut()}>
              Выйти
            </button>
          </div>
        </div>
        {status && <div className="container"><p className="status-line">{status}</p></div>}
      </div>

      {activeTab === 'editor' && (
        <AdminVisualEditor
          blocks={blocks}
          products={products}
          posts={posts}
          onUpdateBlock={updateBlock}
          onSaveBlock={saveBlock}
          onUploadBlockImage={uploadBlockImage}
          onUpdateProduct={updateProduct}
          onSaveProduct={saveProduct}
          onUploadProductImage={uploadProductImage}
          onRemoveProductImage={removeProductImage}
          onUpdatePost={updatePost}
          onSavePost={savePost}
        />
      )}

      {activeTab !== 'editor' && (
        <section className="section container">
          <div className="admin-shell">
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
      )}
    </>
  )
}

function AdminVisualEditor({
  blocks,
  products,
  posts,
  onUpdateBlock,
  onSaveBlock,
  onUploadBlockImage,
  onUpdateProduct,
  onSaveProduct,
  onUploadProductImage,
  onRemoveProductImage,
  onUpdatePost,
  onSavePost,
}: {
  blocks: Record<string, ContentBlock>
  products: AdminProduct[]
  posts: AdminPost[]
  onUpdateBlock: (blockKey: string, patch: Partial<ContentBlock>) => void
  onSaveBlock: (block: ContentBlock) => Promise<void>
  onUploadBlockImage: (blockKey: string, file: File) => Promise<void>
  onUpdateProduct: (index: number, patch: Partial<AdminProduct>) => void
  onSaveProduct: (product: AdminProduct) => Promise<void>
  onUploadProductImage: (index: number, file: File) => Promise<void>
  onRemoveProductImage: (index: number, imageIndex: number) => Promise<void>
  onUpdatePost: (index: number, patch: Partial<AdminPost>) => void
  onSavePost: (post: AdminPost) => Promise<void>
}) {
  const orderedBlockKeys = [
    'hero_home',
    'catalog_banner',
    'about_banner',
    'news_banner',
    'blog_banner',
    'gallery_banner',
  ]

  return (
    <div className="admin-visual-editor">
      <div className="page-intro">
        <p className="eyebrow">Редактирование витрины</p>
        <h1 className="page-title">Сайт в режиме редактирования</h1>
        <p className="page-lead">
          Здесь шапка, футер и навигация остаются как у сайта, а редактируемые тексты и изображения
          получают аккуратные inline-контролы без перехода в отдельную «глухую» админку.
        </p>
      </div>

      <div className="admin-visual-stack">
        {orderedBlockKeys.map((blockKey) => {
          const block = blocks[blockKey]
          if (!block) {
            return null
          }

          const variantClass = block.variant !== 'default' ? `${block.variant}-variant` : ''

          return (
            <article key={block.key} className={`section-banner admin-visual-block ${variantClass}`}>
              {block.imageUrl ? (
                <img src={block.imageUrl} alt="" />
              ) : (
                <div className="admin-banner-placeholder">Нет изображения</div>
              )}
              <div className="banner-overlay" />
              <div className="banner-content admin-banner-content">
                <InlineEditableField
                  value={block.eyebrow}
                  onSave={async (value) => {
                    onUpdateBlock(block.key, { eyebrow: value })
                    await onSaveBlock({ ...block, eyebrow: value })
                  }}
                  placeholder="Eyebrow"
                  displayClassName="eyebrow"
                />
                <InlineEditableField
                  value={block.title}
                  onSave={async (value) => {
                    onUpdateBlock(block.key, { title: value })
                    await onSaveBlock({ ...block, title: value })
                  }}
                  placeholder="Заголовок"
                  multiline
                  displayClassName="admin-inline-title"
                />
                <InlineEditableField
                  value={block.text}
                  onSave={async (value) => {
                    onUpdateBlock(block.key, { text: value })
                    await onSaveBlock({ ...block, text: value })
                  }}
                  placeholder="Текст секции"
                  multiline
                  displayClassName="admin-inline-body"
                />
                <InlineEditableField
                  value={block.actionLabel}
                  onSave={async (value) => {
                    onUpdateBlock(block.key, { actionLabel: value })
                    await onSaveBlock({ ...block, actionLabel: value })
                  }}
                  placeholder="Подпись кнопки"
                  displayClassName="admin-inline-link"
                />
              </div>

              <div className="admin-block-toolbar">
                <label className="inline-icon-button">
                  <span>＋</span>
                  <input
                    hidden
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) {
                        void onUploadBlockImage(block.key, file)
                      }
                    }}
                  />
                </label>
                {block.imageUrl && (
                  <button
                    type="button"
                    className="inline-icon-button danger"
                    onClick={() => {
                      onUpdateBlock(block.key, { imageUrl: null })
                      void onSaveBlock({ ...block, imageUrl: null })
                    }}
                  >
                    ×
                  </button>
                )}
                <button type="button" className="button secondary" onClick={() => void onSaveBlock(block)}>
                  Сохранить секцию
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <section className="section-heading">
        <p className="eyebrow">Новости и советы</p>
        <h2>Карточки контента вживую</h2>
        <p>Редактирование работает прямо на карточках: меняйте заголовок, дату и текст, а затем сохраняйте без перезагрузки.</p>
      </section>

      <div className="story-grid three-columns">
        {posts.map((post, index) => (
          <article
            key={`${post.slug}-${index}`}
            className={`story-card ${post.kind === 'advice' ? 'advice-card' : post.kind === 'offer' ? 'offer-card' : 'news-card'} admin-story-editor`}
          >
            <div className="story-meta">
              <InlineEditableField
                value={post.kind === 'advice' ? 'Совет' : post.kind === 'offer' ? 'Акция' : 'Новость'}
                onSave={async (value) => {
                  const nextKind =
                    value.toLowerCase().includes('совет')
                      ? 'advice'
                      : value.toLowerCase().includes('акц')
                        ? 'offer'
                        : 'news'
                  onUpdatePost(index, { kind: nextKind })
                  await onSavePost({ ...post, kind: nextKind })
                }}
                placeholder="Тип"
                displayClassName="admin-inline-meta"
              />
              <InlineEditableField
                value={post.date}
                onSave={async (value) => {
                  onUpdatePost(index, { date: value })
                  await onSavePost({ ...post, date: value })
                }}
                placeholder="Дата"
                displayClassName="admin-inline-meta admin-inline-time"
              />
            </div>
            <InlineEditableField
              value={post.title}
              onSave={async (value) => {
                const slug = slugify(value)
                onUpdatePost(index, { title: value, slug })
                await onSavePost({ ...post, title: value, slug })
              }}
              placeholder="Заголовок"
              multiline
              displayClassName="admin-inline-strong"
            />
            <InlineEditableField
              value={post.excerpt}
              onSave={async (value) => {
                onUpdatePost(index, { excerpt: value })
                await onSavePost({ ...post, excerpt: value })
              }}
              placeholder="Краткое описание"
              multiline
              displayClassName="admin-inline-body"
            />

            <div className="admin-card-toolbar">
              <button type="button" className="button secondary" onClick={() => void onSavePost(post)}>
                Сохранить карточку
              </button>
            </div>
          </article>
        ))}
      </div>

      <section className="section-heading">
        <p className="eyebrow">Товары</p>
        <h2>Карточки каталога в режиме редактирования</h2>
        <p>Меняйте ключевые поля прямо на карточке. Фото можно добавлять и удалять здесь же, не выходя из визуального режима.</p>
      </section>

      <div className="product-grid admin-product-grid">
        {products.map((product, index) => (
          <article key={`${product.slug}-${index}`} className="product-card admin-product-editor">
            <div className="product-cover" style={{ background: product.accent }}>
              {product.images[0] ? (
                <img src={product.images[0]} alt={product.name} className="product-card-image" />
              ) : (
                <div className="admin-product-placeholder">Нет фото</div>
              )}
              <span>{product.brand || 'Бренд'}</span>
              <strong>{categories.find((category) => category.slug === product.category_slug)?.name ?? 'Категория'}</strong>
            </div>

            <div className="product-body admin-product-body">
              <InlineEditableField
                value={product.price}
                onSave={async (value) => {
                  onUpdateProduct(index, { price: value })
                  await onSaveProduct({ ...product, price: value })
                }}
                placeholder="Цена"
                displayClassName="admin-inline-price"
              />
              <InlineEditableField
                value={product.name}
                onSave={async (value) => {
                  const slug = slugify(value)
                  onUpdateProduct(index, { name: value, slug })
                  await onSaveProduct({ ...product, name: value, slug })
                }}
                placeholder="Название"
                multiline
                displayClassName="admin-inline-strong"
              />
              <InlineEditableField
                value={product.short_text}
                onSave={async (value) => {
                  onUpdateProduct(index, { short_text: value })
                  await onSaveProduct({ ...product, short_text: value })
                }}
                placeholder="Краткий текст"
                multiline
                displayClassName="admin-inline-body"
              />

              <div className="admin-image-strip">
                {product.images.map((imageUrl, imageIndex) => (
                  <div key={`${imageUrl}-${imageIndex}`} className="admin-image-chip">
                    <img src={imageUrl} alt="" />
                    <button
                      type="button"
                      className="inline-icon-button danger"
                      onClick={() => void onRemoveProductImage(index, imageIndex)}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {product.images.length < 10 && (
                  <label className="admin-image-add">
                    <span>＋</span>
                    <input
                      hidden
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          void onUploadProductImage(index, file)
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="admin-card-toolbar">
                <button type="button" className="button secondary" onClick={() => void onSaveProduct(product)}>
                  Сохранить товар
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function InlineEditableField({
  value,
  onSave,
  placeholder,
  multiline = false,
  displayClassName,
}: {
  value: string
  onSave: (value: string) => void | Promise<void>
  placeholder: string
  multiline?: boolean
  displayClassName?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editing) {
      setDraft(value)
    }
  }, [editing, value])

  return (
    <div className="inline-editable">
      {!editing ? (
        <div className="inline-editable-display">
          <div className={displayClassName}>{value || placeholder}</div>
          <button
            type="button"
            className="inline-icon-button"
            aria-label={`Редактировать ${placeholder}`}
            onClick={() => setEditing(true)}
          >
            ✎
          </button>
        </div>
      ) : (
        <div className="inline-editable-form">
          {multiline ? (
            <textarea value={draft} rows={4} onChange={(event) => setDraft(event.target.value)} />
          ) : (
            <input value={draft} onChange={(event) => setDraft(event.target.value)} />
          )}
          <div className="inline-editable-actions">
            <button
              type="button"
              className="button secondary"
              disabled={saving}
              onClick={async () => {
                setSaving(true)
                try {
                  await onSave(draft)
                  setEditing(false)
                } finally {
                  setSaving(false)
                }
              }}
            >
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={saving}
              onClick={() => {
                setDraft(value)
                setEditing(false)
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
