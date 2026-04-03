import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

describe('Client portal (client-dashboard.html) — DOM structure', () => {
    const filePath = path.join(process.cwd(), 'src', 'client-dashboard.html');
    if (!fs.existsSync(filePath)) throw new Error('Missing client-dashboard.html');
    const html = fs.readFileSync(filePath, 'utf8');
    const { window } = new JSDOM(html);
    const d = window.document;

    it('CP-01: Welcome banner shows client name placeholder (dashName)', () => {
        expect(d.getElementById('dashName')).toBeTruthy();
    });

    it('CP-02: Profile cards expose name, email, phone, client type fields', () => {
        expect(d.getElementById('profileName')).toBeTruthy();
        expect(d.getElementById('profileEmail')).toBeTruthy();
        expect(d.getElementById('profilePhone')).toBeTruthy();
        expect(d.getElementById('profileType')).toBeTruthy();
    });

    it('CP-03: Services list and records list containers exist for dashboard.js', () => {
        expect(d.getElementById('servicesList')).toBeTruthy();
        expect(d.getElementById('recordsList')).toBeTruthy();
    });

    it('CP-04: Charges section exposes fee and payment status elements', () => {
        expect(d.getElementById('bookingFeeValue')).toBeTruthy();
        expect(d.getElementById('totalChargeValue')).toBeTruthy();
        expect(d.getElementById('chargeValue')).toBeTruthy();
        expect(d.getElementById('chargeStatus')).toBeTruthy();
    });

    it('CP-05: Upload form and status region exist for document upload API', () => {
        expect(d.getElementById('uploadForm')).toBeTruthy();
        expect(d.getElementById('uploadStatus')).toBeTruthy();
    });
});
