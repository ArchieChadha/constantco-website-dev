import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

describe('Signup page (signup.html)', () => {
    it('has a signup form and submit/email/password controls', () => {
        const root = path.join(process.cwd(), 'signup.html');
        const src = path.join(process.cwd(), 'src', 'signup.html');
        const filePath = fs.existsSync(root) ? root : src;
        if (!fs.existsSync(filePath)) throw new Error(`Missing signup.html`);
        const html = fs.readFileSync(filePath, 'utf8');

        const { window } = new JSDOM(html);
        const d = window.document;

        const form = d.querySelector('form');
        const submit = d.querySelector('button[type="submit"], input[type="submit"]');
        const email =
            d.querySelector('input[type="email"]') ||
            d.querySelector('input[name*="email" i]') ||
            d.querySelector('input[id*="email" i]');
        const password =
            d.querySelector('input[type="password"]') ||
            d.querySelector('input[name*="pass" i]') ||
            d.querySelector('input[id*="pass" i]');

        expect(!!form && (!!submit || !!email || !!password)).toBe(true);
    });
});
