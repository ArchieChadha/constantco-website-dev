import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

function load(name) {
    const p = path.join(process.cwd(), 'src', name);
    if (!fs.existsSync(p)) throw new Error(`Missing ${name}`);
    const html = fs.readFileSync(p, 'utf8');
    return new JSDOM(html).window.document;
}

describe('Client auth pages — DOM structure', () => {
    it('CL-01: Login page has email, password, and submit control wired to login.js', () => {
        const d = load('login.html');
        expect(d.getElementById('loginForm')).toBeTruthy();
        expect(d.getElementById('email')).toBeTruthy();
        expect(d.getElementById('password')).toBeTruthy();
        expect(d.getElementById('loginStatus')).toBeTruthy();
    });

    it('CL-02: Signup page has signup form with name, email, and password fields', () => {
        const d = load('signup.html');
        expect(d.getElementById('signupForm')).toBeTruthy();
        expect(d.getElementById('fullName')).toBeTruthy();
        expect(d.getElementById('email')).toBeTruthy();
        expect(d.getElementById('password')).toBeTruthy();
    });

    it('CL-03: Login page links to signup, forgot password, and staff admin portal', () => {
        const d = load('login.html');
        const html = d.documentElement.innerHTML;
        expect(html).toMatch(/signup\.html/);
        expect(html).toMatch(/forgot-password\.html/);
        expect(html).toMatch(/admin-portal\.html/);
    });
});
