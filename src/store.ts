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

export const products: Product[] = [
  {
    id: 101,
    slug: 'narval-river-pike-802m',
    categorySlug: 'spinning',
    name: 'Narval River Pike 802M',
    brand: 'Narval',
    price: '18 900 ₽',
    stock: 'В наличии',
    short: 'Универсальный спиннинг под щуку и судака, когда нужна дальность и контроль.',
    description:
      'Хорошо чувствует джиг и воблеры, уверенно держит проводку и подходит для тех, кто хочет взять одну рабочую палку на большую часть сезона.',
    season: 'Весна / осень',
    fish: 'Щука, судак',
    water: 'Река, водохранилище',
    method: 'Джиг, воблеры',
    material: 'Графит',
    badges: ['Хит', 'На щуку'],
    specs: [
      ['Длина', '2.44 м'],
      ['Тест', '8–28 г'],
      ['Строй', 'Fast'],
      ['Материал', 'Графит'],
    ],
    stockQuantity: 4,
    images: [],
    accent: 'linear-gradient(135deg, #183a43 0%, #2d4a3e 42%, #e0b57b 100%)',
  },
  {
    id: 102,
    slug: 'maximus-advisor-jig-762ml',
    categorySlug: 'spinning',
    name: 'Maximus Advisor Jig 762ML',
    brand: 'Maximus',
    price: '12 490 ₽',
    stock: 'В наличии',
    short: 'Легкий и отзывчивый вариант для тех, кто хочет чувствовать проводку лучше.',
    description:
      'Подходит для аккуратной джиговой ловли и хорош как шаг вперед после базовых моделей.',
    season: 'Лето / осень',
    fish: 'Окунь, судак, щука',
    water: 'Река, канал',
    method: 'Джиг',
    material: 'Высокомодульный графит',
    badges: ['Новинка'],
    specs: [
      ['Длина', '2.29 м'],
      ['Тест', '6–24 г'],
      ['Строй', 'Fast'],
      ['Вес', '118 г'],
    ],
    stockQuantity: 3,
    images: [],
    accent: 'linear-gradient(135deg, #132932 0%, #4c6e5f 48%, #d9c4a1 100%)',
  },
  {
    id: 201,
    slug: 'daiwa-legalis-lt-2500',
    categorySlug: 'reels',
    name: 'Daiwa Legalis LT 2500',
    brand: 'Daiwa',
    price: '11 990 ₽',
    stock: 'В наличии',
    short: 'Надежная катушка на каждый день для универсального комплекта.',
    description:
      'Хороший баланс между весом, плавностью и запасом прочности. Подойдет и новичку, и тому, кто ловит регулярно.',
    season: 'Круглый год',
    fish: 'Щука, окунь',
    water: 'Берег, лодка',
    method: 'Спиннинг',
    material: 'Композит / алюминий',
    badges: ['Популярно'],
    specs: [
      ['Размер', '2500'],
      ['Передатка', '5.3:1'],
      ['Вес', '205 г'],
      ['Фрикцион', '10 кг'],
    ],
    stockQuantity: 6,
    images: [],
    accent: 'linear-gradient(135deg, #1f2a31 0%, #6d7f73 48%, #f0cf98 100%)',
  },
  {
    id: 202,
    slug: 'dayo-caliber-2500',
    categorySlug: 'reels',
    name: 'Dayo Caliber 2500',
    brand: 'Dayo',
    price: '6 490 ₽',
    stock: 'В наличии',
    short: 'Понятная и практичная катушка для первого надежного комплекта.',
    description:
      'Если нужен уверенный старт без переплаты, это один из самых удобных вариантов для повседневной рыбалки.',
    season: 'Круглый год',
    fish: 'Щука, окунь',
    water: 'Берег, лодка',
    method: 'Спиннинг',
    material: 'Алюминиевая шпуля',
    badges: ['Для новичка'],
    specs: [
      ['Размер', '2500'],
      ['Передатка', '5.2:1'],
      ['Вес', '268 г'],
      ['Подшипники', '6+1'],
    ],
    stockQuantity: 8,
    images: [],
    accent: 'linear-gradient(135deg, #26322f 0%, #728663 42%, #e6cfaa 100%)',
  },
  {
    id: 301,
    slug: 'lucky-john-pike-hunter-set',
    categorySlug: 'lures',
    name: 'Lucky John Pike Hunter Set',
    brand: 'Lucky John',
    price: 'от 390 ₽',
    stock: 'В наличии',
    short: 'Подборка силикона под щуку с рабочими цветами на сезон.',
    description:
      'Удобный набор, когда хочется сразу взять несколько понятных приманок под активного хищника и не тратить время на десятки случайных позиций.',
    season: 'Весна / осень',
    fish: 'Щука',
    water: 'Заливы, прибрежка',
    method: 'Джиг, офсет',
    material: 'Съедобный силикон',
    badges: ['Акция', 'На щуку'],
    specs: [
      ['Размер', '3.5–4.5"'],
      ['Формат', 'Силикон'],
      ['Оснащение', 'Джиг / офсет'],
      ['Цвета', 'Рабочая подборка'],
    ],
    stockQuantity: 18,
    images: [],
    accent: 'linear-gradient(135deg, #10272f 0%, #40626d 44%, #f2c97d 100%)',
  },
  {
    id: 302,
    slug: 'strike-pro-inquisitor-110',
    categorySlug: 'lures',
    name: 'Strike Pro Inquisitor 110',
    brand: 'Strike Pro',
    price: '1 180 ₽',
    stock: 'В наличии',
    short: 'Воблер под активный поиск щуки на мелководье и вдоль травы.',
    description:
      'Любимая позиция для тех, кто хочет взять проверенный воблер без долгого чтения форумов и обзоров.',
    season: 'Лето / осень',
    fish: 'Щука',
    water: 'Меляк, окна в траве',
    method: 'Твичинг',
    material: 'Пластик',
    badges: ['Хит'],
    specs: [
      ['Длина', '110 мм'],
      ['Вес', '16.2 г'],
      ['Заглубление', '0.8–1.2 м'],
      ['Плавучесть', 'Suspending'],
    ],
    stockQuantity: 11,
    images: [],
    accent: 'linear-gradient(135deg, #16252f 0%, #53706d 46%, #d8c3a4 100%)',
  },
  {
    id: 401,
    slug: 'shimano-kairiki-012',
    categorySlug: 'lines',
    name: 'Shimano Kairiki 0.12',
    brand: 'Shimano',
    price: '2 990 ₽',
    stock: 'Уточнить наличие',
    short: 'Тонкий информативный шнур для дальности и аккуратной анимации приманки.',
    description:
      'Отличный выбор для тех, кто ценит чувствительность и хочет собрать деликатный спиннинговый комплект.',
    season: 'Лето / осень',
    fish: 'Окунь, судак',
    water: 'Река, канал',
    method: 'Лайт, микроджиг',
    material: 'PE x8',
    badges: ['Популярно'],
    specs: [
      ['Диаметр', '0.12'],
      ['Плетение', 'x8'],
      ['Разрывная нагрузка', '8.3 кг'],
      ['Цвет', 'Mantis Green'],
    ],
    stockQuantity: 7,
    images: [],
    accent: 'linear-gradient(135deg, #172d35 0%, #718a84 40%, #d7c2a1 100%)',
  },
  {
    id: 402,
    slug: 'sunline-super-pe-08',
    categorySlug: 'lines',
    name: 'Sunline Super PE 0.8',
    brand: 'Sunline',
    price: '3 490 ₽',
    stock: 'В наличии',
    short: 'Крепкий шнур для повседневной ловли, когда важны надежность и стабильность.',
    description:
      'Хорошо работает в универсальных сценариях и подходит для тех, кто не хочет компромиссов по ресурсу.',
    season: 'Круглый год',
    fish: 'Щука, судак',
    water: 'Река, водохранилище',
    method: 'Универсальный спиннинг',
    material: 'PE',
    badges: ['В наличии'],
    specs: [
      ['Размер', '0.8'],
      ['Длина', '150 м'],
      ['Цвет', 'Multicolor'],
      ['Формат', 'Плетеный шнур'],
    ],
    stockQuantity: 9,
    images: [],
    accent: 'linear-gradient(135deg, #16262f 0%, #657970 46%, #efcea0 100%)',
  },
  {
    id: 501,
    slug: 'norfin-flow-boots',
    categorySlug: 'gear',
    name: 'Norfin Flow Boots',
    brand: 'Norfin',
    price: '7 890 ₽',
    stock: 'В наличии',
    short: 'Практичная обувь для береговой рыбалки и прохладного утра у воды.',
    description:
      'Когда под ногами сырость, трава и рыхлый берег, комфорт часто важнее еще одной коробки приманок. Это как раз такой случай.',
    season: 'Весна / осень',
    fish: 'Универсально',
    water: 'Берег, база',
    method: 'Выездной формат',
    material: 'EVA / текстиль',
    badges: ['Хит'],
    specs: [
      ['Сезон', 'Весна / осень'],
      ['Материал', 'EVA'],
      ['Подкладка', 'Утепленная'],
      ['Назначение', 'Береговая рыбалка'],
    ],
    stockQuantity: 5,
    images: [],
    accent: 'linear-gradient(135deg, #3e3426 0%, #7f6245 46%, #e2d2b4 100%)',
  },
  {
    id: 502,
    slug: 'alaskan-river-jacket',
    categorySlug: 'gear',
    name: 'Alaskan River Jacket',
    brand: 'Alaskan',
    price: '13 700 ₽',
    stock: 'Под заказ',
    short: 'Куртка для ветра, брызг и долгих выездов к воде.',
    description:
      'Если вы часто оказываетесь у воды ранним утром или в нестабильную погоду, это одна из самых полезных вещей в комплекте.',
    season: 'Весна / осень',
    fish: 'Универсально',
    water: 'Берег, лодка',
    method: 'Выездной формат',
    material: 'Мембрана',
    badges: ['Под заказ'],
    specs: [
      ['Мембрана', '10000 / 10000'],
      ['Капюшон', 'Регулируемый'],
      ['Слой', 'Верхний'],
      ['Посадка', 'Свободная'],
    ],
    stockQuantity: 2,
    images: [],
    accent: 'linear-gradient(135deg, #28312f 0%, #53685e 42%, #cfb291 100%)',
  },
  {
    id: 601,
    slug: 'first-trip-box',
    categorySlug: 'gifts',
    name: 'Набор «Первый выезд»',
    brand: 'ЩУКАРЬ',
    price: 'от 4 500 ₽',
    stock: 'В наличии',
    short: 'Подарочный набор для тех, кто только начинает рыбачить.',
    description:
      'Собираем под бюджет, сезон и формат ловли. Понятный вариант, если хочется подарить полезную вещь, а не случайный сувенир.',
    season: 'Круглый год',
    fish: 'Под задачу',
    water: 'Под задачу',
    method: 'Подбирается',
    material: 'Смешанный комплект',
    badges: ['Подарок', 'Для новичка'],
    specs: [
      ['Бюджет', 'Подбирается'],
      ['Формат', 'Готовый комплект'],
      ['Резерв', 'Можно отложить'],
      ['Консультация', 'Да'],
    ],
    stockQuantity: 6,
    images: [],
    accent: 'linear-gradient(135deg, #213739 0%, #5f7d61 46%, #f1d293 100%)',
  },
  {
    id: 602,
    slug: 'pike-ready-box',
    categorySlug: 'gifts',
    name: 'Подборка «Готово на щуку»',
    brand: 'ЩУКАРЬ',
    price: 'от 6 900 ₽',
    stock: 'В наличии',
    short: 'Сценарная подборка для тех, кто едет именно за рабочим набором на щуку.',
    description:
      'Подходит как себе, так и в подарок. Удобный вариант, если не хочется тратить время на сбор комплекта с нуля.',
    season: 'Весна / осень',
    fish: 'Щука',
    water: 'Берег, заливы',
    method: 'Спиннинг',
    material: 'Смешанный комплект',
    badges: ['На щуку', 'Подарок'],
    specs: [
      ['Сценарий', 'Щука'],
      ['Формат', 'Готовая подборка'],
      ['Сезон', 'Весна / осень'],
      ['Подбор', 'В магазине'],
    ],
    stockQuantity: 4,
    images: [],
    accent: 'linear-gradient(135deg, #17313a 0%, #4e7160 42%, #e8c484 100%)',
  },
]

