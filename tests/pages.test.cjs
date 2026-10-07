// Run with: node --test tests/pages.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '../instaQ.html'), 'utf8');
const helpers = app.slice(app.indexOf("const LS_PREFIX="), app.indexOf('const MAXQ='));
function storage(entries = [], blocked = false) {
  const data = new Map(entries);
  const context = vm.createContext({ localStorage: {
    getItem(key) { if (blocked) throw new Error('Storage blocked'); return data.get(key) ?? null; },
    setItem(key, value) { if (blocked) throw new Error('Storage blocked'); data.set(key, String(value)); },
    removeItem(key) { if (blocked) throw new Error('Storage blocked'); data.delete(key); }
  }});
  vm.runInContext(helpers + '\nglobalThis.storageAPI = {lsGet, lsSet, lsDel};', context);
  return { data, api: context.storageAPI };
}

test('queue reads, writes and deletion leave other apps and legacy keys intact', () => {
  const { data, api } = storage([['queue', 'other app'], ['other:queue', 'keep']]);
  assert.equal(api.lsGet('queue'), null);
  api.lsSet('queue', '[{"seen":true}]');
  assert.equal(api.lsGet('queue'), '[{"seen":true}]');
  api.lsDel('queue');
  assert.equal(api.lsGet('queue'), null);
  assert.deepEqual([...data], [['queue', 'other app'], ['other:queue', 'keep']]);
});

test('all stored settings and dynamic room cache keys use the namespace', () => {
  const keys = [...app.matchAll(/ls(?:Get|Set|Del)\('([^']+)'/g)].map(match => match[1]);
  const { data, api } = storage();
  for (const key of new Set([...keys, 'room_example'])) {
    api.lsSet(key, 7);
    assert.equal(data.get('instaq:' + key), '7');
    assert.equal(data.has(key), false);
  }
  const restored = storage([...data]);
  assert.equal(restored.api.lsGet('room_example'), '7');
});

test('denied browser storage does not crash the app', () => {
  const { api } = storage([], true);
  assert.equal(api.lsGet('queue'), null);
  assert.doesNotThrow(() => api.lsSet('queue', '[]'));
  assert.doesNotThrow(() => api.lsDel('queue'));
});

test('app storage access stays inside the three namespaced helpers', () => {
  assert.equal((app.match(/localStorage\./g) || []).length, 3);
  assert.equal((helpers.match(/localStorage\./g) || []).length, 3);
});

test('short Pages URL preserves channel query and fragment', () => {
  const index = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const script = index.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const [search, hash] of [['', ''], ['?c=example', '#player'], ['?c=%D8%AA%D8%B3%D8%AA', '']]) {
    let target;
    vm.runInNewContext(script, { location: { search, hash, replace(value) { target = value; } } });
    assert.equal(target, 'instaQ.html' + search + hash);
  }
});

test('application JavaScript parses', () => {
  const script = app.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new vm.Script(script));
});


test('Data Saver keeps a five-item forward window and persists its toggle', () => {
  assert.match(app, /const DATA_WINDOW=5/);
  assert.match(app, /const dataAnchor=\(\)=>cur<0\?0:cur/);
  assert.match(app, /i>=dataAnchor\(\)&&i<dataAnchor\(\)\+DATA_WINDOW/);
  assert.match(app, /lsSet\('data_saver',dataSaver\?'1':'0'\)/);
});

test('Data Saver gates resolver and thumbnail work and cancels work outside the window', () => {
  assert.match(app, /it\.t!=='story'&&inDataWindow\(Q\.indexOf\(it\)\)/);
  assert.match(app, /!inDataWindow\(i\)\|\|it\.st!=='ok'/);
  assert.match(app, /if\(it\.ac\)it\.ac\.abort\(\)/);
  assert.match(app, /if\(sig\.aborted\)\{if\(it\.ac===ac\)it\.ac=null;return\}/);
});

test('moving the current item refreshes the Data Saver window before rendering', () => {
  assert.match(app, /cur=i;syncDataWindow\(\);render\(\)/);
});
