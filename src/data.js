// FILE: src/data.js

export const STORES = ['Aldi', 'Lidl', 'Rewe', 'Edeka', 'Penny', 'Kaufland', 'Dm', 'Netto', "Denn's", 'Alnatura'];
export const STORE_FILTERS = ['Alle', ...STORES];

const STORE_NAME_MAP = {
  alle: 'Alle',
  aldi: 'Aldi',
  lidl: 'Lidl',
  rewe: 'Rewe',
  edeka: 'Edeka',
  penny: 'Penny',
  panny: 'Penny',
  kaufland: 'Kaufland',
  dm: 'Dm',
  netto: 'Netto',
  "denn's": "Denn's",
  denns: "Denn's",
  alnatura: 'Alnatura',
};

const STORE_QUERY_VALUE_MAP = {
  Aldi: ['Aldi'],
  Lidl: ['Lidl'],
  Rewe: ['Rewe'],
  Edeka: ['Edeka'],
  Penny: ['Penny', 'Panny'],
  Kaufland: ['Kaufland'],
  Dm: ['dm', 'Dm', 'DM'],
  Netto: ['Netto'],
  "Denn's": ["Denn's", 'Denns', "denn's", 'denns'],
  Alnatura: ['Alnatura'],
};

export const normalizeStoreName = (value = '') => {
  if (typeof value !== 'string') {
    return '';
  }

  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue) {
    return '';
  }

  return STORE_NAME_MAP[normalizedValue] || value.trim();
};

export const storeMatchesFilter = (storeName, filterName = 'Alle') => {
  const normalizedFilter = normalizeStoreName(filterName);

  if (!normalizedFilter || normalizedFilter === 'Alle') {
    return true;
  }

  return normalizeStoreName(storeName) === normalizedFilter;
};

export const getStoreQueryValues = (filterName = 'Alle') => {
  const normalizedFilter = normalizeStoreName(filterName);

  if (!normalizedFilter || normalizedFilter === 'Alle') {
    return [];
  }

  return STORE_QUERY_VALUE_MAP[normalizedFilter] || [normalizedFilter];
};

export const MOCK_PRODUCTS = [
  {
    id: '4002359000012',
    name: 'Pesto Genovese',
    brand: 'Barilla',
    image: '',
    nutriScore: 'd',
    category: 'Pasta & Saucen'
  },
  {
    id: '4388844000021',
    name: 'Frische Fettarme Milch 1,5%',
    brand: 'ja!',
    image: '',
    nutriScore: 'a',
    category: 'Milchprodukte'
  },
  {
    id: '4337185000035',
    name: 'American Style Cookies',
    brand: 'K-Classic',
    image: '',
    nutriScore: 'e',
    category: 'Süßwaren'
  },
  {
    id: '4061458000048',
    name: 'Speisequark Magerstufe',
    brand: 'Milsani',
    image: '',
    nutriScore: 'a',
    category: 'Milchprodukte'
  },
  {
    id: '2002222000059',
    name: 'Cola Zero',
    brand: 'Freeway',
    image: '',
    nutriScore: 'b',
    category: 'Getränke'
  },
  {
    id: '4058172000063',
    name: 'Duschgel Sensitive',
    brand: 'Balea',
    image: '',
    nutriScore: null,
    category: 'Drogerie'
  }
];