export const articles: StoryCard[] = [
  {
    slug: 'first-spinning-set',
    title: 'Как собрать первый спиннинговый комплект без лишних трат',
    excerpt: 'Коротко и по делу: что действительно нужно, а где можно не переплачивать на старте.',
    date: '08 апреля 2026',
    kind: 'advice',
  },
  {
    slug: 'reel-choice',
    title: 'Как выбрать катушку, если хочется один рабочий вариант на весь сезон',
    excerpt: 'Разбираем размер, вес и комфорт без заумной терминологии.',
    date: '05 апреля 2026',
    kind: 'advice',
  },
  {
    slug: 'pike-lures',
    title: 'Какие приманки взять на щуку в ближайший выезд',
    excerpt: 'Рабочая логика выбора по погоде, воде и типу места.',
    date: '02 апреля 2026',
    kind: 'advice',
  },
]

export const newsCards: StoryCard[] = [
  {
    slug: 'spring-arrivals',
    title: 'Свежие поступления к сезону уже в магазине',
    excerpt: 'Новые спиннинги, катушки и рабочие приманки, которые можно посмотреть живьем.',
    date: '08 апреля 2026',
    kind: 'news',
  },
  {
    slug: 'weekend-offer',
    title: 'Акции на популярные позиции и стартовые наборы',
    excerpt: 'Удобный повод собрать комплект или взять подарок без долгих сомнений.',
    date: '06 апреля 2026',
    kind: 'offer',
  },
  {
    slug: 'reserve-items',
    title: 'Теперь можно быстрее отложить снасти перед приездом',
    excerpt: 'Напишите в WhatsApp, и мы подскажем по наличию и резерву.',
    date: '03 апреля 2026',
    kind: 'news',
  },
]

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
