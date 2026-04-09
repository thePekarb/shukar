import {
  Suspense,
  lazy,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import backgroundVideo from './assets/backgroundvideo.mp4'
import headerLogoSrc from './assets/ЛОГОТИП.png'
import heroPoster from './assets/hero.png'
import heroVideo from './assets/herp banner.mp4'
import bannerBlog from './assets/Блог : советы.png'
import bannerAbout from './assets/Блок “О магазине”.png'
import bannerGallery from './assets/Галерея.png'
import bannerCatalog from './assets/Категории каталога.png'
import bannerNews from './assets/Новости : акции.png'
import karasIcon from './assets/icon/карась.svg'
import leshIcon from './assets/icon/лещ.svg'
import sudakIcon from './assets/icon/судак.svg'
import shukaIcon from './assets/icon/щука.svg'
import './App.css'
import { useCmsSnapshot } from './lib/useCmsSnapshot'
import { isSupabaseConfigured } from './lib/supabase'
import type { ContentBlock } from './lib/cms'
import {
  articles as fallbackArticles,
  categories,
  categoryMap,
  galleryMoments as fallbackGalleryMoments,
  newsCards as fallbackNewsCards,
  products as fallbackProducts,
  reviews as fallbackReviews,
  type Product,
  type StoryCard,
} from './store'

const phoneDisplay = '+7 (937) 748-48-48'
const phoneHref = 'tel:+79377484848'
const whatsappLink = 'https://wa.me/79377484848'
const vkLink = 'https://vk.com/shykar34'
const avitoLink =
  'https://www.avito.ru/brands/shykar34/all?sellerId=89ba7362e1e951f9d09ab4a4bbbdfe26'
const routeLink =
  'https://yandex.ru/maps/?text=%D0%92%D0%BE%D0%BB%D0%B3%D0%BE%D0%B3%D1%80%D0%B0%D0%B4%2C%20%D0%A3%D0%BD%D0%B8%D0%B2%D0%B5%D1%80%D1%81%D0%B8%D1%82%D0%B5%D1%82%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BF%D1%80%D0%BE%D1%81%D0%BF%D0%B5%D0%BA%D1%82%2C%2082'
const wishlistStorageKey = 'shukar-wishlist'
type GallerySlide = {
  image: string
  title: string
  text: string
}

const gallerySlides: GallerySlide[] = [
  { image: heroPoster, title: 'Раннее утро у воды', text: 'Свет, глубина и настроение выезда.' },
  { image: bannerCatalog, title: 'Категории и сценарии', text: 'Показываем ассортимент без лишнего шума.' },
  { image: bannerAbout, title: 'Ассортимент вживую', text: 'Сравнивайте снасти и советуйтесь прямо в магазине.' },
  { image: bannerNews, title: 'Поступления и акции', text: 'Следите за новостями сезона и быстрым резервом.' },
  { image: bannerBlog, title: 'Советы и разборы', text: 'Короткие материалы для уверенного выбора.' },
  { image: bannerGallery, title: 'Атмосфера магазина', text: 'Реальные полки, детали и рабочие позиции.' },
]
const LazyAdminPanel = lazy(async () => ({ default: (await import('./admin/AdminPanel')).AdminPanel }))

function resolveBlock(
  blocks: Record<string, ContentBlock>,
  key: keyof typeof blocks | string,
  fallback: {
    eyebrow: string
    title: string
    text: string
    actionLabel: string
    actionTo: string
    external?: boolean
    variant?: 'news' | 'advice' | 'gallery' | 'about' | 'default'
  },
) {
  const block = blocks[key]

  if (!block) {
    return {
      ...fallback,
      external: Boolean(fallback.external),
      variant: fallback.variant ?? 'default',
      imageUrl: null,
    }
  }

  return {
    eyebrow: block.eyebrow || fallback.eyebrow,
    title: block.title || fallback.title,
    text: block.text || fallback.text,
    actionLabel: block.actionLabel || fallback.actionLabel,
    actionTo: block.actionTo || fallback.actionTo,
    external: block.external,
    variant: block.variant,
    imageUrl: block.imageUrl,
  }
}

function getProductsByCategoryFromList(productList: Product[], categorySlug: string) {
  return productList.filter((product) => product.categorySlug === categorySlug)
}

function getProductBySlugsFromList(productList: Product[], categorySlug: string, productSlug: string) {
  return productList.find(
    (product) => product.categorySlug === categorySlug && product.slug === productSlug,
  )
}

function parseWishlistIds(source: string | null) {
  if (!source) {
    return []
  }

  return source
    .split(',')
    .map((value) => Number(value.trim()))
    .filter((value, index, array) => Number.isInteger(value) && array.indexOf(value) === index)
}

function loadWishlistIds() {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    return parseWishlistIds(window.localStorage.getItem(wishlistStorageKey))
  } catch {
    return []
  }
}

function formatWishlistUrl(ids: number[]) {
  if (typeof window === 'undefined') {
    return `/wishlist${ids.length ? `?items=${ids.join(',')}` : ''}`
  }

  const url = new URL('/wishlist', window.location.origin)

  if (ids.length) {
    url.searchParams.set('items', ids.join(','))
  }

  return url.toString()
}

