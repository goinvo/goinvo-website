import { describe, it, expect } from 'vitest'
import { focusCrop, validFocus, walkthroughUrl, imageDimensions } from '../src/lib/guidedWalkthrough'

describe('authored interface walkthroughs', () => {
  it('keeps the highlighted area visible even at image edges and unusual aspect ratios', () => {
    let checked = 0
    for (const dimensions of [{width:1440,height:960},{width:390,height:1200},{width:2000,height:400}]) {
      for (const focus of [{x:0,y:0,width:100,height:4},{x:90,y:90,width:10,height:10},{x:76,y:13,width:23,height:78}]) {
        const crop = focusCrop(focus, dimensions)
        expect(crop.x).toBeGreaterThanOrEqual(0)
        expect(crop.y).toBeGreaterThanOrEqual(0)
        expect(crop.x + crop.width).toBeLessThanOrEqual(100.001)
        expect(crop.y + crop.height).toBeLessThanOrEqual(100.001)
        expect(crop.x).toBeLessThanOrEqual(focus.x)
        expect(crop.y).toBeLessThanOrEqual(focus.y)
        expect(crop.x + crop.width).toBeGreaterThanOrEqual(focus.x + focus.width)
        expect(crop.y + crop.height).toBeGreaterThanOrEqual(focus.y + focus.height)
        checked++
      }
    }
    expect(checked).toBe(9)
  })
  it('falls back to a full image for missing or malformed author input', () => {
    for (const focus of [undefined,{x:0,y:0,width:0,height:10},{x:90,y:0,width:20,height:10},{x:NaN,y:0,width:10,height:10}]) {
      expect(validFocus(focus)).toBe(false)
      expect(focusCrop(focus,{width:1440,height:960})).toEqual({x:0,y:0,width:100,height:100})
    }
  })
  it('allows only web and site-relative demo destinations', () => {
    expect(walkthroughUrl('/demos/example?scenario=low')).toBe('/demos/example?scenario=low')
    expect(walkthroughUrl('https://example.org/demo')).toBe('https://example.org/demo')
    for (const url of ['javascript:alert(1)','data:text/html,test','//example.org','file:///secret','']) expect(walkthroughUrl(url)).toBeUndefined()
  })
  it('reads real screenshot dimensions from Sanity image references', () => {
    expect(imageDimensions({_type:'image',asset:{_type:'reference',_ref:'image-abc-1440x960-png'}})).toEqual({width:1440,height:960})
  })
})
