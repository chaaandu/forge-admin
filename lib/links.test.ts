import { describe, expect, it } from 'vitest'
import { instagramUrl, linkLabel, websiteUrl } from './links.ts'

describe('websiteUrl', () => {
  it('accepts the shapes in the sheet', () => {
    expect(websiteUrl('https://aksperfumes.in/')).toBe('https://aksperfumes.in/')
    expect(websiteUrl('houseofpravaah.com')).toBe('https://houseofpravaah.com/')
    expect(websiteUrl('www.mugshot.in')).toBe('https://www.mugshot.in/')
    expect(websiteUrl('Meltyk.in')).toBe('https://meltyk.in/')
  })

  it('refuses anything that is not a web address', () => {
    for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', 'mailto:a@b.co', 'not a site', '', 'localhost']) {
      expect(websiteUrl(bad), bad).toBeNull()
    }
  })
})

describe('instagramUrl', () => {
  it('reduces a profile link to the profile, without tracking parameters', () => {
    expect(instagramUrl('https://www.instagram.com/shop_lumii?stkn=c3BtY2pubGVremU3')).toBe('https://www.instagram.com/shop_lumii/')
    expect(instagramUrl('https://www.instagram.com/atmiva.in')).toBe('https://www.instagram.com/atmiva.in/')
  })

  it('takes a bare handle', () => {
    expect(instagramUrl('@meltyk.in')).toBe('https://www.instagram.com/meltyk.in/')
  })

  it('refuses other sites and schemes', () => {
    expect(instagramUrl('https://evil.com/instagram.com/x')).toBeNull()
    expect(instagramUrl('javascript:alert(1)')).toBeNull()
  })
})

describe('linkLabel', () => {
  it('prints a link without its scheme', () => {
    expect(linkLabel('https://www.instagram.com/shop_lumii/')).toBe('instagram.com/shop_lumii')
    expect(linkLabel('https://aksperfumes.in/')).toBe('aksperfumes.in')
  })
})