function App() {
  const shellRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const { snapshot } = useCmsSnapshot()
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => loadWishlistIds())
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [isWaterTheme, setIsWaterTheme] = useState(false)

  const cmsProducts = snapshot.products.length ? snapshot.products : fallbackProducts
  const cmsArticles = snapshot.articles.length ? snapshot.articles : fallbackArticles
  const cmsNewsCards = snapshot.newsCards.length ? snapshot.newsCards : fallbackNewsCards
  const cmsReviews = fallbackReviews
  const cmsGalleryMoments = fallbackGalleryMoments

  useEffect(() => {
    window.localStorage.setItem(wishlistStorageKey, wishlistIds.join(','))
  }, [wishlistIds])

  useEffect(() => {
    const updateScrollState = () => {
      const maxScroll =
        document.documentElement.scrollHeight - document.documentElement.clientHeight
      const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0

      shellRef.current?.style.setProperty('--scroll-progress', progress.toFixed(4))
      setShowScrollTop((current) => {
        const next = window.scrollY > 520
        return current === next ? current : next
      })
    }

    updateScrollState()
    window.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      window.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [])

  useEffect(() => {
    shellRef.current?.style.setProperty('--scroll-progress', '0')
    window.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  useEffect(() => {
    if (isWaterTheme) {
      document.body.classList.add('theme-water')
    } else {
      document.body.classList.remove('theme-water')
    }
  }, [isWaterTheme])

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'ЩУКАРЬ — магазин рыбалки в Волгограде',
      '/catalog': 'Каталог снастей — ЩУКАРЬ',
      '/wishlist': 'Избранное — ЩУКАРЬ',
      '/blog': 'Советы и статьи — ЩУКАРЬ',
      '/news': 'Новости и акции — ЩУКАРЬ',
      '/gallery': 'Галерея магазина — ЩУКАРЬ',
      '/about': 'О магазине — ЩУКАРЬ',
      '/contacts': 'Контакты — ЩУКАРЬ',
      '/privacy': 'Политика конфиденциальности — ЩУКАРЬ',
      '/adminpanel': 'Админ-панель — ЩУКАРЬ',
    }

    document.title = titles[location.pathname] ?? 'ЩУКАРЬ'
  }, [location.pathname])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((node) => node.classList.add('is-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    const observeNodes = () => {
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)').forEach((node) => {
        observer.observe(node)
      })
    }

    observeNodes()

    const mutationObserver = new MutationObserver(() => {
      // Triggered when DOM changes, adding newly mounted elements
      observeNodes()
    })

    mutationObserver.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
      mutationObserver.disconnect()
    }
  }, [location.pathname])

  const wishlistProducts = useMemo(
    () => cmsProducts.filter((product) => wishlistIds.includes(product.id)),
    [cmsProducts, wishlistIds],
  )

  const toggleWishlist = (productId: number) => {
    setWishlistIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    )
  }

  const mergeWishlist = (productIds: number[]) => {
    setWishlistIds((current) =>
      [
        ...new Set([
          ...current,
          ...productIds.filter((id) => cmsProducts.some((product) => product.id === id)),
        ]),
      ],
    )
  }

  return (
    <div className="app-shell" ref={shellRef}>
      <video className="site-background-video" autoPlay muted loop playsInline preload="auto">
        <source src={backgroundVideo} type="video/mp4" />
      </video>
      <SiteHeader 
        wishlistCount={wishlistProducts.length} 
        isWaterTheme={isWaterTheme} 
        setIsWaterTheme={setIsWaterTheme} 
      />

      <main className="page-wrap">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                blocks={snapshot.blocks}
                wishlistIds={wishlistIds}
                onToggleWishlist={toggleWishlist}
                products={cmsProducts}
                newsCards={cmsNewsCards}
                articles={cmsArticles}
                reviews={cmsReviews}
                galleryMoments={cmsGalleryMoments}
              />
            }
          />
          <Route
            path="/catalog"
            element={
              <CatalogPage
                products={cmsProducts}
                wishlistIds={wishlistIds}
                onToggleWishlist={toggleWishlist}
              />
            }
          />
          <Route
            path="/catalog/:categorySlug"
            element={
              <CategoryPage
                products={cmsProducts}
                wishlistIds={wishlistIds}
                onToggleWishlist={toggleWishlist}
              />
            }
          />
          <Route
            path="/catalog/:categorySlug/:productSlug"
            element={
              <ProductPage
                products={cmsProducts}
                wishlistIds={wishlistIds}
                onToggleWishlist={toggleWishlist}
              />
            }
          />
          <Route path="/blog" element={<BlogPage cards={cmsArticles} blocks={snapshot.blocks} />} />
          <Route path="/blog/:slug" element={<ArticleDetailPage cards={cmsArticles} sectionLabel="Советы" />} />
          <Route path="/news" element={<NewsPage cards={cmsNewsCards} blocks={snapshot.blocks} />} />
          <Route path="/news/:slug" element={<ArticleDetailPage cards={cmsNewsCards} sectionLabel="Новости и акции" />} />
          <Route path="/gallery" element={<GalleryPage blocks={snapshot.blocks} galleryMoments={cmsGalleryMoments} />} />
          <Route path="/about" element={<AboutPage blocks={snapshot.blocks} />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route
            path="/wishlist"
            element={
              <WishlistPage
                products={cmsProducts}
                wishlistIds={wishlistIds}
                wishlistProducts={wishlistProducts}
                onToggleWishlist={toggleWishlist}
                onMergeWishlist={mergeWishlist}
              />
            }
          />
          <Route
            path="/adminpanel"
            element={
              <Suspense fallback={<AdminPanelFallback />}>
                <LazyAdminPanel isSupabaseConfigured={isSupabaseConfigured} routeLink={routeLink} />
              </Suspense>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <SiteFooter />
      <MobileBar />
      <ScrollTopButton visible={showScrollTop} />
    </div>
  )
}

function AdminPanelFallback() {
  return (
    <section className="section container">
      <div className="admin-shell">
        <h1 className="page-title">Загружаем админ-панель</h1>
        <p className="page-lead">Подтягиваем интерфейс управления сайтом и контентом.</p>
      </div>
    </section>
  )
}

function SiteHeader({ 
  wishlistCount,
  isWaterTheme,
  setIsWaterTheme
}: { 
  wishlistCount: number
  isWaterTheme: boolean
  setIsWaterTheme: (val: boolean) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" className="brand-lockup">
          <div className="brand-mark logo-img-wrapper" style={{ padding: 0, background: 'transparent' }}>
            <img src={headerLogoSrc} alt="ЩУКАРЬ логотип" style={{ height: '36px', objectFit: 'contain' }} />
          </div>
          <div>
            <strong>ЩУКАРЬ</strong>
            <span>рыболовный магазин в Волгограде</span>
          </div>
        </Link>

        <nav className="main-nav" aria-label="Основная навигация">
          <NavLink to="/">Главная</NavLink>
          <NavLink to="/catalog">Каталог</NavLink>
          <NavLink to="/blog">Советы</NavLink>
          <NavLink to="/news">Акции</NavLink>
          <NavLink to="/gallery">Галерея</NavLink>
          <NavLink to="/about">О магазине</NavLink>
          <NavLink to="/contacts">Контакты</NavLink>
        </nav>

        <div className="header-actions">
          <label className="theme-toggle" aria-label="Переключить водную тему" title="Глубина">
            <input 
              type="checkbox" 
              checked={isWaterTheme} 
              onChange={(e) => setIsWaterTheme(e.target.checked)} 
            />
            <span className="theme-slider">
              <span className="theme-icon">{isWaterTheme ? '🌊' : '⚓️'}</span>
            </span>
          </label>
          <Link to="/wishlist" className="wishlist-link">
            Избранное
            <span>{wishlistCount}</span>
          </Link>
          <a className="header-phone" href={phoneHref}>
            {phoneDisplay}
          </a>
          <button
            className={menuOpen ? 'burger-button active' : 'burger-button'}
            type="button"
            aria-label="Открыть меню"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div className={menuOpen ? 'mobile-nav-panel open' : 'mobile-nav-panel'}>
        <nav className="mobile-nav-links" aria-label="Мобильная навигация">
          <NavLink to="/" onClick={closeMenu}>
            Главная
          </NavLink>
          <NavLink to="/catalog" onClick={closeMenu}>
            Каталог
          </NavLink>
          <NavLink to="/blog" onClick={closeMenu}>
            Советы
          </NavLink>
          <NavLink to="/news" onClick={closeMenu}>
            Акции
          </NavLink>
          <NavLink to="/gallery" onClick={closeMenu}>
            Галерея
          </NavLink>
          <NavLink to="/about" onClick={closeMenu}>
            О магазине
          </NavLink>
          <NavLink to="/contacts" onClick={closeMenu}>
            Контакты
          </NavLink>
          <NavLink to="/wishlist" onClick={closeMenu} className="wishlist-menu-link">
            <span>Избранное</span>
            <span>{wishlistCount}</span>
          </NavLink>
        </nav>
        <div className="mobile-nav-actions">
          <a className="button primary" href={phoneHref} onClick={closeMenu}>
            Позвонить
          </a>
          <a
            className="button secondary"
            href={routeLink}
            target="_blank"
            rel="noreferrer"
            onClick={closeMenu}
          >
            Маршрут
          </a>
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  const currentYear = new Date().getFullYear()
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <strong>ЩУКАРЬ</strong>
          <p>
            Современный офлайн-магазин рыбалки в Волгограде с живым ассортиментом, подбором под
            задачу и удобной связью перед визитом.
          </p>
          <div className="footer-contacts">
            <a href={phoneHref}>{phoneDisplay}</a>
            <a href={routeLink} target="_blank" rel="noreferrer">
              Университетский проспект, 82
            </a>
          </div>
        </div>

        <div className="footer-column">
          <p className="footer-title">Навигация</p>
          <div className="footer-links">
            <Link to="/">Главная</Link>
            <Link to="/catalog">Каталог</Link>
            <Link to="/blog">Советы</Link>
            <Link to="/news">Новости и акции</Link>
            <Link to="/gallery">Галерея</Link>
          </div>
        </div>

        <div className="footer-column">
          <p className="footer-title">Магазин</p>
          <div className="footer-links">
            <Link to="/about">О магазине</Link>
            <Link to="/contacts">Контакты</Link>
            <Link to="/wishlist">Избранное</Link>
            <a href={whatsappLink} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
            <a href={vkLink} target="_blank" rel="noreferrer">
              VK
            </a>
            <a href={avitoLink} target="_blank" rel="noreferrer">
              Avito
            </a>
          </div>
        </div>

        <div className="footer-column">
          <p className="footer-title">Документы</p>
          <div className="footer-links">
            <Link to="/privacy">Политика конфиденциальности</Link>
          </div>
          <p className="footer-meta">
            Пн–Сб 09:00–19:00
            <br />
            Вс 09:00–17:00
          </p>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {currentYear} ЩУКАРЬ. Все права защищены.</p>
        <p className="footer-author">Автор: Myasnik0ff</p>
      </div>
    </footer>
  )
}

