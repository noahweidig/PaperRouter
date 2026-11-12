const L = require('../../PaperRouter/chrome/content/localrank.js');

const collections = [
  { id: 1, name: 'Fuels' },
  { id: 2, name: 'Prescribed Fire' },
  { id: 3, name: 'Remote Sensing' },
  { id: 4, name: 'Machine Learning' },
  { id: 5, name: 'Empty Policy Collection' },
  { id: 6, name: '森林火灾' }
];
const items = [
  { id: 10, title: 'Shrub cover and fuel loads after wildfire', tags: ['fuel', 'shrub'], collectionIds: [1] },
  { id: 11, title: 'Estimating surface fuel moisture in conifer forests', abstract: 'fuel moisture measurements', collectionIds: [1] },
  { id: 12, title: 'Fuel treatments reduce crown fire hazard', collectionIds: [1, 2] },
  { id: 13, title: 'Prescribed burning effects on understory vegetation', tags: ['prescribed burn'], collectionIds: [2] },
  { id: 14, title: 'Fire return intervals and prescribed burn programs', collectionIds: [2] },
  { id: 15, title: 'Landsat time series for burned area mapping', tags: ['landsat'], collectionIds: [3] },
  { id: 16, title: 'Sentinel-2 satellite imagery for vegetation monitoring', collectionIds: [3] },
  { id: 17, title: 'Deep learning for wildfire smoke detection', abstract: 'convolutional neural networks', collectionIds: [4, 3] },
  { id: 18, title: 'Transformer models for time series forecasting', collectionIds: [4] },
  { id: 19, title: '森林火灾风险评估方法', collectionIds: [6] }
];
const rank = (idx, item, ex) =>
  [...L.score(idx, item, ex).entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);

describe('localrank tokenizer', () => {
  test('stems and drops stopwords', () => {
    expect(L.tokenize('The burning of fuels and shrubs')).toEqual(['burn', 'fuel', 'shrub']);
  });
  test('Chinese becomes bigrams', () => {
    expect(L.tokenize('森林火灾')).toEqual(['森林', '林火', '火灾']);
  });
  test('handles empty input', () => {
    expect(L.tokenize('')).toEqual([]);
    expect(L.tokenize(null)).toEqual([]);
  });
});

describe('localrank scoring', () => {
  const idx = L.buildIndex({ collections, items });

  test('ranks the collection holding similar papers first', () => {
    expect(rank(idx, { title: 'Fuel loads in shrubland after fire' })[0]).toBe(1);
    expect(rank(idx, { title: 'Effects of prescribed burns on forest understory' })[0]).toBe(2);
    expect(rank(idx, { title: 'Mapping burned area with satellite imagery' })[0]).toBe(3);
    expect(rank(idx, { title: 'Neural networks for forecasting' })[0]).toBe(4);
  });

  test('tags and abstract contribute', () => {
    const r = rank(idx, { title: 'Untitled study', tags: ['landsat'], abstract: 'time series' });
    expect(r[0]).toBe(3);
  });

  test('Chinese item matches Chinese collection', () => {
    expect(rank(idx, { title: '森林火灾风险分析' })[0]).toBe(6);
  });

  test('unseen words give zero everywhere', () => {
    const s = L.score(idx, { title: 'qwertyuiop zxcvbnm' });
    expect([...s.values()].every(v => v === 0)).toBe(true);
  });

  test('empty collection is scored by name only', () => {
    const s = L.score(idx, { title: 'Policy design' });
    expect(s.get(5)).toBeGreaterThan(0);
    expect(s.get(5)).toBeLessThanOrEqual(1);
  });

  test('scores stay within 0..1', () => {
    for (const v of L.score(idx, { title: items[0].title, tags: ['fuel'] }).values()) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test('excluding an item removes its own evidence', () => {
    const own = items[0];
    const withSelf = L.score(idx, own).get(1);
    const without = L.score(idx, own, own.id).get(1);
    expect(without).toBeLessThan(withSelf);
  });

  test('builds on an empty library', () => {
    const e = L.buildIndex({ collections, items: [] });
    expect(() => L.score(e, { title: 'anything' })).not.toThrow();
  });
});

describe('localrank speed', () => {
  test('5000 items: build + score is fast', () => {
    const words = 'fire fuel shrub forest satellite model learning soil carbon water climate remote sensing burn smoke tree canopy biomass drought'.split(' ');
    const big = [];
    const cols = [];
    for (let c = 0; c < 60; c++) cols.push({ id: c, name: 'Collection ' + words[c % words.length] + c });
    for (let i = 0; i < 5000; i++) {
      const t = [0, 1, 2, 3, 4, 5].map(k => words[(i * 7 + k * 13 + (i % 11)) % words.length] + (i % 37 === 0 ? i : '')).join(' ');
      big.push({ id: i, title: t, abstract: t + ' ' + t, collectionIds: [i % 60] });
    }
    let t0 = Date.now();
    const idx = L.buildIndex({ collections: cols, items: big });
    const build = Date.now() - t0;
    t0 = Date.now();
    for (let k = 0; k < 20; k++) L.score(idx, { title: 'fuel moisture in forest canopy', abstract: 'smoke and carbon' });
    const per = (Date.now() - t0) / 20;
    expect(build).toBeLessThan(3000);
    expect(per).toBeLessThan(100);
  });
});
