import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

describe('Admin Login (admin-login.html)', () => {
    it('has a login form and a password field', () => {
        const root = path.join(process.cwd(), 'admin-login.html');
        const src = path.join(process.cwd(), 'src', 'admin-login.html');
        const filePath = fs.existsSync(root) ? root : src;
        if (!fs.existsSync(filePath)) throw new Error(`Missing admin-login.html`);
        const html = fs.readFileSync(filePath, 'utf8');

        const { window } = new JSDOM(html);
        const d = window.document;

        const form = d.querySelector('form');
        const password =
            d.querySelector('input[type="password"]') ||
            d.querySelector('input[name*="pass" i]') ||
            d.querySelector('input[id*="pass" i]') ||
            d.querySelector('input[autocomplete="current-password"]');

        expect(!!form && !!password).toBe(true);
    });
});
