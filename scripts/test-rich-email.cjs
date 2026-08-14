'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { buildOutlookDraftEml, parseEml } = require('../.github/skills/rich-email/scripts/open-rich-outlook-draft.cjs');

const html = '<!DOCTYPE html><html><body><h1>Project update</h1><p>Ready.</p></body></html>';
const headers = [
    'From: fabio@example.com',
    'To: claudia@example.com, fabio@example.com',
    'Subject: Rich project update',
    'Date: Tue, 11 Aug 2026 13:38:43 GMT',
    'Message-ID: <rich-email-test@example.com>',
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
];
const eml = [...headers, '', Buffer.from(html, 'utf8').toString('base64')].join('\r\n');

test('parses recipients, subject, and HTML', () => {
    assert.deepEqual(parseEml(eml).to, ['claudia@example.com', 'fabio@example.com']);
    assert.equal(parseEml(eml).subject, 'Rich project update');
    assert.equal(parseEml(eml).html, html);
});

test('builds an unsent draft with the signature spacer and preserved headers', () => {
    const draft = buildOutlookDraftEml(eml);
    assert.match(draft, /^X-Unsent: 1\r?$/m);
    assert.match(parseEml(draft).html, /<body><div data-rich-email-spacer="true"[^>]*><br><br><\/div><h1>/);
    assert.match(draft, /To: claudia@example\.com, fabio@example\.com/);
    assert.match(draft, /Subject: Rich project update/);
});

test('is safe to re-apply', () => {
    const draft = buildOutlookDraftEml(buildOutlookDraftEml(eml));
    assert.equal((draft.match(/^X-Unsent: 1\r?$/gm) || []).length, 1);
    assert.equal((parseEml(draft).html.match(/data-rich-email-spacer/g) || []).length, 1);
});

test('forces an existing sent marker back to unsent', () => {
    const sent = eml.replace('Subject: Rich project update',
        'X-Unsent: 0\r\nSubject: Rich project update');
    const draft = buildOutlookDraftEml(sent);
    assert.equal((draft.match(/^X-Unsent: 1\r?$/gm) || []).length, 1);
    assert.doesNotMatch(draft, /^X-Unsent: 0\r?$/m);
});

test('rejects quoted recipients', () => {
    const quoted = eml.replace('To: claudia@example.com, fabio@example.com', 'To: "claudia@example.com, fabio@example.com"');
    assert.throws(() => buildOutlookDraftEml(quoted), /bare address|unquoted/i);
});

test('rejects multipart output before creating a draft', () => {
    const multipart = [
        'From: fabio@example.com',
        'To: claudia@example.com',
        'Subject: Multipart',
        'Content-Type: multipart/related; boundary="mail-boundary"',
        '',
        '--mail-boundary',
        'Content-Type: text/html; charset=UTF-8',
        '',
        html,
        '--mail-boundary--',
    ].join('\r\n');
    assert.throws(() => buildOutlookDraftEml(multipart), /multipart/i);
});

test('does not write an output file in validation-only mode', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rich-email-test-'));
    try {
        const source = path.join(temp, 'message.eml');
        fs.writeFileSync(source, eml);
        const result = require('node:child_process').spawnSync(process.execPath, [
            path.join(__dirname, '..', '.github', 'skills', 'rich-email', 'scripts', 'open-rich-outlook-draft.cjs'),
            source,
            '--validate-only',
        ], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /"unsent":true/);
        assert.deepEqual(fs.readdirSync(temp), ['message.eml']);
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
});
