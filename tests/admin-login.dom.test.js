import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

/** Admin auth UI lives on admin-portal.html (single login screen). */
describe('Admin portal login (admin-portal.html)', () => {
    it('has a login form and a password field', () => {
        const filePath = path.join(process.cwd(), 'src', 'admin-portal.html');
        if (!fs.existsSync(filePath)) throw new Error(`Missing admin-portal.html`);
        const html = fs.readFileSync(filePath, 'utf8');

        const { window } = new JSDOM(html);
        const d = window.document;

        const form = d.getElementById('loginForm');
        const password = d.getElementById('loginPassword');

        expect(!!form && !!password).toBe(true);
    });
});
