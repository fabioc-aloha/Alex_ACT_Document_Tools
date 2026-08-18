#!/usr/bin/env node

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync, execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const generator = path.join(__dirname, 'generate-agent-plugin-packages.cjs');
const portableRoot = path.join(root, 'packages', 'portable');
const copilotRoot = path.join(root, 'packages', 'copilot');

const skillNames = [
    'docx-to-md', 'html-to-md', 'md-to-eml', 'md-to-html', 'md-to-txt', 'md-to-word', 'rich-email',
];

function sha256(filePath) {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

test('generator is deterministic and drift-free against committed packages', () => {
    const checked = spawnSync(process.execPath, [generator, '--check'], { cwd: root, encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
});

test('portable package is a strict Agent Plugins manifest with no client-specific components', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(portableRoot, 'plugin.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest).sort(), [
        '$schema', 'author', 'description', 'homepage', 'keywords', 'license', 'name', 'repository', 'version',
    ]);
    assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
    assert.equal(manifest.name, 'alex-act-document-tools-portable');
    assert.equal(fs.existsSync(path.join(portableRoot, 'commands')), false);
    assert.equal(fs.existsSync(path.join(portableRoot, 'mcp.json')), false);
});

test('copilot package retains legacy plugin identity and both commands', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(copilotRoot, 'plugin.json'), 'utf8'));
    assert.equal('$schema' in manifest, false);
    assert.equal(manifest.name, 'alex-act-document-tools');
    assert.equal(manifest.skills, 'skills/');
    assert.equal(manifest.commands, 'commands/');
    assert.equal(fs.existsSync(path.join(copilotRoot, 'mcp.json')), false);

    for (const [name, mustMatch] of [
        ['convert', /skills\/<format>\/scripts\/<format>\.cjs/],
        ['rich-email', /skills\/rich-email\/SKILL\.md/],
    ]) {
        const command = fs.readFileSync(path.join(copilotRoot, 'commands', `${name}.md`), 'utf8');
        assert.match(command, /^---\r?\ndescription:/);
        assert.match(command, mustMatch);
        assert.doesNotMatch(command, /\.github\/skills\//);
    }
});

test('both packages carry all seven skills with byte-identical bodies and stay inside their root', () => {
    for (const packageRoot of [portableRoot, copilotRoot]) {
        for (const name of skillNames) {
            const sourceSkill = path.join(root, '.github', 'skills', name, 'SKILL.md');
            const packagedSkill = path.join(packageRoot, 'skills', name, 'SKILL.md');
            assert.equal(fs.existsSync(packagedSkill), true, `${packageRoot}: missing ${name}/SKILL.md`);
            assert.equal(sha256(packagedSkill), sha256(sourceSkill), `${packageRoot}: ${name} body drifted`);
        }
        for (const relativeFile of [
            'skills/md-to-word/references/version-history-and-acceptance.md',
            'skills/rich-email/assets/rich-email-template.md',
            'skills/rich-email/references/style-guide.md',
            'scripts/shared/tool-runner.cjs',
            'scripts/shared/markdown-preprocessor.cjs',
            'scripts/shared/mermaid-pipeline.cjs',
        ]) {
            const resolved = path.resolve(packageRoot, relativeFile);
            assert.equal(resolved.startsWith(packageRoot + path.sep), true, `${relativeFile} escapes package root`);
            assert.equal(fs.existsSync(resolved), true, `${packageRoot}: missing ${relativeFile}`);
        }
    }
});

test('an isolated portable package resolves shared runtime and converts a real fixture', () => {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'doctools-portable-'));
    try {
        fs.cpSync(portableRoot, target, { recursive: true });
        const script = path.join(target, 'skills', 'md-to-txt', 'scripts', 'md-to-txt.cjs');
        const source = path.join(target, 'sample.md');
        const output = path.join(target, 'sample.txt');
        fs.writeFileSync(source, '# Heading\n\nBody text.\n');
        execFileSync(process.execPath, [script, source, output], { cwd: target, encoding: 'utf8' });
        assert.equal(fs.existsSync(output), true);
        assert.match(fs.readFileSync(output, 'utf8'), /Heading/);
    } finally {
        fs.rmSync(target, { recursive: true, force: true });
    }
});

test('an isolated copilot package resolves shared runtime identically to the portable package', () => {
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'doctools-copilot-'));
    try {
        fs.cpSync(copilotRoot, target, { recursive: true });
        const script = path.join(target, 'skills', 'md-to-txt', 'scripts', 'md-to-txt.cjs');
        const source = path.join(target, 'sample.md');
        const output = path.join(target, 'sample.txt');
        fs.writeFileSync(source, '# Heading\n\nBody text.\n');
        execFileSync(process.execPath, [script, source, output], { cwd: target, encoding: 'utf8' });
        assert.equal(fs.existsSync(output), true);
        assert.match(fs.readFileSync(output, 'utf8'), /Heading/);
    } finally {
        fs.rmSync(target, { recursive: true, force: true });
    }
});

test('generator write mode reproduces byte-identical output on a second run', () => {
    const before = new Map();
    for (const packageRoot of [portableRoot, copilotRoot]) {
        for (const relativeFile of walk(packageRoot)) before.set(relativeFile, sha256(relativeFile));
    }
    execFileSync(process.execPath, [generator, '--write'], { cwd: root, encoding: 'utf8' });
    for (const [relativeFile, hash] of before) assert.equal(sha256(relativeFile), hash, relativeFile);
});

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(directory, entry.name);
        return entry.isDirectory() ? walk(full) : [full];
    });
}
