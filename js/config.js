/** Supabase project corepga-cards. Browser-safe keys only. */
export const SUPABASE_URL = 'https://nixrnrbvtybglsekxlby.supabase.co';

/** Publishable key (new-style). supabase-js @2.81.0 accepts this. */
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EuoY0YMUlmeDD3L0yPQhvw_SDPahRpS';

/**
 * Pinned ESM build:
 *   https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.0/+esm
 */
export const SUPABASE_JS_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.81.0/+esm';

export const DEFAULT_COMPANY = 'Core Power Generation Advisors, INC';
export const DEFAULT_WEBSITE = 'https://www.corepga.com';
export const DEFAULT_ACCENT = '#0071C2';
export const DEFAULT_TEMPLATE = 'classic';

/** Same mark as the Corepgatest site header (500×100 PNG; no SVG in this repo). */
export const BRAND_LOGO = '/assets/corepga-logo.png';
export const BRAND_LOGO_ON_DARK = '/assets/corepga-logo-white.png';
export const BRAND_LOGO_WIDTH = 180;
export const BRAND_LOGO_HEIGHT = 36;
export const LOGO_DARK = BRAND_LOGO;
export const LOGO_LIGHT = BRAND_LOGO_ON_DARK;

export const TEMPLATES = [
  { id: 'classic', label: 'Classic', hint: 'CorePGA blue & white' },
  { id: 'midnight', label: 'Midnight', hint: 'Dark navy, cyan light' },
  { id: 'ivory', label: 'Ivory', hint: 'Warm editorial' },
  { id: 'steel', label: 'Steel', hint: 'Quiet and minimal' }
];

export const MEDIA_BUCKET = 'card-media';
