// Narxlar va coin sozlamalari. O'zgartirish uchun shu yerni tahrirlang.

/** Har bir video tayyorlash (render) shuncha coin yechadi. */
export const COIN_PER_RENDER = 1;
/** Yangi foydalanuvchiga beriladigan bepul coin (sinov). */
export const WELCOME_COINS = 3;

export interface CoinPack {
  id: string;
  coins: number;
  priceUzs: number;
  highlight?: boolean;
}

export const COIN_PACKS: CoinPack[] = [
  { id: "p10", coins: 10, priceUzs: 15000 },
  { id: "p25", coins: 25, priceUzs: 30000, highlight: true },
  { id: "p100", coins: 100, priceUzs: 120000 },
];

export interface Plan {
  id: string;
  label: string;
  days: number;
  priceUzs: number;
  highlight?: boolean;
}

/** Cheksiz oylik obuna (ko'p ishlatadiganlar uchun). */
export const PLANS: Plan[] = [
  { id: "1m", label: "1 oy cheksiz", days: 30, priceUzs: 49000, highlight: true },
  { id: "3m", label: "3 oy cheksiz", days: 90, priceUzs: 119000 },
  { id: "12m", label: "1 yil cheksiz", days: 365, priceUzs: 349000 },
];

export const PRICING_NOTE = "Captions.ai'dan 3 barobar arzon";

export function formatUzs(value: number): string {
  return value.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";
}
