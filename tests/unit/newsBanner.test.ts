import { describe, expect, it } from 'vitest';
import {
  NEWS_BANNER_EXPIRES_AT,
  isNewsBannerActive,
  isNewsBannerPlayRoute,
} from '@/lib/newsBanner';

describe('news banner', () => {
  it('hides after the expiry date', () => {
    expect(isNewsBannerActive(NEWS_BANNER_EXPIRES_AT - 1)).toBe(true);
    expect(isNewsBannerActive(NEWS_BANNER_EXPIRES_AT)).toBe(false);
  });

  it('stays off exercise play screens', () => {
    expect(isNewsBannerPlayRoute('/')).toBe(false);
    expect(isNewsBannerPlayRoute('/exercices')).toBe(false);
    expect(isNewsBannerPlayRoute('/exercices/calcul-mental')).toBe(true);
    expect(isNewsBannerPlayRoute('/telephone/calcul-mental')).toBe(true);
  });
});
