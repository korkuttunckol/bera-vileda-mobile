import { describe, expect, it } from 'vitest';
import { deriveLogoApiSibling } from '@/config/env';

describe('deriveLogoApiSibling', () => {
  it('derives satisKosullari.ashx from stoklar.ashx LAN URL', () => {
    expect(
      deriveLogoApiSibling(
        'http://192.168.1.11/LogoApi/stoklar.ashx',
        'satisKosullari.ashx',
      ),
    ).toBe('http://192.168.1.11/LogoApi/satisKosullari.ashx');
  });
});
