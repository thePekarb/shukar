export type Category = {
  slug: string
  name: string
  short: string
  description: string
  buyerTitle: string
}

export type Product = {
  id: number
  slug: string
  categorySlug: string
  name: string
  brand: string
  price: string
  stock: 'В наличии' | 'Под заказ' | 'Уточнить наличие'
  short: string
  description: string
  season: string
  fish: string
  water: string
  method: string
  material: string
  badges: string[]
  specs: Array<[string, string]>
  accent: string
  stockQuantity: number
  images: string[]
}

export type StoryCard = {
  slug: string
  title: string
  excerpt: string
  date: string
  kind: 'news' | 'offer' | 'advice'
}

export const categories: Category[] = [
  {
    slug: 'spinning',
    name: 'Спиннинги',
    short: 'Под берег, лодку, хищника и уверенный контроль приманки.',
    description:
      'Подберите спиннинг по стилю ловли, тесту и формату водоема. В карточках показаны понятные параметры и реальные сценарии использования.',
    buyerTitle: 'Подберите спиннинг под свой выезд',
  },
  {
    slug: 'reels',
    name: 'Катушки',
    short: 'Безынерционные модели для новичка, универсального комплекта и точной сборки.',
    description:
      'От надежной рабочей базы до более уверенных моделей под частые выезды. Фильтруйте по бренду, сценарию и статусу наличия.',
    buyerTitle: 'Выберите катушку без лишней путаницы',
  },
  {
    slug: 'lures',
    name: 'Приманки',
    short: 'Воблеры, силикон и железо под щуку, окуня и судака.',
    description:
      'Показываем не просто товар, а когда и под какую рыбу он раскрывается лучше всего.',
    buyerTitle: 'Соберите рабочую коробку приманок',
  },
  {
    slug: 'lines',
    name: 'Леска и шнуры',
    short: 'Плетенка, моно и флюорокарбон с понятной логикой выбора.',
    description:
      'Если нужна дальность, чувствительность или износостойкость, здесь легко понять, что подойдет именно вам.',
    buyerTitle: 'Найдите шнур и леску под свою снасть',
  },
  {
    slug: 'gear',
    name: 'Экипировка',
    short: 'Одежда, обувь и полезные аксессуары для выезда к воде.',
    description:
      'Практичные вещи под прохладное утро, ветер, береговую рыбалку и долгие выезды.',
    buyerTitle: 'Подготовьтесь к рыбалке комфортно',
  },
  {
    slug: 'gifts',
    name: 'Подарки и наборы',
    short: 'Готовые идеи для тех, кто выбирает снасти в подарок или стартовый комплект.',
    description:
      'Без сложной терминологии: понятные наборы, удобные ориентиры по бюджету и быстрая консультация в магазине.',
    buyerTitle: 'Выберите подарок рыбаку без риска ошибиться',
  },
]

export const products: Product[] = []

export const articles: StoryCard[] = []

export const newsCards: StoryCard[] = []

export const galleryMoments = [
  'Реальные полки с ассортиментом',
  'Живой магазин без ощущения склада',
  'Свет, фактуры и детали снастей',
  'Атмосфера раннего утра и воды',
]

export const reviews = [
  'Подсказали по-человечески, без давления. Уехал сразу с понятным комплектом.',
  'Уточнил наличие по телефону, приехал и все уже было готово к просмотру.',
  'Брали подарок рыбаку, и нам очень спокойно помогли собрать нормальный вариант.',
]

export const categoryMap = Object.fromEntries(categories.map((item) => [item.slug, item]))

export function getProductsByCategory(categorySlug: string) {
  return products.filter((product) => product.categorySlug === categorySlug)
}

export function getProductBySlugs(categorySlug: string, productSlug: string) {
  return products.find(
    (product) => product.categorySlug === categorySlug && product.slug === productSlug,
  )
}
