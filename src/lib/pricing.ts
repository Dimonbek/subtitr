// Obuna narxlari. Captions.ai ≈ $10/oy — biz 3× arzon (~$3/oy).
// Narxlarni o'zgartirish uchun shu yerni tahrirlang.

export interface Plan {
  id: string;
  label: string;
  days: number;
  priceUzs: number;
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  { id: "1m", label: "1 oy", days: 30, priceUzs: 39000, highlight: true },
  { id: "3m", label: "3 oy", days: 90, priceUzs: 99000 },
  { id: "12m", label: "1 yil", days: 365, priceUzs: 299000 },
];

export const PRICING_NOTE = "Captions.ai'dan 3 barobar arzon";

export function formatUzs(value: number): string {
  return value.toLocaleString("uz-UZ").replace(/,/g, " ") + " so'm";
}
