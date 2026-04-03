import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

function readSrcHtml(name) {
    const filePath = path.join(process.cwd(), 'src', name);
    if (!fs.existsSync(filePath)) throw new Error(`Missing ${name}`);
    return fs.readFileSync(filePath, 'utf8');
}

describe('Admin portal (admin-portal.html) — DOM structure', () => {
    const html = readSrcHtml('admin-portal.html');
    const { window } = new JSDOM(html);
    const d = window.document;

    it('AP-01: Login screen and email/password fields are present', () => {
        expect(d.getElementById('loginScreen')).toBeTruthy();
        expect(d.getElementById('loginForm')).toBeTruthy();
        expect(d.getElementById('loginEmail')).toBeTruthy();
        expect(d.getElementById('loginPassword')).toBeTruthy();
    });

    it('AP-02: Admin app shell and dashboard page section exist after login (markup)', () => {
        expect(d.getElementById('adminApp')).toBeTruthy();
        expect(d.getElementById('page-dashboard')).toBeTruthy();
    });

    it('AP-03: Sidebar exposes Dashboard, Clients, Billing, Appointments, Admin Management', () => {
        const labels = [...d.querySelectorAll('.sidebar .nav-btn')].map((b) => b.textContent.trim());
        expect(labels.join('|')).toMatch(/Dashboard/);
        expect(labels.join('|')).toMatch(/Clients/);
        expect(labels.join('|')).toMatch(/Billing/);
        expect(labels.join('|')).toMatch(/Appointments/);
        expect(labels.join('|')).toMatch(/Admin Management/);
    });

    it('AP-04: Stat cards and activity targets exist for dashboard JS', () => {
        expect(d.getElementById('statClients')).toBeTruthy();
        expect(d.getElementById('statInvoices')).toBeTruthy();
        expect(d.getElementById('statAppointments')).toBeTruthy();
        expect(d.getElementById('logoutBtn')).toBeTruthy();
    });

    it('AP-05: All main portal page sections exist in DOM', () => {
        expect(d.getElementById('page-clients')).toBeTruthy();
        expect(d.getElementById('page-billing')).toBeTruthy();
        expect(d.getElementById('page-appointments')).toBeTruthy();
        expect(d.getElementById('page-admins')).toBeTruthy();
    });
});
