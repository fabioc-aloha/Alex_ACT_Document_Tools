'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');
const skillNames = [
  'docx-to-md',
  'html-to-md',
  'md-to-eml',
  'md-to-html',
  'md-to-txt',
  'md-to-word',
];
const sharedRuntime = [
  'data-uri.cjs',
  'markdown-preprocessor.cjs',
  'mermaid-pipeline.cjs',
  'tool-runner.cjs',
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

test('plugin manifest exposes one document conversion bundle', () => {
  const plugin = readJson('plugin.json');
  assert.equal(plugin.name, 'alex-act-document-tools');
  assert.equal(plugin.version, '1.0.0');
  assert.equal(plugin.skills, '.github/skills');
  assert.equal(plugin.commands, '.github/prompts');
});

test('source inventory and repository documentation are complete', () => {
  const manifest = readJson('manifest.json');
  assert.equal(manifest.plugin, 'alex-act-document-tools');
  assert.equal(manifest.version, '1.0.0');
  assert.deepEqual(manifest.assets.skills.map((entry) => entry.name), skillNames);
  assert.deepEqual(manifest.assets.prompts.map((entry) => entry.name), ['convert']);
  assert.deepEqual(manifest.assets.shared_runtime.map((entry) => entry.name), sharedRuntime);
  assert.deepEqual(manifest.distribution.mall_includes, [
    {
      source: '.github/scripts/shared',
      target: 'scripts/shared',
    },
  ]);

  for (const relativePath of [
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
    '.github/copilot-instructions.md',
  ]) {
    assert(fs.existsSync(path.join(repoRoot, relativePath)), `missing ${relativePath}`);
  }
});

test('all six converter skills and the shared runtime are present', () => {
  for (const name of skillNames) {
    assert(fs.existsSync(path.join(repoRoot, '.github', 'skills', name, 'SKILL.md')),
      `missing ${name}/SKILL.md`);
    assert(fs.existsSync(path.join(repoRoot, '.github', 'skills', name, 'scripts', `${name}.cjs`)),
      `missing ${name} runtime`);
  }
  for (const file of sharedRuntime) {
    assert(fs.existsSync(path.join(repoRoot, '.github', 'scripts', 'shared', file)),
      `missing shared runtime ${file}`);
  }
  assert(fs.existsSync(path.join(repoRoot, '.github', 'prompts', 'convert.prompt.md')),
    'missing /convert prompt');
});

test('component roots contain no editorial README files', () => {
  for (const relativePath of ['.github/skills/README.md', '.github/prompts/README.md']) {
    assert(!fs.existsSync(path.join(repoRoot, relativePath)),
      `${relativePath} would be reified as a phantom component`);
  }
});

test('component documentation has no broken local links', () => {
  const broken = [];
  for (const name of skillNames) {
    const skillPath = path.join(repoRoot, '.github', 'skills', name, 'SKILL.md');
    const markdown = fs.readFileSync(skillPath, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const raw = match[1].trim().replace(/^<|>$/g, '');
      if (!raw || /^(https?:|mailto:|#)/i.test(raw) || raw.includes('<')) continue;
      const target = raw.split('#')[0].split('?')[0];
      const absolute = path.resolve(path.dirname(skillPath), target);
      if (!fs.existsSync(absolute)) broken.push(`${name} -> ${raw}`);
    }
  }
  assert.deepEqual(broken, []);
});

test('installable source stays below the Windows payload ceiling', () => {
  const roots = ['plugin.json', '.github/skills', '.github/prompts', '.github/scripts'];
  const files = [];
  function collect(current) {
    const stat = fs.statSync(current);
    if (stat.isFile()) {
      files.push(current);
      return;
    }
    for (const entry of fs.readdirSync(current)) collect(path.join(current, entry));
  }
  for (const root of roots) collect(path.join(repoRoot, root));
  assert(files.length <= 100, `${files.length} installable files exceed the 100-file ceiling`);
  assert.equal(files.length, 18, 'unexpected installable source file count');
});

for (const name of skillNames) {
  test(`${name} reaches usage without a pre-parser crash`, () => {
    const script = path.join(repoRoot, '.github', 'skills', name, 'scripts', `${name}.cjs`);
    const result = spawnSync(process.execPath, [script], {
      cwd: repoRoot,
      encoding: 'utf8',
      timeout: 10000,
    });
    const output = `${result.stdout || ''}\n${result.stderr || ''}`;

    assert.equal(result.error, undefined, result.error && result.error.message);
    assert.match(output, /Usage:/i, output);
    assert.doesNotMatch(output, /Cannot find module|MODULE_NOT_FOUND|\[FATAL\]/i, output);
    assert.equal(result.status, 1, `expected no-argument usage exit 1, got ${result.status}`);
  });
}

test('html-to-md converts a real import fixture with semantic content intact', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'document-tools-import-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'sample.html');
  const output = path.join(directory, 'sample.md');
  fs.writeFileSync(source,
    '<!doctype html><html><body><h1>Parity Fixture</h1>'
      + '<p>Alpha <strong>bold</strong>.</p><ul><li>One</li><li>Two</li></ul>'
      + '</body></html>');

  const script = path.join(
    repoRoot, '.github', 'skills', 'html-to-md', 'scripts', 'html-to-md.cjs');
  const result = spawnSync(process.execPath, [
    script, source, output, '--wrap', '0', '--no-extract-images',
  ], { cwd: repoRoot, encoding: 'utf8', timeout: 120000 });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const converted = fs.readFileSync(output, 'utf8');
  assert.match(converted, /# Parity Fixture/);
  assert.match(converted, /Alpha \*\*bold\*\*/);
  assert.match(converted, /One/);
  assert.match(converted, /Two/);
});

test('md-to-txt converts a real export fixture with semantic content intact', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'document-tools-export-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'sample.md');
  const output = path.join(directory, 'sample.txt');
  fs.writeFileSync(source, '# Parity Fixture\n\nAlpha **bold**.\n\n- One\n- Two\n');

  const script = path.join(
    repoRoot, '.github', 'skills', 'md-to-txt', 'scripts', 'md-to-txt.cjs');
  const result = spawnSync(process.execPath, [
    script, source, output, '--wrap', '0',
  ], { cwd: repoRoot, encoding: 'utf8', timeout: 120000 });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const converted = fs.readFileSync(output, 'utf8');
  assert.match(converted, /Parity Fixture/);
  assert.match(converted, /Alpha bold\./);
  assert.match(converted, /One/);
  assert.match(converted, /Two/);
});
