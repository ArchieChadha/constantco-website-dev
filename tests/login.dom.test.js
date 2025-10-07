import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

function loadHtml(file) {
    const root = path.join(process.cwd(), file);
    const src = path.join(process.cwd(), 'src', file);
    const filePath = fs.existsSync(root) ? root : src;
    return fs.readFileSync(filePath, 'utf8');
}

describe('Login page (login.html)', () => {
    it('has a form with a password field', () => {
        const html = loadHtml('login.html');
        const { window } = new JSDOM(html);
        const doc = window.document;

        expect(doc.querySelector('form')).toBeTruthy();
        expect(doc.querySelector('input[type="password"]')).toBeTruthy();
    });
});
