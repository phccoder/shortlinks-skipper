const test = require('node:test');
const assert = require('node:assert');
const U = require('../utils.js');

test('htmlDecode decodes entities', () => {
  assert.strictEqual(U.htmlDecode('a &amp; b &#39;c&#39;'), "a & b 'c'");
  assert.strictEqual(U.htmlDecode('&quot;x&quot; &lt;y&gt;'), '"x" <y>');
  assert.strictEqual(U.htmlDecode(''), '');
  assert.strictEqual(U.htmlDecode(null), '');
});

test('parseOnclick extracts window.open url', () => {
  assert.strictEqual(U.parseOnclick("window.open('https://x.com/a','_blank')"), 'https://x.com/a');
  assert.strictEqual(U.parseOnclick('window.open("https://x.com/a")'), 'https://x.com/a');
});

test('parseOnclick extracts location.href', () => {
  assert.strictEqual(U.parseOnclick('location.href="https://x.com/b"'), 'https://x.com/b');
  assert.strictEqual(U.parseOnclick("location.href='https://x.com/b'"), 'https://x.com/b');
});

test('parseOnclick extracts location.replace', () => {
  assert.strictEqual(U.parseOnclick("location.replace('https://x.com/c')"), 'https://x.com/c');
});

test('parseOnclick falls back to a bare url', () => {
  assert.strictEqual(U.parseOnclick("go('https://x.com/d')"), 'https://x.com/d');
});

test('parseOnclick handles html-encoded handlers', () => {
  assert.strictEqual(
    U.parseOnclick('window.open(&#39;https://x.com/e&#39;)'),
    'https://x.com/e'
  );
});

test('parseOnclick returns empty for no url', () => {
  assert.strictEqual(U.parseOnclick('doSomething()'), '');
  assert.strictEqual(U.parseOnclick(''), '');
});

test('parseHref only accepts absolute http(s)', () => {
  assert.strictEqual(U.parseHref('https://x.com/e'), 'https://x.com/e');
  assert.strictEqual(U.parseHref('#'), '');
  assert.strictEqual(U.parseHref('/relative'), '');
  assert.strictEqual(U.parseHref(''), '');
});

test('matchDomain matches exact and subdomains', () => {
  assert.ok(U.matchDomain('example.com', ['example.com']));
  assert.ok(U.matchDomain('sub.example.com', ['example.com']));
  assert.ok(!U.matchDomain('notexample.com', ['example.com']));
  assert.ok(!U.matchDomain('example.org', ['example.com']));
});

test('domainAllowed honors enabled/blacklist/whitelist', () => {
  assert.strictEqual(U.domainAllowed({ enabled: false }, 'a.com'), false);
  assert.strictEqual(U.domainAllowed({ enabled: true, blacklist: ['a.com'] }, 'a.com'), false);
  assert.strictEqual(U.domainAllowed({ enabled: true, whitelist: ['a.com'] }, 'b.com'), false);
  assert.strictEqual(U.domainAllowed({ enabled: true, whitelist: ['a.com'] }, 'a.com'), true);
  assert.strictEqual(U.domainAllowed({ enabled: true }, 'anything.com'), true);
});

test('scoreGetLink ranks Get Link above generic controls', () => {
  assert.strictEqual(U.scoreGetLink('Get Link', ''), 3);
  assert.strictEqual(U.scoreGetLink('', 'go-link'), 3);
  assert.strictEqual(U.scoreGetLink('Continue', ''), 2);
  assert.strictEqual(U.scoreGetLink('Click here', ''), 1);
  assert.strictEqual(U.scoreGetLink('Home', ''), 0);
});
