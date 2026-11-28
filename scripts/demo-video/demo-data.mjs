// Demo content for the recorded app video. Everything here is invented:
// product names, brands, people and barcodes (GS1 prefix 20 = in-store numbers,
// never a real product). Images stay empty so the app shows its own artwork.
import { ean13 } from './ean13.mjs';

const productId = (index) => ean13(`2004211${String(index).padStart(5, '0')}`);

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// ageMs: how long ago the product was added (drives "Neu im Regal").
export const PRODUCTS = [
  { key: 'chips', name: 'Knusper Kichererbsen Chips Paprika', brand: 'Feldkorn', category: 'Snacks', nutriScore: 'c', price: 1.99, reviewCount: 48, averageRating: 4.6, ageMs: 9 * DAY },
  { key: 'cookie', name: 'Haferkeks mit Schokostücken', brand: 'Backstube Linde', category: 'Snacks', nutriScore: 'd', price: 2.29, reviewCount: 41, averageRating: 4.4, ageMs: 12 * DAY },
  { key: 'skyr', name: 'Skyr Heidelbeere', brand: 'Nordhof', category: 'Kühlware', nutriScore: 'a', price: 1.99, reviewCount: 37, averageRating: 4.5, ageMs: 15 * DAY },
  { key: 'coldbrew', name: 'Cold Brew Hafer Latte', brand: 'Bohnenliebe', category: 'Getränke', nutriScore: 'b', price: 2.79, reviewCount: 33, averageRating: 4.3, ageMs: 4 * DAY },
  { key: 'schorle', name: 'Rhabarber Schorle', brand: 'Quellhof', category: 'Getränke', nutriScore: 'b', price: 0.99, reviewCount: 29, averageRating: 4.2, ageMs: 20 * DAY },
  { key: 'almond', name: 'Zartbitter Mandel Crunch', brand: 'Kakaowerk', category: 'Snacks', nutriScore: 'd', price: 2.99, reviewCount: 26, averageRating: 4.4, ageMs: 18 * DAY },
  { key: 'peanut', name: 'Erdnussmus crunchy', brand: 'Nussmühle', category: 'Vorrat', nutriScore: 'a', price: 4.49, reviewCount: 22, averageRating: 4.7, ageMs: 25 * DAY },
  { key: 'oatdrink', name: 'Hafer Drink Barista', brand: 'Kornblume', category: 'Kühlware', nutriScore: 'b', price: 2.49, reviewCount: 19, averageRating: 4.1, ageMs: 30 * DAY },
  { key: 'pasta', name: 'Rote Linsen Pasta', brand: 'Nudelglück', category: 'Vorrat', nutriScore: 'a', price: 2.19, reviewCount: 17, averageRating: 4.0, ageMs: 2 * DAY },
  { key: 'ginger', name: 'Ingwer Zitrone Limo', brand: 'Sprudelgarten', category: 'Getränke', nutriScore: 'c', price: 1.29, reviewCount: 15, averageRating: 3.9, ageMs: 5 * HOUR },
  { key: 'pudding', name: 'Protein Pudding Vanille', brand: 'Fitmolkerei', category: 'Kühlware', nutriScore: 'b', price: 1.49, reviewCount: 13, averageRating: 4.2, ageMs: 26 * HOUR },
  { key: 'icetea', name: 'Eistee Pfirsich zuckerreduziert', brand: 'Teehaus Nord', category: 'Getränke', nutriScore: 'c', price: 1.19, reviewCount: 11, averageRating: 3.8, ageMs: 40 * HOUR },
  { key: 'sauce', name: 'Tomaten Basilikum Sauce', brand: 'Sonnentomate', category: 'Vorrat', nutriScore: 'a', price: 1.79, reviewCount: 9, averageRating: 4.1, ageMs: 3 * DAY },
  { key: 'porridge', name: 'Hafer Porridge Zimt', brand: 'Morgenstund', category: 'Vorrat', nutriScore: 'a', price: 2.59, reviewCount: 8, averageRating: 4.3, ageMs: 50 * MINUTE },
  { key: 'icecoffee', name: 'Hafer Eiskaffee', brand: 'Kaffeekontor', category: 'Getränke', nutriScore: 'b', price: 1.49, reviewCount: 14, averageRating: 4.2, ageMs: 6 * DAY },
  { key: 'skyrdupe', name: 'Skyr Blaubeere', brand: 'Milchwiese', category: 'Kühlware', nutriScore: 'a', price: 1.19, reviewCount: 12, averageRating: 4.3, ageMs: 8 * DAY },
  { key: 'peanutdupe', name: 'Erdnusscreme grob', brand: 'Sonnenkern', category: 'Vorrat', nutriScore: 'a', price: 2.29, reviewCount: 10, averageRating: 4.4, ageMs: 10 * DAY },
  { key: 'almonddupe', name: 'Mandel Bruch Zartbitter', brand: 'Süßkontor', category: 'Snacks', nutriScore: 'd', price: 1.69, reviewCount: 9, averageRating: 4.1, ageMs: 11 * DAY },
  { key: 'oatdupe', name: 'Haferdrink Barista Edition', brand: 'Wiesengold', category: 'Kühlware', nutriScore: 'b', price: 1.29, reviewCount: 7, averageRating: 4.0, ageMs: 14 * DAY },
].map((product, index) => ({ ...product, id: productId(index + 1) }));