function MobileBar() {
  return (
    <div className="mobile-bar">
      <a href={phoneHref}>Позвонить</a>
      <a href={whatsappLink} target="_blank" rel="noreferrer">
        Наличие
      </a>
      <a href={routeLink} target="_blank" rel="noreferrer">
        Маршрут
      </a>
    </div>
  )
}

function ScrollTopButton({ visible }: { visible: boolean }) {
  return (
    <button
      type="button"
      className={visible ? 'scroll-top-button visible' : 'scroll-top-button'}
      aria-label="Подняться наверх"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      ↑
    </button>
  )
}

function HomePage({
  blocks,
  wishlistIds,
  onToggleWishlist,
  products,
  newsCards,
  articles,
  reviews,
  galleryMoments,
}: {
  blocks: Record<string, ContentBlock>
  wishlistIds: number[]
  onToggleWishlist: (productId: number) => void
  products: Product[]
  newsCards: StoryCard[]
  articles: StoryCard[]
  reviews: string[]
  galleryMoments: string[]
}) {
  const featuredProducts = products.slice(0, 6)
  const heroBlock = resolveBlock(blocks, 'hero_home', {
    eyebrow: 'Магазин рыбалки в Волгограде',
    title: 'Подберите снасти для ближайшего выезда.',
    text: 'Посмотрите ассортимент, уточните наличие и приезжайте в магазин за живым выбором и понятным подбором.',
    actionLabel: 'Смотреть каталог',
    actionTo: '/catalog',
  })
  const catalogBanner = resolveBlock(blocks, 'catalog_banner', {
    eyebrow: 'Каталог',
    title: 'Свой стиль ловли, а не случайные карточки',
    text: 'Быстро переходите в нужные категории и собирайте удобный список перед визитом.',
    actionLabel: 'Открыть каталог',
    actionTo: '/catalog',
  })
  const newsBanner = resolveBlock(blocks, 'news_banner', {
    eyebrow: 'Новости и акции',
    title: 'Следите за поступлениями, акциями и быстрым резервом',
    text: 'Смотрите, что уже приехало к сезону и что удобно отложить перед визитом.',
    actionLabel: 'Все новости и акции',
    actionTo: '/news',
    variant: 'news',
  })
  const blogBanner = resolveBlock(blocks, 'blog_banner', {
    eyebrow: 'Советы',
    title: 'Начните с коротких и понятных разборов',
    text: 'Подборки и советы помогают быстрее выбрать снасть под реальный сценарий.',
    actionLabel: 'Открыть советы',
    actionTo: '/blog',
    variant: 'advice',
  })
  const galleryBanner = resolveBlock(blocks, 'gallery_banner', {
    eyebrow: 'Галерея',
    title: 'Так выглядит магазин, в который приятно приехать за выбором вживую',
    text: 'Свет, фактуры, полки и детали снастей помогают еще до визита почувствовать атмосферу и уровень подачи ассортимента.',
    actionLabel: 'Построить маршрут',
    actionTo: routeLink,
    external: true,
    variant: 'gallery',
  })
  const aboutBanner = resolveBlock(blocks, 'about_banner', {
    eyebrow: 'О магазине',
    title: 'Ассортимент и консультация работают вместе',
    text: 'Сравните варианты, уточните наличие и получите понятный совет прямо в магазине.',
    actionLabel: 'Подробнее о магазине',
    actionTo: '/about',
    variant: 'about',
  })

  return (
    <>
      <section className="hero-home container">
        <div className="hero-video-wrap">
          <video
            className="hero-video"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            poster={heroPoster}
          >
            <source src={heroVideo} type="video/mp4" />
          </video>
          <div className="hero-overlay" />

          <div className="hero-content" data-reveal>
            <div className="hero-copy">
              <p className="eyebrow">{heroBlock.eyebrow}</p>
              <h1>{heroBlock.title}</h1>
              <p className="hero-lead">{heroBlock.text}</p>
            </div>

            <div className="action-row">
              {heroBlock.external ? (
                <a className="button primary" href={heroBlock.actionTo} target="_blank" rel="noreferrer">
                  {heroBlock.actionLabel}
                </a>
              ) : (
                <Link className="button primary" to={heroBlock.actionTo}>
                  {heroBlock.actionLabel}
                </Link>
              )}
              <a className="button secondary" href={routeLink} target="_blank" rel="noreferrer">
                Построить маршрут
              </a>
              <a className="button ghost" href={whatsappLink} target="_blank" rel="noreferrer">
                Уточнить наличие
              </a>
            </div>

            <div className="hero-pills">
              <span>5.0 · 205 отзывов</span>
              <span>Пн–Сб 09:00–19:00</span>
              <span className="address-pill">Университетский проспект, 82</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionBanner
          image={catalogBanner.imageUrl ?? bannerCatalog}
          eyebrow={catalogBanner.eyebrow}
          title={catalogBanner.title}
          text={catalogBanner.text}
          actionLabel={catalogBanner.actionLabel}
          actionTo={catalogBanner.actionTo}
          external={catalogBanner.external}
          variant={catalogBanner.variant}
        />

        <div className="category-grid">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/catalog/${category.slug}`}
              className="category-card"
              data-reveal
            >
              <p>{category.name}</p>
              <strong>{category.buyerTitle}</strong>
              <span>{category.short}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <SectionHeading
          eyebrow="Популярное"
          title="Что сейчас стоит посмотреть в магазине"
          text="Это не случайная витрина. Здесь рабочие позиции, с которых покупателю удобно начать выбор или собрать wishlist перед поездкой."
        />

        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              active={wishlistIds.includes(product.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>

        <div className="action-row" style={{ justifyContent: 'center', marginTop: 28 }}>
          <Link className="button primary" to="/catalog">
            Показать весь каталог
          </Link>
        </div>
      </section>

      <section className="section container">
        <SectionBanner
          image={aboutBanner.imageUrl ?? bannerAbout}
          eyebrow={aboutBanner.eyebrow}
          title={aboutBanner.title}
          text={aboutBanner.text}
          actionLabel={aboutBanner.actionLabel}
          actionTo={aboutBanner.actionTo}
          external={aboutBanner.external}
          variant={aboutBanner.variant}
        />
      </section>

      <section className="section container split-section">
        <div>
        <SectionBanner
          image={newsBanner.imageUrl ?? bannerNews}
          eyebrow={newsBanner.eyebrow}
          title={newsBanner.title}
          text={newsBanner.text}
          actionLabel={newsBanner.actionLabel}
          actionTo={newsBanner.actionTo}
          external={newsBanner.external}
          variant={newsBanner.variant}
        />
        </div>

        <div className="story-grid">
          {newsCards.map((card) => (
            <Link
              key={card.slug}
              to={`/news/${card.slug}`}
              className={`story-card ${card.kind === 'offer' ? 'offer-card' : 'news-card'}`}
              data-reveal
            >
              <div className="story-meta">
                <p>{card.kind === 'offer' ? 'Акция' : 'Новость'}</p>
                <time>{card.date}</time>
              </div>
              <strong>{card.title}</strong>
              <span>{card.excerpt}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container split-section">
        <div>
        <SectionBanner
          image={blogBanner.imageUrl ?? bannerBlog}
          eyebrow={blogBanner.eyebrow}
          title={blogBanner.title}
          text={blogBanner.text}
          actionLabel={blogBanner.actionLabel}
          actionTo={blogBanner.actionTo}
          external={blogBanner.external}
          variant={blogBanner.variant}
        />
        </div>

        <div className="story-grid">
          {articles.map((card) => (
            <Link
              key={card.slug}
              to={`/blog/${card.slug}`}
              className="story-card advice-card"
              data-reveal
            >
              <div className="story-meta">
                <p>Совет</p>
                <time>{card.date}</time>
              </div>
              <strong>{card.title}</strong>
              <span>{card.excerpt}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <SectionBanner
          image={galleryBanner.imageUrl ?? bannerGallery}
          eyebrow={galleryBanner.eyebrow}
          title={galleryBanner.title}
          text={galleryBanner.text}
          actionLabel={galleryBanner.actionLabel}
          actionTo={galleryBanner.actionTo}
          external={galleryBanner.external}
          variant={galleryBanner.variant}
        />

        <div className="moment-grid">
          {galleryMoments.map((item) => (
            <Link key={item} to="/gallery" className="moment-card" data-reveal>
              {item}
            </Link>
          ))}
        </div>
      </section>

      <section className="section container">
        <SectionHeading
          eyebrow="Отзывы"
          title="Люди возвращаются не только за снастями, но и за отношением"
          text="Поэтому на сайте важны не только товары, но и ощущение, что здесь помогут быстро и по делу."
        />

        <div className="review-grid">
          {reviews.map((quote) => (
            <article key={quote} className="review-card" data-reveal>
              <span>★★★★★</span>
              <p>{quote}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section container">
        <SectionHeading
          eyebrow="Галерея"
          title="Посмотрите атмосферу магазина и детали ассортимента"
          text="После отзывов удобно быстро пролистать реальные кадры, полки и настроение магазина перед визитом."
        />

        <GalleryCarousel slides={gallerySlides} compact />
      </section>
    </>
  )
}

function CatalogPage({
  products,
  wishlistIds,
  onToggleWishlist,
}: {
  products: Product[]
  wishlistIds: number[]
  onToggleWishlist: (productId: number) => void
}) {
  return (
    <CatalogExperience
      products={products}
      wishlistIds={wishlistIds}
      onToggleWishlist={onToggleWishlist}
    />
  )
}

function CategoryPage({
  products,
  wishlistIds,
  onToggleWishlist,
}: {
  products: Product[]
  wishlistIds: number[]
  onToggleWishlist: (productId: number) => void
}) {
  const { categorySlug } = useParams()

  if (!categorySlug || !categoryMap[categorySlug]) {
    return <Navigate to="/catalog" replace />
  }

  return (
    <CatalogExperience
      key={categorySlug}
      fixedCategorySlug={categorySlug}
      products={products}
      wishlistIds={wishlistIds}
      onToggleWishlist={onToggleWishlist}
    />
  )
}

function CatalogExperience({
  products,
  fixedCategorySlug,
  wishlistIds,
  onToggleWishlist,
}: {
  products: Product[]
  fixedCategorySlug?: string
  wishlistIds: number[]
  onToggleWishlist: (productId: number) => void
}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [selectedFish, setSelectedFish] = useState('all')
  const [inStockOnly, setInStockOnly] = useState(false)
  const currentPage = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const activeCategory = fixedCategorySlug ?? selectedCategory

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = activeCategory === 'all' || product.categorySlug === activeCategory
      const matchesSearch =
        deferredSearch.trim().length === 0 ||
        `${product.name} ${product.brand} ${product.short} ${product.fish}`
          .toLowerCase()
          .includes(deferredSearch.trim().toLowerCase())
      const matchesBrand = selectedBrand === 'all' || product.brand === selectedBrand
      const matchesFish = selectedFish === 'all' || product.fish.includes(selectedFish)
      const matchesStock = !inStockOnly || product.stock === 'В наличии'

      return matchesCategory && matchesSearch && matchesBrand && matchesFish && matchesStock
    })
  }, [activeCategory, deferredSearch, inStockOnly, products, selectedBrand, selectedFish])

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * 9
    return visibleProducts.slice(start, start + 9)
  }, [currentPage, visibleProducts])

  const totalPages = Math.max(1, Math.ceil(visibleProducts.length / 9))

  const brands = useMemo(() => {
    const relevantProducts =
      activeCategory === 'all'
        ? products
        : products.filter((product) => product.categorySlug === activeCategory)

    return [...new Set(relevantProducts.map((product) => product.brand))]
  }, [activeCategory, products])

  const fishOptions = [
    { label: 'Щука', icon: shukaIcon },
    { label: 'Судак', icon: sudakIcon },
    { label: 'Карась', icon: karasIcon },
    { label: 'Лещ', icon: leshIcon },
    { label: 'Окунь' },
    { label: 'Универсально' },
  ]
  const currentCategory = activeCategory === 'all' ? null : categoryMap[activeCategory]

  useEffect(() => {
    if (currentPage > totalPages) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.set('page', String(totalPages))
      setSearchParams(nextParams, { replace: true })
    }
  }, [currentPage, searchParams, setSearchParams, totalPages])

  useEffect(() => {
    if (currentPage === 1) {
      return
    }

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', '1')
    setSearchParams(nextParams, { replace: true })
  }, [currentPage, inStockOnly, search, searchParams, selectedBrand, selectedFish, setSearchParams])

  const goToPage = (page: number) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('page', String(page))
    setSearchParams(nextParams)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openCategoryRoute = (slug: string) => {
    navigate(slug === 'all' ? '/catalog' : `/catalog/${slug}`)
  }

  return (
    <>
      <section className="section container">
        <PageIntro
          eyebrow={currentCategory ? currentCategory.name : 'Каталог'}
          title={currentCategory ? currentCategory.buyerTitle : 'Посмотрите снасти и соберите свой список перед визитом'}
          text={
            currentCategory
              ? currentCategory.description
              : 'Фильтруйте по категории, бренду и задаче, добавляйте понравившиеся позиции в избранное и делитесь подборкой с друзьями или продавцом магазина.'
          }
        />

        <div className="filter-panel" data-reveal>
          <div className="filter-top">
            <div className="field grow">
              <label htmlFor="catalog-search">Поиск по названию, бренду или сценарию</label>
              <input
                id="catalog-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Например, щука, катушка, Narval"
              />
            </div>

            <div className="field">
              <label htmlFor="brand-filter">Бренд</label>
              <select
                id="brand-filter"
                value={selectedBrand}
                onChange={(event) => setSelectedBrand(event.target.value)}
              >
                <option value="all">Все бренды</option>
                {brands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="chip-row">
            <button
              className={activeCategory === 'all' ? 'chip active' : 'chip'}
              onClick={() => {
                setSelectedCategory('all')
                openCategoryRoute('all')
              }}
            >
              Все категории
            </button>
            {categories.map((category) => (
              <button
                key={category.slug}
                className={activeCategory === category.slug ? 'chip active' : 'chip'}
                onClick={() => {
                  setSelectedCategory(category.slug)
                  openCategoryRoute(category.slug)
                }}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="filter-bottom">
            <div className="filter-group">
              <p className="filter-title">Рыба</p>
              <div className="chip-row">
              <button
                className={selectedFish === 'all' ? 'chip active' : 'chip'}
                onClick={() => setSelectedFish('all')}
              >
                Любая рыба
              </button>
              {fishOptions.map((fish) => (
                <button
                  key={fish.label}
                  className={selectedFish === fish.label ? 'chip fish-chip active' : 'chip fish-chip'}
                  onClick={() => setSelectedFish(fish.label)}
                >
                  {fish.icon && <img src={fish.icon} alt="" aria-hidden="true" />}
                  <span>{fish.label}</span>
                </button>
              ))}
              </div>
            </div>

            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => setInStockOnly(event.target.checked)}
              />
              <span>Показывать только то, что есть в наличии</span>
            </label>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="product-grid">
          {paginatedProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              active={wishlistIds.includes(product.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>

        {!visibleProducts.length && (
          <div className="empty-state" data-reveal>
            <strong>По этим фильтрам ничего не показано.</strong>
            <p>Сбросьте несколько условий или напишите в WhatsApp, и мы быстро подскажем живой вариант из магазина.</p>
            <a className="button primary" href={whatsappLink} target="_blank" rel="noreferrer">
              Написать в WhatsApp
            </a>
          </div>
        )}

        {visibleProducts.length > 9 && (
          <div className="pagination" data-reveal>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                className={page === currentPage ? 'page-button active' : 'page-button'}
                onClick={() => goToPage(page)}
              >
                {page}
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  )
}

function ProductPage({
  products,
  wishlistIds,
  onToggleWishlist,
}: {
  products: Product[]
  wishlistIds: number[]
  onToggleWishlist: (productId: number) => void
}) {
  const { categorySlug, productSlug } = useParams()
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!categorySlug || !productSlug) {
    return <Navigate to="/catalog" replace />
  }

  const product = getProductBySlugsFromList(products, categorySlug, productSlug)

  if (!product) {
    return <Navigate to="/catalog" replace />
  }

  const currentImage = selectedImage ?? (product.images[0] || null)

  const relatedProducts = useMemo(() => {
    if (product.recommendedIds && product.recommendedIds.length > 0) {
      return product.recommendedIds
        .map((rid) => products.find((p) => p.id === rid))
        .filter(Boolean) as Product[]
    }
    return getProductsByCategoryFromList(products, product.categorySlug)
      .filter((item) => item.id !== product.id)
      .slice(0, 3)
  }, [product.recommendedIds, product.categorySlug, product.id, products])

  useEffect(() => {
    setSelectedImage(product.images[0] || null)
  }, [product.images])

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isModalOpen])

  return (
    <>
      <section className="section container">
        <nav className="breadcrumbs" aria-label="Хлебные крошки">
          <Link to="/">Главная</Link>
          <span>/</span>
          <Link to="/catalog">Каталог</Link>
          <span>/</span>
          <Link to={`/catalog/${product.categorySlug}`}>{categoryMap[product.categorySlug].name}</Link>
          <span>/</span>
          <span>{product.name}</span>
        </nav>

        <div className="product-detail" data-reveal>
        <div className="product-visual-wrapper">
          <div className="product-visual" style={{ background: product.accent }} onClick={() => setIsModalOpen(true)}>
            {currentImage && <img src={currentImage} alt={product.name} className="product-image" />}
            <span>{categoryMap[product.categorySlug]?.name}</span>
            <strong>{product.brand}</strong>
          </div>
          {product.images.length > 1 && (
            <div className="product-thumbnails">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  className={`product-thumb-btn ${currentImage === img ? 'active' : ''}`}
                  onClick={() => setSelectedImage(img)}
                >
                  <img src={img} alt={`${product.name} thumb ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

          <div className="product-main">
            <p className="eyebrow">{product.brand}</p>
            <h1 className="page-title">{product.name}</h1>
            <p className="page-lead">{product.short}</p>

            <div className="meta-list">
              <span>{product.price}</span>
              {product.stock !== 'Уточнить наличие' && <span>{product.stock}</span>}
              <span>Остаток: {product.stockQuantity}</span>
              <span>{product.fish}</span>
              <span>{product.method}</span>
            </div>

            <p className="detail-copy">{product.description}</p>

            <div className="action-row">
              <a className="button primary" href={whatsappLink} target="_blank" rel="noreferrer">
                Уточнить наличие
              </a>
              <a className="button secondary" href={phoneHref}>
                Позвонить
              </a>
              <button
                className="button ghost"
                onClick={() => onToggleWishlist(product.id)}
              >
                {wishlistIds.includes(product.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
              </button>
            </div>

            <div className="spec-grid">
              {product.specs.map(([label, value]) => (
                <div key={label} className="spec-card">
                  <small>{label}</small>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="note-box">
              <strong>Нужен совет перед поездкой?</strong>
              <p>Напишите в магазин, и вам подскажут, подойдет ли эта позиция под вашу рыбу, водоем и текущий сезон.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHeading
          eyebrow="Похожие позиции"
          title="Посмотрите еще несколько вариантов из этой категории"
          text="Если хочется сравнить и выбрать спокойнее, добавьте несколько товаров в избранное и поделитесь ссылкой."
        />

        <div className="product-grid">
          {relatedProducts.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              active={wishlistIds.includes(item.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      </section>

      <div className={`fullscreen-modal ${isModalOpen ? 'open' : ''}`} onClick={() => setIsModalOpen(false)}>
        <button className="fullscreen-modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
        {currentImage && <img src={currentImage} alt="Fullscreen product view" onClick={(e) => e.stopPropagation()} />}
      </div>
    </>
  )
}

function WishlistPage({
  products,
  wishlistIds,
  wishlistProducts,
  onToggleWishlist,
  onMergeWishlist,
}: {
  products: Product[]
  wishlistIds: number[]
  wishlistProducts: Product[]
  onToggleWishlist: (productId: number) => void
  onMergeWishlist: (productIds: number[]) => void
}) {
  const location = useLocation()
  const [statusMessage, setStatusMessage] = useState('')

  const sharedIds = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return parseWishlistIds(params.get('items'))
  }, [location.search])

  const sharedProducts = useMemo(
    () => products.filter((product) => sharedIds.includes(product.id)),
    [products, sharedIds],
  )

  const visibleProducts = sharedProducts.length ? sharedProducts : wishlistProducts
  const shareUrl = formatWishlistUrl(visibleProducts.map((product) => product.id))

  const handleShare = async () => {
    if (!visibleProducts.length) {
      return
    }

    if (navigator.share) {
      await navigator.share({
        title: 'Подборка снастей из ЩУКАРЯ',
        text: 'Смотри, что я выбрал в магазине ЩУКАРЬ.',
        url: shareUrl,
      })
      return
    }

    await navigator.clipboard.writeText(shareUrl)
    setStatusMessage('Ссылка на подборку скопирована.')
  }

  return (
    <section className="section container">
      <PageIntro
        eyebrow="Избранное"
        title="Соберите свой список, а потом отправьте его знакомым или продавцу магазина"
        text="Избранное работает как удобная подборка без корзины: можно сохранить позиции, сравнить их и поделиться одной ссылкой."
      />

      <div className="wishlist-panel" data-reveal>
        <div>
          <strong>{visibleProducts.length} позиций в подборке</strong>
          <p>Если вы пришли по чужой ссылке, можно сохранить эту подборку себе и продолжить дополнять ее уже от своего имени.</p>
        </div>

        <div className="action-row">
          <button className="button primary" onClick={() => void handleShare()}>
            Поделиться ссылкой
          </button>
          {sharedProducts.length > 0 && (
            <button className="button secondary" onClick={() => onMergeWishlist(sharedIds)}>
              Сохранить эту подборку себе
            </button>
          )}
        </div>
      </div>

      {statusMessage && <p className="status-line">{statusMessage}</p>}

      {visibleProducts.length > 0 ? (
        <div className="product-grid">
          {visibleProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              active={wishlistIds.includes(product.id)}
              onToggleWishlist={onToggleWishlist}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state" data-reveal>
          <strong>Пока список пуст.</strong>
          <p>Добавьте несколько снастей из каталога и вернитесь сюда, чтобы поделиться подборкой.</p>
          <Link className="button primary" to="/catalog">
            Перейти в каталог
          </Link>
        </div>
      )}
    </section>
  )
}

function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.ceil(totalItems / pageSize)
  if (totalPages <= 1) return null

  return (
    <div className="pagination">
      <button
        type="button"
        className="pagination-btn"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ←
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        className="pagination-btn"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        →
      </button>
    </div>
  )
}

function BlogPage({
  cards,
  blocks,
}: {
  cards: StoryCard[]
  blocks: Record<string, ContentBlock>
}) {
  return (
    <ContentIndexPage
      eyebrow="Советы"
      title="Короткие разборы, которые помогают выбрать снасти спокойнее"
      text="Полезные материалы для новичка и уверенного рыбака: без лишней воды, но с нормальной логикой выбора."
      banner={bannerBlog}
      cards={cards}
      basePath="/blog"
      variant="advice"
      blocks={blocks}
      blockKey="blog_banner"
    />
  )
}

function NewsPage({
  cards,
  blocks,
}: {
  cards: StoryCard[]
  blocks: Record<string, ContentBlock>
}) {
  return (
    <ContentIndexPage
      eyebrow="Новости и акции"
      title="Следите за поступлениями, выгодными позициями и полезными обновлениями магазина"
      text="Смотрите, что приехало, что выгоднее взять сейчас и какие позиции удобно отложить перед визитом."
      banner={bannerNews}
      cards={cards}
      basePath="/news"
      variant="news"
      blocks={blocks}
      blockKey="news_banner"
    />
  )
}

function GalleryPage({
  blocks,
  galleryMoments,
}: {
  blocks: Record<string, ContentBlock>
  galleryMoments: string[]
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9
  
  const banner = resolveBlock(blocks, 'gallery_banner', {
    eyebrow: 'Галерея',
    title: 'Так выглядит магазин, в который приятно приехать за выбором вживую',
    text: 'Свет, фактуры, полки и детали снастей помогают еще до визита почувствовать атмосферу и уровень подачи ассортимента.',
    actionLabel: 'Построить маршрут',
    actionTo: routeLink,
    external: true,
    variant: 'gallery',
  })

  // We only show images in 3x3 grid as requested, no textual cards
  const currentSlides = gallerySlides.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <section className="section container">
      <SectionBanner
        image={banner.imageUrl ?? bannerGallery}
        eyebrow={banner.eyebrow}
        title={banner.title}
        text={banner.text}
        actionLabel={banner.actionLabel}
        actionTo={banner.actionTo}
        external={banner.external}
        variant={banner.variant}
      />

      <div className="gallery-grid three-columns">
        {currentSlides.map((item) => (
          <article
            key={item.image}
            className="gallery-card gallery-image-card"
            data-reveal
          >
            <div className="gallery-image-wrapper">
              <img src={item.image} alt={item.title} />
            </div>
            <div className="gallery-image-info">
               <strong>{item.title}</strong>
            </div>
          </article>
        ))}
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={gallerySlides.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />
    </section>
  )
}

function AboutPage({
  blocks,
}: {
  blocks: Record<string, ContentBlock>
}) {
  const banner = resolveBlock(blocks, 'about_banner', {
    eyebrow: 'О магазине',
    title: 'ЩУКАРЬ — это магазин, где ассортимент и консультация работают вместе',
    text: 'Сюда удобно приехать, если нужно не просто купить снасть, а спокойно сравнить варианты, уточнить наличие и получить понятный совет.',
    actionLabel: 'Связаться с магазином',
    actionTo: whatsappLink,
    external: true,
    variant: 'about',
  })

  return (
    <section className="section container">
      <SectionBanner
        image={banner.imageUrl ?? bannerAbout}
        eyebrow={banner.eyebrow}
        title={banner.title}
        text={banner.text}
        actionLabel={banner.actionLabel}
        actionTo={banner.actionTo}
        external={banner.external}
        variant={banner.variant}
      />

      <div className="info-grid">
        <article className="info-card" data-reveal>
          <strong>Живой офлайн-выбор</strong>
          <p>На сайте вы смотрите витрину, а в магазине уже видите реальные позиции, материалы и сборку снасти вживую.</p>
        </article>
        <article className="info-card" data-reveal>
          <strong>Подбор под задачу</strong>
          <p>Можно прийти с конкретной рыбой, водоемом, сезоном или бюджетом и от этого уже двигаться к выбору.</p>
        </article>
        <article className="info-card" data-reveal>
          <strong>Удобная связь перед поездкой</strong>
          <p>Лучший сценарий: открыть каталог, собрать wishlist, уточнить наличие и уже потом спокойно ехать в магазин.</p>
        </article>
      </div>
    </section>
  )
}

function ContactsPage() {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current) return;
    
    if (document.getElementById('yamaps-script')) {
      if ((window as any).ymaps) {
         (window as any).ymaps.ready(initMap)
      }
      return
    }

    const script = document.createElement('script')
    script.id = 'yamaps-script'
    script.src = 'https://api-maps.yandex.ru/2.1/?apikey=bafcd910-6f11-4ead-970e-00d35a89733f&lang=ru_RU'
    script.async = true
    script.onload = () => {
      (window as any).ymaps.ready(initMap)
    }
    document.head.appendChild(script)

    function initMap() {
      if (!mapRef.current) return;
      mapRef.current.innerHTML = '';
      const map = new (window as any).ymaps.Map(mapRef.current, {
        center: [48.651408, 44.434563],
        zoom: 17,
        controls: ['zoomControl']
      })
      
      const placemark = new (window as any).ymaps.Placemark([48.651408, 44.434563], 
        { balloonContent: 'ЩУКАРЬ: Волгоград, Университетский проспект, 82' }, 
        {
          iconLayout: 'default#image',
          iconImageHref: headerLogoSrc,
          iconImageSize: [60, 60],
          iconImageOffset: [-30, -30]
        }
      )
      map.geoObjects.add(placemark)
    }
  }, [])

  return (
    <section className="section container">
      <PageIntro
        eyebrow="Контакты"
        title="За снастями, подбором и живым выбором — приезжайте в магазин"
        text="Адрес, режим работы и быстрые способы связи собраны в одном месте, чтобы доехать было легко."
      />

      <div className="contact-layout">
        <article className="contact-card" data-reveal>
          <strong>Волгоград, Университетский проспект, 82</strong>
          <p>Пн–Сб 09:00–19:00 · Вс 09:00–17:00</p>
          <a href={phoneHref}>{phoneDisplay}</a>
          <div className="action-row">
            <a className="button primary" href={routeLink} target="_blank" rel="noreferrer">
              Построить маршрут
            </a>
            <a className="button secondary" href={whatsappLink} target="_blank" rel="noreferrer">
              Написать в WhatsApp
            </a>
            <a className="button ghost" href={vkLink} target="_blank" rel="noreferrer">
              Открыть VK
            </a>
          </div>
        </article>

        <article className="map-card" style={{ padding: 0, height: '440px', overflow: 'hidden', display: 'block' }} data-reveal>
          <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        </article>
      </div>
    </section>
  )
}

function PrivacyPage() {
  return (
    <section className="section container">
      <PageIntro
        eyebrow="Политика"
        title="Политика конфиденциальности"
        text="Здесь собрана базовая информация о том, как сайт обрабатывает обращения, заявки на уточнение наличия и сообщения через формы связи."
      />

      <article className="article-body" data-reveal>
        <p>
          Сайт «ЩУКАРЬ» собирает только те данные, которые пользователь добровольно передает через
          формы связи, мессенджеры и при прямом обращении в магазин.
        </p>
        <p>
          Эти данные используются исключительно для обратной связи, уточнения наличия, резерва
          товара и консультации по ассортименту. Данные не продаются и не передаются третьим лицам
          без законного основания.
        </p>
        <p>
          По запросу пользователя магазин может уточнить, изменить или удалить переданные данные,
          если это не противоречит требованиям законодательства.
        </p>
      </article>
    </section>
  )
}

function ContentIndexPage({
  eyebrow,
  title,
  text,
  banner,
  cards,
  basePath,
  variant,
  blocks,
  blockKey,
}: {
  eyebrow: string
  title: string
  text: string
  banner: string
  cards: StoryCard[]
  basePath: string
  variant: 'news' | 'advice'
  blocks: Record<string, ContentBlock>
  blockKey: string
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 9

  const block = resolveBlock(blocks, blockKey, {
    eyebrow,
    title,
    text,
    actionLabel: 'Перейти в каталог',
    actionTo: '/catalog',
    variant,
  })

  const currentCards = cards.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <section className="section container">
      <SectionBanner
        image={block.imageUrl ?? banner}
        eyebrow={block.eyebrow}
        title={block.title}
        text={block.text}
        actionLabel={block.actionLabel}
        actionTo={block.actionTo}
        external={block.external}
        variant={block.variant}
      />

      <div className="story-grid three-columns">
        {currentCards.map((card) => (
          <Link
            key={card.slug}
            to={`${basePath}/${card.slug}`}
            className={`story-card ${card.kind === 'advice' ? 'advice-card' : card.kind === 'offer' ? 'offer-card' : 'news-card'}`}
            data-reveal
          >
            <div className="story-meta">
              <p>{card.kind === 'advice' ? 'Совет' : card.kind === 'offer' ? 'Акция' : 'Новость'}</p>
              <time>{card.date}</time>
            </div>
            <strong>{card.title}</strong>
            <span>{card.excerpt}</span>
          </Link>
        ))}
      </div>

      <Pagination 
        currentPage={currentPage}
        totalItems={cards.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
      />
    </section>
  )
}

function ArticleDetailPage({
  cards,
  sectionLabel,
}: {
  cards: StoryCard[]
  sectionLabel: string
}) {
  const { slug } = useParams()
  const card = cards.find((item) => item.slug === slug)

  if (!card) {
    return <Navigate to="/" replace />
  }

  return (
    <section className="section container">
      <PageIntro eyebrow={sectionLabel} title={card.title} text={card.excerpt} />

      <article className="article-body" data-reveal>
        <div className="story-meta article-meta">
          <p>{card.kind === 'advice' ? 'Совет' : card.kind === 'offer' ? 'Акция' : 'Новость'}</p>
          <time>{card.date}</time>
        </div>
        <p>
          В «ЩУКАРЕ» такой материал нужен не ради контента ради контента, а чтобы человеку было
          проще понять следующий шаг: что посмотреть в каталоге, что уточнить по наличию и с чем
          лучше приехать в магазин.
        </p>
        <p>
          Поэтому подача остается прикладной: меньше абстрактных рассуждений, больше сценариев,
          понятных ориентиров и практики под обычную рыбалку, а не только под “идеальные условия”.
        </p>
        <p>
          Если после чтения хочется сверить выбор с реальным ассортиментом, переходите в каталог,
          собирайте wishlist и отправляйте ссылку продавцу или знакомым.
        </p>
      </article>

      <div className="action-row">
        <Link className="button primary" to="/catalog">
          Перейти в каталог
        </Link>
        <Link className="button secondary" to="/wishlist">
          Открыть избранное
        </Link>
      </div>
    </section>
  )
}

function GalleryCarousel({
  slides,
  compact = false,
}: {
  slides: GallerySlide[]
  compact?: boolean
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const pointerState = useRef({ active: false, startX: 0, deltaX: 0, moved: false })
  const suppressClickRef = useRef(false)
  const [index, setIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(() => {
    if (typeof window === 'undefined') return 3
    if (window.innerWidth < 600) return 1
    if (window.innerWidth < 900) return 2
    return 3
  })

  useEffect(() => {
    const updateCount = () => {
      const w = window.innerWidth
      setVisibleCount(w < 600 ? 1 : w < 900 ? 2 : 3)
    }
    window.addEventListener('resize', updateCount)
    return () => window.removeEventListener('resize', updateCount)
  }, [])

  const total = slides.length
  const maxIndex = Math.max(0, total - visibleCount)
  const canNavigate = total > visibleCount

  useEffect(() => {
    if (lightboxIndex === null) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLightboxIndex(null)
      }

      if (event.key === 'ArrowRight' && total > 1) {
        setLightboxIndex((current) => ((current ?? 0) + 1) % total)
      }

      if (event.key === 'ArrowLeft' && total > 1) {
        setLightboxIndex((current) => ((current ?? 0) - 1 + total) % total)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxIndex, total])

  const moveTo = (nextIndex: number) => {
    if (!total) {
      return
    }

    const bounded = Math.max(0, Math.min(nextIndex, maxIndex))
    setIndex(bounded)
  }

  const completeDrag = () => {
    if (!pointerState.current.active) {
      return
    }

    const viewportWidth = viewportRef.current?.offsetWidth ?? 0
    const threshold = Math.max(60, viewportWidth * 0.14)
    const travelled = pointerState.current.deltaX
    suppressClickRef.current = pointerState.current.moved

    if (Math.abs(travelled) > threshold && canNavigate) {
      moveTo(index + (travelled < 0 ? 1 : -1))
    }

    pointerState.current = { active: false, startX: 0, deltaX: 0, moved: false }
    setDragOffset(0)
    setIsDragging(false)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!canNavigate) {
      return
    }

    pointerState.current = {
      active: true,
      startX: event.clientX,
      deltaX: 0,
      moved: false,
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointerState.current.active) {
      return
    }

    const deltaX = event.clientX - pointerState.current.startX
    pointerState.current.deltaX = deltaX
    pointerState.current.moved = Math.abs(deltaX) > 6
    setDragOffset(deltaX)
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerState.current.active) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    completeDrag()
  }

  const handleSlideClick = (slideIndex: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }

    setLightboxIndex(slideIndex)
  }

  return (
    <>
      <div className={compact ? 'gallery-carousel-shell compact' : 'gallery-carousel-shell'} data-reveal>
        <div className="gallery-carousel-head">
          <div className="gallery-carousel-meta">
            <span>{Math.min(index + 1, total)}–{Math.min(index + visibleCount, total)} / {total}</span>
          </div>

          <div className="gallery-carousel-controls">
            <button
              type="button"
              className="gallery-arrow"
              aria-label="Предыдущий слайд"
              onClick={() => moveTo(index - 1)}
              disabled={!canNavigate || index <= 0}
            >
              ←
            </button>
            <button
              type="button"
              className="gallery-arrow"
              aria-label="Следующий слайд"
              onClick={() => moveTo(index + 1)}
              disabled={!canNavigate || index >= maxIndex}
            >
              →
            </button>
          </div>
        </div>

        <div
          className="gallery-viewport"
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={completeDrag}
          onPointerLeave={() => {
            if (pointerState.current.active) {
              completeDrag()
            }
          }}
        >
          <div
            className="gallery-track"
            style={{
              transform: `translate3d(calc(${-index * (100 / visibleCount)}% - ${index * 12}px + ${dragOffset}px), 0, 0)`,
              transition: isDragging ? 'none' : undefined,
            }}
          >
            {slides.map((slide, slideIndex) => (
              <button
                key={`${slide.title}-${slideIndex}`}
                type="button"
                className="gallery-slide"
                style={{ minWidth: `calc(${100 / visibleCount}% - ${((visibleCount - 1) * 12) / visibleCount}px)` }}
                onClick={() => handleSlideClick(slideIndex)}
              >
                <img src={slide.image} alt={slide.title} loading="lazy" />
                <div className="gallery-slide-overlay" />
                <div className="gallery-slide-caption">
                  <strong>{slide.title}</strong>
                  <span>{slide.text}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {!compact && (
          <div className="gallery-dots">
            {slides.map((slide, slideIndex) => (
              <button
                key={`${slide.title}-dot`}
                type="button"
                className={slideIndex === index ? 'gallery-dot active' : 'gallery-dot'}
                aria-label={`Перейти к слайду ${slideIndex + 1}`}
                onClick={() => moveTo(slideIndex)}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxIndex !== null && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр изображения"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="gallery-lightbox-inner" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="gallery-lightbox-close"
              aria-label="Закрыть"
              onClick={() => setLightboxIndex(null)}
            >
              ×
            </button>

            {canNavigate && (
              <button
                type="button"
                className="gallery-lightbox-arrow prev"
                aria-label="Предыдущее изображение"
                onClick={() => setLightboxIndex((current) => ((current ?? 0) - 1 + total) % total)}
              >
                ←
              </button>
            )}

            <figure className="gallery-lightbox-figure">
              <img
                src={slides[lightboxIndex].image}
                alt={slides[lightboxIndex].title}
                className="gallery-lightbox-image"
              />
              <figcaption className="gallery-lightbox-caption">
                <strong>{slides[lightboxIndex].title}</strong>
                <span>{slides[lightboxIndex].text}</span>
              </figcaption>
            </figure>

            {canNavigate && (
              <button
                type="button"
                className="gallery-lightbox-arrow next"
                aria-label="Следующее изображение"
                onClick={() => setLightboxIndex((current) => ((current ?? 0) + 1) % total)}
              >
                →
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function ProductCard({
  product,
  active,
  onToggleWishlist,
}: {
  product: Product
  active: boolean
  onToggleWishlist: (productId: number) => void
}) {
  return (
    <article className="product-card" data-reveal>
      <button
        className={active ? 'wishlist-button active' : 'wishlist-button'}
        onClick={(event) => {
          event.preventDefault()
          onToggleWishlist(product.id)
        }}
        aria-label={active ? 'Убрать из избранного' : 'Добавить в избранное'}
      >
        ♥
      </button>

      <Link to={`/catalog/${product.categorySlug}/${product.slug}`} className="product-card-link">
        <div className="product-cover" style={{ background: product.accent }}>
          {product.images[0] && <img src={product.images[0]} alt={product.name} className="product-card-image" />}
          <span>{product.brand}</span>
          <strong>{categoryMap[product.categorySlug].name}</strong>
        </div>

        <div className="product-body">
          <p>{product.stock}</p>
          <h3>{product.name}</h3>
          <span>{product.short}</span>

          <div className="badge-row">
            {product.badges.map((badge) => (
              <small key={badge}>{badge}</small>
            ))}
          </div>

          <div className="product-bottom">
            <strong>{product.price}</strong>
            <em>{product.stockQuantity} шт.</em>
          </div>
        </div>
      </Link>
    </article>
  )
}

function SectionBanner({
  image,
  eyebrow,
  title,
  text,
  actionLabel,
  actionTo,
  external,
  variant,
}: {
  image: string
  eyebrow: string
  title: string
  text: string
  actionLabel: string
  actionTo: string
  external?: boolean
  variant?: 'news' | 'advice' | 'gallery' | 'about' | 'default'
}) {
  const variantClass = variant && variant !== 'default' ? `${variant}-variant` : ''
  const content = (
    <>
      <img src={image} alt="" loading="lazy" />
      <div className="banner-overlay" />
      <div className="banner-content">
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <span>{text}</span>
        <div className="banner-action">
          <span>{actionLabel}</span>
        </div>
      </div>
    </>
  )

  if (external) {
    return (
      <a
        className={`section-banner ${variantClass}`}
        href={actionTo}
        target="_blank"
        rel="noreferrer"
        data-reveal
      >
        {content}
      </a>
    )
  }

  return (
    <Link className={`section-banner ${variantClass}`} to={actionTo} data-reveal>
      {content}
    </Link>
  )
}

function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string
  title: string
  text: string
}) {
  return (
    <div className="section-heading" data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  )
}

function PageIntro({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string
  title: string
  text: string
}) {
  return (
    <div className="page-intro" data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-lead">{text}</p>
    </div>
  )
}

export default App
