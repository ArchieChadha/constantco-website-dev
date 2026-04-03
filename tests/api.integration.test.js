import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const flagPath = path.join(__dirname, '.api-up');
const API_UP = fs.existsSync(flagPath) && fs.readFileSync(flagPath, 'utf8').trim() === '1';

const base = 'http://127.0.0.1:3001';

describe.skipIf(!API_UP)('API integration — backend (localhost:3001)', () => {
    it('API-01: GET /api/health responds', async () => {
        const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(8000) });
        expect(res.status).toBeGreaterThanOrEqual(200);
        expect(res.status).toBeLessThan(600);
    });

    it('API-02: POST /api/newsletter rejects invalid email (400)', async () => {
        const res = await fetch(`${base}/api/newsletter`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'not-an-email' }),
            signal: AbortSignal.timeout(8000),
        });
        expect(res.status).toBe(400);
    });

    it('API-03: POST /api/signup rejects weak password (400)', async () => {
        const res = await fetch(`${base}/api/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: 'weakpass-test@example.com',
                password: 'short',
            }),
            signal: AbortSignal.timeout(8000),
        });
        expect(res.status).toBe(400);
    });

    it('API-04: POST /api/contact rejects missing fields (400)', async () => {
        const res = await fetch(`${base}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: '', email: 'bad', subject: '', message: '' }),
            signal: AbortSignal.timeout(8000),
        });
        expect(res.status).toBe(400);
    });

    it('API-05: POST /api/login rejects unknown user (401) when DB is healthy', async () => {
        const health = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(8000) });
        if (health.status !== 200) {
            expect(health.status).toBe(500);
            return;
        }
        const res = await fetch(`${base}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'nonexistent-user-99f3c2@example.com',
                password: 'DoesNotMatter123!',
            }),
            signal: AbortSignal.timeout(8000),
        });
        expect(res.status).toBe(401);
    });

    it('API-06: GET /api/profile without clientId returns 400', async () => {
        const res = await fetch(`${base}/api/profile`, { signal: AbortSignal.timeout(8000) });
        expect(res.status).toBe(400);
    });

    it('API-07: PUT /api/admin/billing/x without clientId returns 400', async () => {
        const res = await fetch(`${base}/api/admin/billing/test-appt-1`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(8000),
        });
        expect(res.status).toBe(400);
    });

    it('API-08: POST /api/upload with no file returns 400', async () => {
        const res = await fetch(`${base}/api/upload`, {
            method: 'POST',
            signal: AbortSignal.timeout(8000),
        });
        expect(res.status).toBe(400);
    });
});
