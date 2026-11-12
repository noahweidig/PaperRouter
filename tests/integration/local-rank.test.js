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
