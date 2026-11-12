const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadRouter(rows) {
  const root = path.join(__dirname, '..', '..', 'PaperRouter');
  const sandbox = {
    console, setTimeout, clearTimeout, setInterval, clearInterval, Date, Map, Set, Promise,
    Zotero: {
      debug() {},
      DB: { queryAsync: async (sql) => rows(sql) },
      Notifier: { registerObserver: () => 1, unregisterObserver() {} },
      Prefs: { get: () => null, set() {} }
    },
    TidyUpL10n: { getString: k => k }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'chrome/content/localrank.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'tidy-up.js'), 'utf8'), sandbox);
  const router = sandbox.PaperRouter || sandbox.TidyUp;
  router.log = () => {};
  router.__zotero = sandbox.Zotero;
  router.collectionBlacklist = { applyRejectionPenalty: (id, s) => s };
  return router;
}

const rows = (sql) => {
  if (/FROM collections/.test(sql)) return [{ cid: 1, name: 'Fuels' }, { cid: 2, name: 'Remote Sensing' }];
  if (/FROM collectionItems ci/.test(sql)) return [{ cid: 1, iid: 10 }, { cid: 1, iid: 11 }, { cid: 2, iid: 12 }];
  if (/FROM itemData/.test(sql)) return [
    { iid: 10, field: 'title', value: 'Shrub fuel loads after wildfire' },
    { iid: 11, field: 'title', value: 'Surface fuel moisture in conifer forests' },
    { iid: 12, field: 'title', value: 'Landsat burned area mapping' },
    { iid: 12, field: 'abstractNote', value: 'satellite imagery' }
  ];
  if (/FROM itemTags/.test(sql)) return [{ iid: 12, name: 'landsat' }];
  return [];
};

describe('local rank wiring in tidy-up.js', () => {
  test('builds the index from DB rows and ranks the tree', async () => {
    const r = loadRouter(rows);
    const trees = [{ id: 1, name: 'Fuels', children: [] }, { id: 2, name: 'Remote Sensing', children: [] }, { id: 3, name: 'Other', children: [] }];
    await r.calculateTreeLocal(trees, 'Fuel loads in shrubland', new Set(), '', {});
    expect(trees[0].confidence).toBeGreaterThan(trees[1].confidence);
    expect(trees[2].confidence).toBe(0);
  });

  test('blacklisted collections score 0', async () => {
    const r = loadRouter(rows);
    const trees = [{ id: 1, name: 'Fuels', children: [] }];
    await r.calculateTreeLocal(trees, 'Fuel loads', new Set([1]), '', {});
    expect(trees[0].confidence).toBe(0);
  });

  test('index is cached until marked dirty', async () => {
    let calls = 0;
    const r = loadRouter((sql) => { if (/FROM collections/.test(sql)) calls++; return rows(sql); });
    await r.getLocalRankIndex();
    await r.getLocalRankIndex();
    expect(calls).toBe(1);
    r.markLocalRankDirty();
    await r.getLocalRankIndex();
    expect(calls).toBe(2);
  });

  test('falls back to legacy similarity if the DB query fails', async () => {
    const r = loadRouter(() => { throw new Error('db down'); });
    const trees = [{ id: 1, name: 'Fuels', children: [] }];
    r.idfWeighting = { applyIDFWeight: (i, n, s) => s };
    r.collectionSpecificity = { applySpecificityWeightById: (i, n, s) => s };
    r.classificationConfig = { algorithm: 'other' };
    await expect(r.calculateTreeLocal(trees, 'Fuels', new Set(), '', {})).resolves.toBeUndefined();
    expect(typeof trees[0].confidence).toBe('number');
  });
});

describe('batch ranking', () => {
  function makeTree(n) {
    const roots = [];
    const all = [];
    for (let i = 0; i < n; i++) {
      const parent = i % 5 === 4 && all.length ? all[all.length - 1] : null;
      const node = { id: i + 1, key: 'K' + i, name: `Collection ${['fuel', 'fire', 'satellite', 'model', 'soil'][i % 5]} ${i}`, confidence: 0, children: [], parent };
      if (parent) parent.children.push(node); else roots.push(node);
      all.push(node);
    }
    return roots;
  }
  function makeItem(i) {
    return {
      id: 1000 + i,
      topLevelItem: null,
      getDisplayTitle: () => `Fuel moisture satellite model ${i} soil fire`,
      getField: (f) => (f === 'abstractNote' ? 'wildfire fuel' : ''),
      getTags: () => [{ tag: 'fuel' }],
      getCollections: () => [1]
    };
  }

  test('ranks many items against one tree, fast, without removing anything', async () => {
    const r = loadRouter((sql) => {
      if (/FROM collections/.test(sql)) return Array.from({ length: 300 }, (_, i) => ({ cid: i + 1, name: 'Collection ' + i }));
      if (/FROM collectionItems ci/.test(sql)) return Array.from({ length: 2000 }, (_, i) => ({ cid: (i % 300) + 1, iid: i }));
      if (/FROM itemData/.test(sql)) return Array.from({ length: 2000 }, (_, i) => ({ iid: i, field: 'title', value: `fuel fire soil model ${i % 40} satellite` }));
      return [];
    });
    const tree = makeTree(300);
    r.getAllCollectionsTree = async () => tree;
    r.collectionBlacklist = { applyRejectionPenalty: (id, s) => s, getBlacklist: () => new Set() };
    r.idfWeighting = { applyIDFWeight: (i, n, s) => s };
    r.collectionSpecificity = { applySpecificityWeightById: (i, n, s) => s };
    r.classificationConfig = { algorithm: 'vector' };
    r.embeddingConfig = { provider: null, apiKey: null };
    r.__zotero.Collections = { get: (id) => ({ name: 'C' + id }) };
    const items = Array.from({ length: 100 }, (_, i) => makeItem(i));
    const t0 = Date.now();
    const rows = await r.rankBatch(items);
    const ms = Date.now() - t0;
    expect(rows).toHaveLength(100);
    expect(rows[0].suggestions.length).toBeGreaterThan(0);
    expect(rows[0].suggestions.every(s => s.id !== 1)).toBe(true);   // already-in collection not suggested
    expect(rows[0].existing).toEqual([{ id: 1, name: 'C1' }]);
    expect(ms).toBeLessThan(5000);
    console.log('rankBatch 100 items x 300 collections:', ms, 'ms');
  });
});

describe('batch filing', () => {
  test('adds only missing memberships, in one transaction, never removes', async () => {
    const r = loadRouter(() => []);
    const added = [];
    let tx = 0;
    r.__zotero.DB.executeTransaction = async (fn) => { tx++; await fn(); };
    r.__zotero.Collections = { getAsync: async (id) => ({ id, addItem: async (iid) => added.push([id, iid]), removeItem: async () => { throw new Error('must not remove'); } }) };
    const item = { id: 7, getCollections: () => [1] };
    const res = await r.addItemsToCollections([{ itemId: 7, collections: [{ id: '1' }, { id: '2' }, { id: '3' }] }], new Map([[7, item]]));
    expect(tx).toBe(1);
    expect(added).toEqual([[2, 7], [3, 7]]);
    expect(res).toEqual({ added: 2, removed: 0, collections: 2 });
  });
});

describe('excluded collections', () => {
  const colRows = [{ cid: 1, name: 'Fuels' }, { cid: 2, name: 'AI Inbox' }];
  const data = (sql) => {
    if (/FROM collections/.test(sql)) return colRows;
    if (/FROM collectionItems ci/.test(sql)) return [{ cid: 1, iid: 10 }, { cid: 2, iid: 10 }, { cid: 2, iid: 11 }];
    if (/FROM itemData/.test(sql)) return [{ iid: 10, field: 'title', value: 'fuel loads' }, { iid: 11, field: 'title', value: 'unsorted thing' }];
    return [];
  };

  test('default pref excludes inbox-style collections by name', () => {
    const r = loadRouter(data);
    expect(r.getExcludedNames()).toEqual(['inbox']);
    expect(r.isExcludedName('AI Inbox')).toBe(true);
    expect(r.isExcludedName('Fuels')).toBe(false);
  });

  test('excluded memberships are not used as evidence, items only there are dropped', async () => {
    const r = loadRouter(data);
    const d = await r.loadLocalRankData();
    expect(d.items.map(i => i.id)).toEqual([10]);
    expect(d.items[0].collectionIds).toEqual([1]);
  });

  test('zeroExcludedCollections clears their confidence in any mode', () => {
    const r = loadRouter(data);
    const trees = [{ id: 2, name: 'AI Inbox', confidence: 1, children: [{ id: 3, name: 'Old inbox 2', confidence: 0.9, children: [] }] }, { id: 1, name: 'Fuels', confidence: 0.5, children: [] }];
    r.zeroExcludedCollections(trees);
    expect(trees[0].confidence).toBe(0);
    expect(trees[0].children[0].confidence).toBe(0);
    expect(trees[1].confidence).toBe(0.5);
  });

  test('empty pref ignores nothing', () => {
    const r = loadRouter(data);
    r.__zotero.Prefs.get = () => '';
    expect(r.getExcludedNames()).toEqual([]);
  });
});

describe('inbox move and undo', () => {
  function setup() {
    const r = loadRouter(() => []);
    const calls = [];
    r.__zotero.DB.executeTransaction = async (fn) => { await fn(); };
    r.__zotero.Collections = { getAsync: async (id) => ({ id, addItem: async (iid) => calls.push(['add', id, iid]), removeItem: async (iid) => calls.push(['remove', id, iid]) }) };
    const prefs = {};
    r.__zotero.Prefs = { get: (k) => prefs[k] ?? null, set: (k, v) => { prefs[k] = v; } };
    r.showNotification = () => {};
    return { r, calls };
  }

  test('removes inbox membership only for papers that got filed', async () => {
    const { r, calls } = setup();
    const a = { id: 1, getCollections: () => [9] };
    const b = { id: 2, getCollections: () => [9] };
    const res = await r.addItemsToCollections([
      { itemId: 1, collections: [{ id: '5' }], removeFrom: [9] },
      { itemId: 2, collections: [], removeFrom: [9] }
    ], new Map([[1, a], [2, b]]));
    expect(calls).toEqual([['add', 5, 1], ['remove', 9, 1]]);
    expect(res).toEqual({ added: 1, removed: 1, collections: 1 });
  });

  test('undo reverses adds and removals, then clears itself', async () => {
    const { r, calls } = setup();
    const a = { id: 1, getCollections: () => [9] };
    await r.addItemsToCollections([{ itemId: 1, collections: [{ id: '5' }], removeFrom: [9] }], new Map([[1, a]]));
    calls.length = 0;
    const res = await r.undoLastFiling();
    expect(res.undone).toBe(2);
    expect(calls).toEqual([['remove', 5, 1], ['add', 9, 1]]);
    expect(r.getLastFiling()).toBeNull();
    expect((await r.undoLastFiling()).undone).toBe(0);
  });

  test('last filing survives a restart via the pref', async () => {
    const { r } = setup();
    await r.addItemsToCollections([{ itemId: 1, collections: [{ id: '5' }] }], new Map([[1, { id: 1, getCollections: () => [] }]]));
    r.lastFiling = null;   // simulate fresh session
    expect(r.getLastFiling().added).toEqual([[1, 5]]);
  });
});