export const productByKey = (key) => {
  const product = PRODUCTS.find((entry) => entry.key === key);

  if (!product) {
    throw new Error(`Unknown demo product: ${key}`);
  }

  return product;
};

// Reviewers without accounts or avatars; the app shows their initials.
export const REVIEWERS = {
  lena: { uid: 'demo-user-lena', displayName: 'Lena' },
  jonas: { uid: 'demo-user-jonas', displayName: 'Jonas' },
  aylin: { uid: 'demo-user-aylin', displayName: 'Aylin' },
  tim: { uid: 'demo-user-tim', displayName: 'Tim' },
  sophie: { uid: 'demo-user-sophie', displayName: 'Sophie' },
  malte: { uid: 'demo-user-malte', displayName: 'Malte' },
};

// The account that logs in during the recording.
export const DEMO_ACCOUNT = {
  uid: 'demo-user-mia',
  email: 'mia@example.com',
  password: 'demo2026',
  displayName: 'Mia',
};

export const REVIEWS = [
  { id: 'demo-review-01', user: 'lena', product: 'ginger', rating: 5, store: 'Rewe', price: 1.29, comment: 'Schön scharf und nicht zu süß. Perfekt nach dem Sport!', ageMs: 7 * MINUTE },
  { id: 'demo-review-02', user: 'jonas', product: 'chips', rating: 5, store: 'Lidl', price: 1.99, comment: 'Krasser Crunch, die Tüte war in zehn Minuten leer.', ageMs: 22 * MINUTE },
  { id: 'demo-review-03', user: 'aylin', product: 'pudding', rating: 4, store: 'Kaufland', price: 1.49, comment: 'Cremig, schmeckt kaum nach Protein. Gerne mehr Sorten!', ageMs: 48 * MINUTE },
  { id: 'demo-review-04', user: 'sophie', product: 'cookie', rating: 5, store: 'Edeka', price: 2.29, comment: 'Weich in der Mitte, außen knusprig. Mein neuer Lieblingskeks.', ageMs: 2 * HOUR },
  { id: 'demo-review-05', user: 'tim', product: 'cookie', rating: 4, store: 'Aldi', price: 2.19, comment: 'Richtig gut zum Kaffee, nur die Packung ist etwas klein.', ageMs: 5 * HOUR },
  { id: 'demo-review-06', user: 'malte', product: 'cookie', rating: 4, store: 'Rewe', price: 2.29, comment: 'Viele Schokostücke, kaum Krümel. Top!', ageMs: 9 * HOUR },
  { id: 'demo-review-07', user: 'lena', product: 'chips', rating: 4, store: 'Netto', price: 1.89, comment: 'Würzig und angenehm leicht. Paprika ist die beste Sorte.', ageMs: 14 * HOUR },
  { id: 'demo-review-08', user: 'aylin', product: 'skyr', rating: 5, store: 'Penny', price: 1.99, comment: 'Dick, fruchtig und richtig satt machend.', ageMs: 20 * HOUR },
  { id: 'demo-review-09', user: 'jonas', product: 'coldbrew', rating: 4, store: 'Dm', price: 2.79, comment: 'Schmeckt wie aus dem Café, aber nicht ganz billig.', ageMs: 26 * HOUR },
  { id: 'demo-review-10', user: 'sophie', product: 'icetea', rating: 3, store: 'Aldi', price: 1.19, comment: 'Okay, mir fehlt etwas Pfirsich.', ageMs: 30 * HOUR },
  { id: 'demo-review-11', user: 'tim', product: 'peanut', rating: 5, store: "Denn's", price: 4.49, comment: 'Volle Nussstücke, nichts setzt sich oben ab.', ageMs: 36 * HOUR },
  { id: 'demo-review-12', user: 'malte', product: 'sauce', rating: 4, store: 'Alnatura', price: 1.79, comment: 'Frischer Basilikum, schmeckt fast selbst gemacht.', ageMs: 2 * DAY },
  { id: 'demo-review-13', user: 'sophie', product: 'chips', rating: 5, store: 'Kaufland', price: 1.99, comment: 'Endlich Chips, bei denen ich kein schlechtes Gewissen habe.', ageMs: 3 * DAY },
  { id: 'demo-review-14', user: 'mia', product: 'schorle', rating: 5, store: 'Rewe', price: 0.99, comment: 'Herrlich spritzig, genau richtig sauer.', ageMs: 4 * DAY },
  { id: 'demo-review-15', user: 'mia', product: 'pasta', rating: 4, store: 'Edeka', price: 2.19, comment: 'Bissfest und sättigend, mit Tomatensauce top.', ageMs: 6 * DAY },
];

