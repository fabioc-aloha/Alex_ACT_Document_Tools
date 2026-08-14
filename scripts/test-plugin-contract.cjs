'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');
const preprocessor = require('../.github/scripts/shared/markdown-preprocessor.cjs');

const repoRoot = path.resolve(__dirname, '..');
const skillNames = [
  'docx-to-md',
  'html-to-md',
  'md-to-eml',
  'md-to-html',
  'md-to-txt',
  'md-to-word',
];
const allSkillNames = [...skillNames, 'rich-email'];
const sharedRuntime = [
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
  assert.equal(plugin.version, '1.1.0');
  assert.equal(plugin.skills, '.github/skills');
  assert.equal(plugin.commands, '.github/prompts');
});

test('source inventory and repository documentation are complete', () => {
  const manifest = readJson('manifest.json');
  assert.equal(manifest.plugin, 'alex-act-document-tools');
  assert.equal(manifest.version, '1.1.0');
  assert.equal(readJson('package.json').version, '1.1.0');
  assert.equal(manifest.status, 'released');
  assert.equal(manifest.distribution.status, 'published');
  assert.equal(manifest.distribution.published_version, '1.1.0');
  assert.match(fs.readFileSync(path.join(repoRoot, 'CHANGELOG.md'), 'utf8'),
    /## \[1\.1\.0\] - 2026-08-14/);
  assert.match(fs.readFileSync(path.join(repoRoot, 'README.md'), 'utf8'),
    /Latest published release: `v1\.1\.0`/);
  assert.deepEqual(manifest.assets.skills.map((entry) => entry.name), allSkillNames);
  assert.deepEqual(manifest.assets.prompts.map((entry) => entry.name), ['convert', 'rich-email']);
  assert.deepEqual(manifest.assets.shared_runtime.map((entry) => entry.name), sharedRuntime);
  assert.equal(manifest.distribution.payload_surface, 'repository-at-release-tag');

  for (const relativePath of [
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
    '.github/copilot-instructions.md',
    '.github/workflows/test.yml',
  ]) {
    assert(fs.existsSync(path.join(repoRoot, relativePath)), `missing ${relativePath}`);
  }

  const workflow = fs.readFileSync(path.join(repoRoot, '.github/workflows/test.yml'), 'utf8');
  assert.match(workflow, /apt-get install --yes pandoc/);
});

test('all seven document skills and the shared runtime are present', () => {
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
  assert(fs.existsSync(path.join(repoRoot, '.github', 'prompts', 'rich-email.prompt.md')),
    'missing /rich-email prompt');
  assert(fs.existsSync(path.join(repoRoot, '.github', 'skills', 'rich-email', 'SKILL.md')),
    'missing rich-email skill');
  assert(fs.existsSync(path.join(repoRoot, '.github', 'skills', 'rich-email', 'scripts', 'open-rich-outlook-draft.cjs')),
    'missing rich-email Outlook helper');
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
});

test('isolated origin-delivery copy resolves every converter runtime', (t) => {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), 'document-tools-package-'));
  t.after(() => fs.rmSync(target, { recursive: true, force: true }));
  fs.copyFileSync(path.join(repoRoot, 'plugin.json'), path.join(target, 'plugin.json'));
  fs.cpSync(path.join(repoRoot, '.github'), path.join(target, '.github'), { recursive: true });
  for (const name of skillNames) {
    const script = path.join(target, '.github', 'skills', name, 'scripts', `${name}.cjs`);
    const result = spawnSync(process.execPath, [script], {
      cwd: target, encoding: 'utf8', timeout: 10000,
    });
    assert.equal(result.status, 1, `${name}: ${result.stdout}\n${result.stderr}`);
    assert.match(`${result.stdout}\n${result.stderr}`, /Usage:/i);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /MODULE_NOT_FOUND|Cannot find module/);
  }
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

test('all preprocessing paths preserve shorter fences inside long fences', () => {
  const source = '````markdown\n```\nconst value = "inside — fence";\n````\n\nOutside — prose.\n';
  const converted = preprocessor.preprocessMarkdown(source, { format: 'txt' });
  assert.match(converted, /inside — fence/);
  assert.match(converted, /Outside, prose\./);
  const transformed = preprocessor.applyOutsideFences(source,
    (line) => line.replace('Outside', 'Changed'));
  assert.match(transformed, /inside — fence/);
  assert.match(transformed, /Changed — prose/);
  const formatted = preprocessor.formatMarkdown(source);
  assert.match(formatted, /inside — fence/);
});

