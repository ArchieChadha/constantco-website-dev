import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

function loadHtml(file) {
    const rootPath = path.join(process.cwd(), file);
    const srcPath = path.join(process.cwd(), 'src', file);
    const chosen = fs.existsSync(rootPath) ? rootPath : srcPath;
    if (!fs.existsSync(chosen)) throw new Error(`Missing ${file}`);
    return fs.readFileSync(chosen, 'utf8');
}

describe('Home page (index.html)', () => {
    it('exists and has at least one link or a <nav>', () => {
        const html = loadHtml('index.html');
        const { window } = new JSDOM(html);
        const d = window.document;
        const hasNav = !!d.querySelector('nav');
        const linkCount = d.querySelectorAll('a').length;
        expect(hasNav || linkCount > 0).toBe(true);
    });
});