// Dupe Alarm: original -> cheaper alternative, with fictional voters.
export const DUPES = [
  { original: 'coldbrew', dupe: 'icecoffee', voters: { up: ['lena', 'jonas', 'tim', 'sophie'], down: ['malte'] }, ageMs: 2 * DAY },
  { original: 'skyr', dupe: 'skyrdupe', voters: { up: ['aylin', 'malte', 'lena'], down: [] }, ageMs: 3 * DAY },
  { original: 'peanut', dupe: 'peanutdupe', voters: { up: ['tim', 'sophie'], down: ['jonas'] }, ageMs: 4 * DAY },
  { original: 'almond', dupe: 'almonddupe', voters: { up: ['jonas', 'aylin'], down: [] }, ageMs: 5 * DAY },
  { original: 'oatdrink', dupe: 'oatdupe', voters: { up: ['sophie'], down: ['tim'] }, ageMs: 7 * DAY },
];

// The barcode on the fake camera clip and the Open Food Facts answer for it.
export const SCANNED_PRODUCT_KEY = 'chips';

export const openFoodFactsAnswer = (barcode) => {
  const product = PRODUCTS.find((entry) => entry.id === barcode);

  if (!product) {
    return { status: 0, status_verbose: 'product not found', code: barcode };
  }

  return {
    status: 1,
    status_verbose: 'product found',
    code: barcode,
    product: {
      code: barcode,
      product_name: product.name,
      brands: product.brand,
      nutriscore_grade: product.nutriScore,
      categories_tags: {
        Snacks: ['en:snacks', 'en:salty-snacks', 'en:chips'],
        'Getränke': ['en:beverages'],
        'Kühlware': ['en:dairy', 'en:yogurts'],
        Vorrat: ['en:groceries'],
      }[product.category],
    },
  };
};