test('md-to-html rejects executable raw HTML before writing output', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'document-tools-html-safety-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const script = path.join(repoRoot, '.github', 'skills', 'md-to-html', 'scripts', 'md-to-html.cjs');
  const cases = [
    '<script>globalThis.auditMarker=1;</script>',
    '<a href=javascript:alert(1)>unsafe</a>',
    '<img src="vbscript:msgbox(1)">',
    '<iframe src=data:text/html,<script>alert(1)</script>>',
    '<button onclick=alert(1)>unsafe</button>',
    '<a href="javascript&#58;alert(1)">unsafe</a>',
    '<a href="java&#x73;cript&colon;alert(1)">unsafe</a>',
    '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>',
    '<form action="java&#x73;cript&#58;alert(1)"><button>unsafe</button></form>',
    '<button formaction=javascript:alert(1)>unsafe</button>',
    '<a xlink:href="javascript:alert(1)">unsafe</a>',
  ];
  for (const [index, markup] of cases.entries()) {
    const source = path.join(directory, `unsafe-${index}.md`);
    const output = path.join(directory, `unsafe-${index}.html`);
    fs.writeFileSync(source, `# Unsafe\n\n${markup}\n`);
    const result = spawnSync(process.execPath, [script, source, output], {
      cwd: repoRoot, encoding: 'utf8', timeout: 120000,
    });
    assert.notEqual(result.status, 0, markup);
    assert.match(`${result.stdout}\n${result.stderr}`, /unsafe|executable|script/i);
    assert.equal(fs.existsSync(output), false);
  }
});

test('md-to-eml rejects missing production headers before writing output', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'document-tools-email-headers-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'message.md');
  const output = path.join(directory, 'message.eml');
  fs.writeFileSync(source, '# Message\n\nBody\n');
  const script = path.join(repoRoot, '.github', 'skills', 'md-to-eml', 'scripts', 'md-to-eml.cjs');
  const result = spawnSync(process.execPath, [script, source, output], {
    cwd: repoRoot, encoding: 'utf8', timeout: 120000,
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /from|to|subject/i);
  assert.equal(fs.existsSync(output), false);
});

test('html-to-md rejects unknown download-images option', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'document-tools-html-options-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'source.html');
  const output = path.join(directory, 'source.md');
  fs.writeFileSync(source, '<h1>Source</h1>');
  const script = path.join(repoRoot, '.github', 'skills', 'html-to-md', 'scripts', 'html-to-md.cjs');
  const result = spawnSync(process.execPath, [script, source, output, '--download-images'], {
    cwd: repoRoot, encoding: 'utf8', timeout: 120000,
  });
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /unknown option/i);
});

test('md-to-word dry-run leaves the source directory unchanged', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'document-tools-word-dry-run-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'source.md');
  fs.writeFileSync(source, '# Dry Run\n');
  const before = fs.readdirSync(directory).sort();
  const script = path.join(repoRoot, '.github', 'skills', 'md-to-word', 'scripts', 'md-to-word.cjs');
  const result = spawnSync(process.execPath, [script, source, '--dry-run'], {
    cwd: repoRoot, encoding: 'utf8', timeout: 120000,
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.deepEqual(fs.readdirSync(directory).sort(), before);
});

test('Word runtime implements page sizes and preserves reference templates', () => {
  const source = fs.readFileSync(path.join(
    repoRoot, '.github', 'skills', 'md-to-word', 'scripts', 'md-to-word.cjs'), 'utf8');
  assert.match(source, /PAGE_SIZES/);
  assert.match(source, /applyPageSize/);
  assert.match(source, /preserveReference/);
  assert.doesNotMatch(source, /runTool\('npx'/);
});

test('shared render paths never acquire packages through npx', () => {
  const files = [
    '.github/scripts/shared/mermaid-pipeline.cjs',
    '.github/skills/md-to-word/scripts/md-to-word.cjs',
  ];
  for (const relativePath of files) {
    assert.doesNotMatch(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'),
      /runTool\('npx'/, relativePath);
  }
});
