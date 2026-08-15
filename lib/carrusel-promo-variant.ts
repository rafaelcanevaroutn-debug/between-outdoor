import type { PromoVariante } from '@/types'

export type PromoVariantRequest = PromoVariante | 'todas'

const PROMO_VARIANT_REQUESTS = new Set<PromoVariantRequest>([
  'promo_simple',
  'promo_cta',
  'promo_info',
  'todas',
])

export function isPromoVariantRequest(value: unknown): value is PromoVariantRequest {
  return typeof value === 'string' && PROMO_VARIANT_REQUESTS.has(value as PromoVariantRequest)
}

export function expandPromoVariants(value: PromoVariantRequest): PromoVariante[] {
  return value === 'todas'
    ? ['promo_simple', 'promo_cta', 'promo_info']
    : [value]
}
