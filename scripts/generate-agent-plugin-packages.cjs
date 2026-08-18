#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const packagesRoot = path.join(root, 'packages');
const legacyManifestPath = path.join(root, 'plugin.json');
const licensePath = path.join(root, 'LICENSE');
const skillsSourceRoot = path.join(root, '.github', 'skills');
const sharedSourceRoot = path.join(root, '.github', 'scripts', 'shared');

const args = new Set(process.argv.slice(2));
if ([...args].some((argument) => argument !== '--write' && argument !== '--check')) {
    throw new Error('Usage: node scripts/generate-agent-plugin-packages.cjs [--write|--check]');
}
if (args.has('--write') && args.has('--check')) {
    throw new Error('--write and --check cannot be combined');
}
const mode = args.has('--write') ? 'write' : 'check';

function read(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function stableJson(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}

function listFiles(directory, prefix = '') {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true })
        .flatMap((entry) => {
            const relative = path.posix.join(prefix, entry.name);
            if (entry.isDirectory()) return listFiles(path.join(directory, entry.name), relative);
            return [relative];
        })
        .sort();
}

// Every skill's own scripts resolve scripts/shared/ via a fixed ../../../
// relative depth from `<root>/skills/<name>/scripts/`. Both the legacy
// `.github/skills/` layout and the portable/copilot `skills/` layout put the
// script at the same depth from their respective package root, so the
// require paths inside each .cjs file remain valid unmodified.
const skillNames = fs.readdirSync(skillsSourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

const legacy = JSON.parse(read(legacyManifestPath));
const license = read(licensePath);

const promptToCommand = new Map([
    ['convert', path.join(root, '.github', 'prompts', 'convert.prompt.md')],
    ['rich-email', path.join(root, '.github', 'prompts', 'rich-email.prompt.md')],
]);

// The legacy `.github/skills/<format>/...` example paths are correct guidance
// for the historical Copilot-plugin layout, where `plugin.json` declares
// `skills: ".github/skills"`. Both new packages declare root `skills/`
// instead, so the two command bodies are the only content that needs the
// prefix rewritten to stay accurate for the new package roots.
function commandBody(sourcePath) {
    return read(sourcePath).replaceAll('.github/skills/', 'skills/');
}

const portableManifest = {
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
    name: 'alex-act-document-tools-portable',
    version: '0.1.0',
    description: 'Portable Agent Plugins package for the Alex ACT Document Tools conversion skills.',
    author: legacy.author,
    homepage: legacy.homepage,
    repository: legacy.repository.url,
    license: legacy.license,
    keywords: legacy.keywords,
};
const copilotManifest = {
    name: legacy.name,
    version: legacy.version,
    description: legacy.description,
    author: legacy.author,
    homepage: legacy.homepage,
    repository: legacy.repository.url,
    license: legacy.license,
    keywords: legacy.keywords,
    category: legacy.category,
    skills: 'skills/',
    commands: 'commands/',
};

const expected = new Map();
expected.set('portable/LICENSE', license);
expected.set('portable/plugin.json', stableJson(portableManifest));
expected.set('copilot/LICENSE', license);
expected.set('copilot/plugin.json', stableJson(copilotManifest));

for (const name of skillNames) {
    for (const relativeFile of listFiles(path.join(skillsSourceRoot, name))) {
        const content = fs.readFileSync(path.join(skillsSourceRoot, name, relativeFile));
        expected.set(`portable/skills/${name}/${relativeFile}`, content);
        expected.set(`copilot/skills/${name}/${relativeFile}`, content);
    }
}

for (const relativeFile of listFiles(sharedSourceRoot)) {
    const content = fs.readFileSync(path.join(sharedSourceRoot, relativeFile));
    expected.set(`portable/scripts/shared/${relativeFile}`, content);
    expected.set(`copilot/scripts/shared/${relativeFile}`, content);
}

for (const [name, sourcePath] of promptToCommand) {
    expected.set(`copilot/commands/${name}.md`, commandBody(sourcePath));
}

if (mode === 'write') {
    fs.rmSync(packagesRoot, { recursive: true, force: true });
    for (const [relativePath, content] of expected) {
        const destination = path.join(packagesRoot, ...relativePath.split('/'));
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.writeFileSync(destination, content);
    }
    process.stdout.write(`Generated ${expected.size} package files.\n`);
    process.exit(0);
}

const drift = [];
for (const [relativePath, content] of expected) {
    const destination = path.join(packagesRoot, ...relativePath.split('/'));
    if (!fs.existsSync(destination)) {
        drift.push(`Missing ${relativePath}`);
        continue;
    }
    const actual = fs.readFileSync(destination);
    const expectedBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    if (!actual.equals(expectedBuffer)) drift.push(`Drifted ${relativePath}`);
}
const actualFiles = listFiles(packagesRoot);
const expectedFiles = [...expected.keys()].sort();
for (const relativePath of actualFiles) {
    if (!expected.has(relativePath)) drift.push(`Unexpected ${relativePath}`);
}
for (const relativePath of expectedFiles) {
    if (!actualFiles.includes(relativePath)) drift.push(`Missing ${relativePath}`);
}

if (drift.length) {
    process.stderr.write(`agent-plugin-packages: ${drift.join('; ')}\n`);
    process.exit(1);
}

process.stdout.write(`Agent Plugin package outputs are current (${expected.size} files).\n`);
