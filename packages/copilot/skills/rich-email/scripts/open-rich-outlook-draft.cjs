#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const SPACER_MARKER = "data-rich-email-spacer";
const SPACER = `<div ${SPACER_MARKER}="true" aria-hidden="true" style="height: 2em; line-height: 1em;"><br><br></div>`;

function decodeMimeWord(value) {
    return value.replace(/=\?([^?]+)\?([bq])\?([^?]+)\?=/gi, (full, charset, encoding, data) => {
        if (!/^utf-?8$/i.test(charset)) return full;
        if (encoding.toLowerCase() === "b") return Buffer.from(data, "base64").toString("utf8");
        return data.replace(/_/g, " ").replace(/=([0-9a-f]{2})/gi, (_, hex) =>
            Buffer.from([Number.parseInt(hex, 16)]).toString("utf8"));
    });
}

function parseHeaders(headerText) {
    const unfolded = headerText.replace(/\r?\n[ \t]+/g, " ");
    const headers = new Map();
    for (const line of unfolded.split(/\r?\n/)) {
        const separator = line.indexOf(":");
        if (separator < 1) continue;
        headers.set(line.slice(0, separator).trim().toLowerCase(),
            line.slice(separator + 1).trim());
    }
    return headers;
}

function parseRecipients(value) {
    return value.split(/[;,]/).map((entry) => {
        const angleAddress = entry.match(/<([^>]+)>/);
        return (angleAddress?.[1] || entry).trim();
    }).filter(Boolean);
}

function decodeQuotedPrintable(value) {
    const withoutSoftBreaks = value.replace(/=\r?\n/g, "");
    const bytes = [];
    for (let index = 0; index < withoutSoftBreaks.length; index += 1) {
        const match = withoutSoftBreaks.slice(index).match(/^=([0-9a-f]{2})/i);
        if (match) {
            bytes.push(Number.parseInt(match[1], 16));
            index += 2;
        } else {
            bytes.push(...Buffer.from(withoutSoftBreaks[index], "utf8"));
        }
    }
    return Buffer.from(bytes).toString("utf8");
}

function decodeBody(body, headers) {
    const encoding = (headers.get("content-transfer-encoding") || "8bit").toLowerCase();
    if (encoding === "base64") return Buffer.from(body.replace(/\s/g, ""), "base64").toString("utf8");
    if (encoding === "quoted-printable") return decodeQuotedPrintable(body);
    return body;
}

function parseEml(raw) {
    const boundary = raw.match(/\r?\n\r?\n/);
    if (!boundary || boundary.index === undefined) throw new Error("Invalid EML: missing header/body boundary");
    const headers = parseHeaders(raw.slice(0, boundary.index));
    const contentType = headers.get("content-type") || "";
    if (/^multipart\//i.test(contentType)) {
        throw new Error("Unsupported EML: multipart output is refused by the Outlook draft helper; omit --inline-images and reconvert.");
    }
    if (!/^text\/html\b/i.test(contentType)) {
        throw new Error(`Unsupported EML content type: ${contentType || "missing"}`);
    }

    const body = raw.slice(boundary.index + boundary[0].length);
    const html = decodeBody(body, headers);
    const to = parseRecipients(headers.get("to") || "");
    const malformed = to.filter((address) => !/^[^\s"<>,;]+@[^\s"<>,;]+$/.test(address));
    if (malformed.length > 0) {
        throw new Error(`Invalid EML: recipient is not a bare address (${malformed.join(", ")}). Leave frontmatter values unquoted and reconvert.`);
    }
    const subject = decodeMimeWord(headers.get("subject") || "");
    if (to.length === 0) throw new Error("Invalid EML: missing recipients");
    if (!subject) throw new Error("Invalid EML: missing subject");
    if (!/<(?:html|body|h1|p|table|div)\b/i.test(html)) throw new Error("Invalid EML: HTML body is empty or malformed");
    return { headers, to, subject, html };
}

function wrapBase64(value, eol) {
    return value.match(/.{1,76}/g)?.join(eol) || "";
}

function buildOutlookDraftEml(raw) {
    const boundary = raw.match(/\r?\n\r?\n/);
    if (!boundary || boundary.index === undefined) throw new Error("Invalid EML: missing header/body boundary");
    const parsed = parseEml(raw);
    const eol = raw.includes("\r\n") ? "\r\n" : "\n";
    const lines = raw.slice(0, boundary.index).split(/\r?\n/);
    const unsentIndex = lines.findIndex((line) => /^X-Unsent:/i.test(line));
    if (unsentIndex >= 0) {
        lines[unsentIndex] = "X-Unsent: 1";
    } else {
        const toIndex = lines.findIndex((line) => /^To:/i.test(line));
        if (toIndex === -1) throw new Error("Invalid EML: missing To header");
        let insertAt = toIndex + 1;
        while (insertAt < lines.length && /^[ \t]/.test(lines[insertAt])) insertAt += 1;
        lines.splice(insertAt, 0, "X-Unsent: 1");
    }

    let html = parsed.html;
    if (!html.includes(SPACER_MARKER)) {
        html = html.replace(/<body([^>]*)>/i, (bodyTag) => `${bodyTag}${SPACER}`);
        if (!html.includes(SPACER_MARKER)) throw new Error("Invalid EML: missing HTML body element");
    }

    const encodingIndex = lines.findIndex((line) => /^Content-Transfer-Encoding:/i.test(line));
    if (encodingIndex === -1) lines.push("Content-Transfer-Encoding: base64");
    else lines[encodingIndex] = "Content-Transfer-Encoding: base64";
    const body = wrapBase64(Buffer.from(html, "utf8").toString("base64"), eol);
    return `${lines.join(eol)}${eol}${eol}${body}${eol}`;
}

function resolveDraftLauncher() {
    for (const command of ["olk.exe", "outlook.exe"]) {
        if (spawnSync("where", [command], { stdio: "ignore" }).status === 0) {
            return command;
        }
    }
    throw new Error("New Outlook launcher unavailable. Install New Outlook or use --validate-only.");
}

function parseArgs(argv) {
    const args = { emlPath: null, validateOnly: false };
    for (const value of argv) {
        if (value === "--validate-only") args.validateOnly = true;
        else if (!args.emlPath) args.emlPath = value;
        else throw new Error(`Unexpected argument: ${value}`);
    }
    if (!args.emlPath) throw new Error("Usage: node open-rich-outlook-draft.cjs <message.eml> [--validate-only]");
    return args;
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const emlPath = path.resolve(args.emlPath);
    const raw = fs.readFileSync(emlPath, "utf8");
    const draft = buildOutlookDraftEml(raw);
    const parsed = parseEml(draft);
    if (args.validateOnly) {
        process.stdout.write(`${JSON.stringify({ to: parsed.to, subject: parsed.subject, htmlBytes: Buffer.byteLength(parsed.html), unsent: /^X-Unsent: 1$/m.test(draft), spacerLines: 2 })}\n`);
        return;
    }

    const launcher = resolveDraftLauncher();
    const outputPath = path.join(os.tmpdir(), `${path.basename(emlPath, path.extname(emlPath))}-outlook-draft.eml`);
    fs.writeFileSync(outputPath, draft, "utf8");
    const child = spawn(launcher, [outputPath], { detached: true, stdio: "ignore" });
    child.unref();
    console.log(`Outlook draft opened: ${outputPath}`);
    console.log(`Draft opener: ${launcher}`);
    console.log("Expected order: default signature, two blank lines, rich content.");
}

if (require.main === module) {
    try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { buildOutlookDraftEml, parseEml };
