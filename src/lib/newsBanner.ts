/** Une semaine après le 27 août 2026. */
export const NEWS_BANNER_EXPIRES_AT = Date.parse('2026-09-03T23:59:59+02:00');

export const NEWS_BANNER_STORAGE_KEY = 'aviatest-news:2026-08-27';

export function isNewsBannerActive(now = Date.now()): boolean {
  return now < NEWS_BANNER_EXPIRES_AT;
}

export function isNewsBannerPlayRoute(pathname: string): boolean {
  if (pathname.startsWith('/auth/')) return true;
  if (pathname.startsWith('/telephone/')) return true;
  if (pathname.startsWith('/exercises/')) return true;
  if (pathname.startsWith('/exercices/') && pathname !== '/exercices') return true;
  return false;
}
