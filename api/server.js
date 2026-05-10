// server.js (ES module)
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import Stripe from 'stripe';
import crypto from 'crypto';
import OpenAI from 'openai';
import nodemailer from 'nodemailer';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const app = express();
const PORT = process.env.PORT || 3001;

/*------ Stripe Webhook ------*/
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('🔥 Webhook received:', event.type);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Deduplicate by Stripe event ID
        const existingEvent = await client.query(
            `SELECT id
             FROM processed_stripe_events
             WHERE stripe_event_id = $1
             LIMIT 1`,
            [event.id]
        );

        if (existingEvent.rows.length > 0) {
            await client.query('ROLLBACK');
            console.log(`Duplicate webhook ignored: ${event.id}`);
            return res.json({ received: true, duplicate: true });
        }

        // 2. Record the event first
        await client.query(
            `INSERT INTO processed_stripe_events
             (stripe_event_id, event_type, created_at)
             VALUES ($1, $2, NOW())`,
            [event.id, event.type]
        );

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;

            const pendingResult = await client.query(
                `SELECT *
         FROM pending_bookings
         WHERE stripe_payment_intent_id = $1
         LIMIT 1`,
                [paymentIntent.id]
            );

            if (pendingResult.rows.length > 0) {
                const pending = pendingResult.rows[0];

                const finalCheck = await client.query(
                    `SELECT id
             FROM appointments
             WHERE staff_id = $1
               AND appointment_date = $2
               AND appointment_time = $3::time
               AND booking_status IN ('Scheduled', 'Confirmed', 'Pending Payment')
             LIMIT 1`,
                    [
                        pending.staff_id,
                        pending.appointment_date,
                        pending.appointment_time
                    ]
                );

                if (finalCheck.rows.length > 0) {
                    await client.query(
                        `UPDATE pending_bookings
                 SET status = 'Rejected - Slot Already Booked'
                 WHERE id = $1`,
                        [pending.id]
                    );

                    await client.query('COMMIT');
                    return res.json({ received: true, rejected: true });
                }

                const appointmentResult = await client.query(
                    `INSERT INTO appointments
             (
                client_id,
                staff_id,
                full_name,
                email,
                phone,
                company,
                service_name,
                meeting_type,
                appointment_date,
                appointment_time,
                notes,
                booking_fee,
                booking_status,
                created_at,
                updated_at
             )
             VALUES
             ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::time, $11, $12, 'Confirmed', NOW(), NOW())
             RETURNING *`,
                    [
                        pending.client_id,
                        pending.staff_id,
                        pending.full_name,
                        pending.email,
                        pending.phone,
                        pending.company || null,
                        pending.service_name,
                        pending.meeting_type,
                        pending.appointment_date,
                        pending.appointment_time,
                        pending.notes || null,
                        pending.booking_fee
                    ]
                );

                const appointment = appointmentResult.rows[0];

                const billingResult = await client.query(
                    `INSERT INTO appointment_billing
             (
                appointment_id,
                client_id,
                service_name,
                booking_fee,
                service_charge,
                total_charge,
                amount_paid,
                amount_due,
                payment_status,
                stripe_payment_intent_id,
                created_at,
                updated_at
             )
             VALUES
             ($1, $2, $3, $4, 0, $4, $4, 0, 'Paid', $5, NOW(), NOW())
             RETURNING *`,
                    [
                        appointment.id,
                        pending.client_id,
                        pending.service_name,
                        pending.booking_fee,
                        paymentIntent.id
                    ]
                );

                await client.query(
                    `INSERT INTO client_payments
             (
                billing_id,
                client_id,
                stripe_payment_intent_id,
                amount,
                currency,
                status,
                created_at
             )
             VALUES ($1, $2, $3, $4, $5, 'succeeded', NOW())`,
                    [
                        billingResult.rows[0].id,
                        pending.client_id,
                        paymentIntent.id,
                        paymentIntent.amount_received || paymentIntent.amount,
                        paymentIntent.currency || 'aud'
                    ]
                );

                await client.query(
                    `UPDATE pending_bookings
             SET status = 'Completed'
             WHERE id = $1`,
                    [pending.id]
                );

                await sendAppointmentConfirmationEmail(appointment);

                await client.query('COMMIT');
                return res.json({ received: true });
            }

            const paidAmount = Number(paymentIntent.amount_received || paymentIntent.amount || 0);
            const currency = paymentIntent.currency || 'aud';
            const billingId = Number(paymentIntent.metadata.billingId || 0);

            if (!billingId) {
                throw new Error(`Missing billingId in payment intent metadata for ${paymentIntent.id}`);
            }

            const billingResult = await client.query(
                `SELECT id, client_id, total_charge, amount_paid
         FROM appointment_billing
         WHERE id = $1
         LIMIT 1`,
                [billingId]
            );

            if (!billingResult.rows.length) {
                throw new Error(`No billing record found for billing ID ${billingId}`);
            }

            const billing = billingResult.rows[0];

            const existingPayment = await client.query(
                `SELECT id
         FROM client_payments
         WHERE stripe_payment_intent_id = $1
         LIMIT 1`,
                [paymentIntent.id]
            );

            if (!existingPayment.rows.length) {
                await client.query(
                    `INSERT INTO client_payments
             (
                billing_id,
                client_id,
                stripe_payment_intent_id,
                amount,
                currency,
                status,
                created_at
             )
             VALUES ($1, $2, $3, $4, $5, 'succeeded', NOW())`,
                    [
                        billing.id,
                        billing.client_id,
                        paymentIntent.id,
                        paidAmount,
                        currency
                    ]
                );

                const newAmountPaid = Math.min(
                    Number(billing.total_charge),
                    Number(billing.amount_paid) + paidAmount
                );

                const newAmountDue = Math.max(
                    Number(billing.total_charge) - newAmountPaid,
                    0
                );

                const newStatus = newAmountDue === 0 ? 'Paid' : 'Pending';

                await client.query(
                    `UPDATE appointment_billing
             SET amount_paid = $1,
                 amount_due = $2,
                 payment_status = $3,
                 updated_at = NOW()
             WHERE id = $4`,
                    [newAmountPaid, newAmountDue, newStatus, billing.id]
                );

                console.log('🧠 Rows updated:', result.rowCount);
                console.log('🧠 Updated row:', result.rows[0]);
            } else {
                console.log('ℹ️ Payment already recorded for:', paymentIntent.id);
            }
        }

        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;
            const billingId = Number(paymentIntent.metadata.billingId || 0);

            if (!billingId) {
                throw new Error(`Missing billingId in failed payment metadata for ${paymentIntent.id}`);
            }

            const result = await client.query(
                `UPDATE appointment_billing
                 SET payment_status = 'Failed',
                     updated_at = NOW()
                 WHERE id = $1
                 RETURNING *`,
                [billingId]
            );

            console.log('❌ Payment failed:', paymentIntent.id);
            console.log('🧠 Failed rows updated:', result.rowCount);
            console.log('🧠 Failed updated row:', result.rows[0]);
        }

        await client.query('COMMIT');
        res.json({ received: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Webhook processing error:', err);
        res.status(500).json({ error: 'Webhook handling failed' });
    } finally {
        client.release();
    }
});

/* ---------- Middleware ---------- */
app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.static(path.join(process.cwd(), '..', 'src')));

/* ---------- AI Chatbot ---------- */
app.post('/api/ai-chatbot', async (req, res) => {
    try {
        const { message = '' } = req.body || {};
        if (!message.trim()) {
            return res.status(400).json({ error: 'Message is required' });
        }
        const response = await openai.responses.create({
            model: 'gpt-5.5-mini',
            input: [
                {
                    role: 'system',
                    content:
                        'You are the Constant & Co website assistant. Help users with appointment booking, payments, client portal, document uploads, accounting services, FAQs, and contact information. Keep answers short, helpful, and professional. If the question is outside Constant & Co website support, politely redirect the user.'
                },
                {
                    role: 'user',
                    content: message
                }
            ]
        });
        res.json({
            ok: true,
            reply: response.output_text || 'Sorry, I could not generate a response.'
        });
    } catch (err) {
        console.error('AI chatbot error:', err);
        res.status(500).json({ error: 'AI chatbot failed' });
    }
});

const uploadsFolder = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsFolder));

/* ---------- Postgres Pool ---------- */
const pool = new pg.Pool(
    process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.PGHOST || 'localhost',
            port: parseInt(process.env.PGPORT || '5432', 10),
            user: process.env.PGUSER || 'postgres',
            password: process.env.PGPASSWORD || '',
            database: process.env.PGDATABASE || 'constant_co',
        }
);

const mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendAppointmentConfirmationEmail(appointment) {
    if (!appointment.email) return;

    await mailTransporter.sendMail({
        from: `"Constant & Co" <${process.env.EMAIL_USER}>`,
        to: appointment.email,
        subject: 'Appointment Confirmation - Constant & Co',
        html: `
            <h2>Appointment Confirmed</h2>

            <p>Hello ${appointment.full_name || 'there'},</p>

            <p>Your appointment with Constant & Co has been confirmed.</p>

            <p><strong>Service:</strong> ${appointment.service_name}</p>
            <p><strong>Date:</strong> ${appointment.appointment_date}</p>
            <p><strong>Time:</strong> ${appointment.appointment_time}</p>

            <p>Thank you,<br>Constant & Co Team</p>
        `
    });

    console.log('Confirmation email sent to:', appointment.email);
}

app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), '..', 'src', 'index.html'));
});

/* ---------- Tiny request log ---------- */
app.use((req, _res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

/* ---------- File Upload Setup ---------- */
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsFolder);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, '_');
        const uniqueName = `${Date.now()}-${safeName}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, PNG, and JPG files are allowed'));
        }
    }
});

/* ---------- Helpers ---------- */
const isEmail = (s = '') => /^\S+@\S+\.\S+$/.test(s);
const DEFAULT_SLOT_MINUTES = 60;
const SLOT_PAD = (value) => String(value).padStart(2, '0');

function toIsoDate(date) {
    const year = date.getFullYear();
    const month = SLOT_PAD(date.getMonth() + 1);
    const day = SLOT_PAD(date.getDate());
    return `${year}-${month}-${day}`;
}

function slotLabelFromMinutes(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${SLOT_PAD(hours)}:${SLOT_PAD(minutes)}`;
}

function slotMinutesFromTimeString(time = '') {
    const [hour, minute] = String(time).split(':').map((part) => Number(part));
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return (hour * 60) + minute;
}

function slotKey(date, time) {
    return `${date}|${String(time).slice(0, 5)}`;
}

async function resolveClientIdForBooking({
    clientId,
    fullName,
    email,
    phone,
    serviceName
}) {
    if (clientId) {
        const byId = await pool.query(
            `SELECT id
             FROM portal_clients
             WHERE id = $1
             LIMIT 1`,
            [clientId]
        );
        if (byId.rows.length) return byId.rows[0].id;
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!isEmail(cleanEmail)) {
        throw new Error('A valid email address is required.');
    }

    const existing = await pool.query(
        `SELECT id
         FROM portal_clients
         WHERE lower(email) = $1
         LIMIT 1`,
        [cleanEmail]
    );

    if (existing.rows.length) {
        return existing.rows[0].id;
    }

    const randomPassword = `${crypto.randomBytes(12).toString('hex')}!1`;
    const hash = await bcrypt.hash(randomPassword, 10);
    const inserted = await pool.query(
        `INSERT INTO portal_clients
            (name, email, password, phone, client_type, service, note, created_at, updated_at)
         VALUES
            ($1, $2, $3, $4, 'Guest', $5, 'Guest booking created from website.', NOW(), NOW())
         RETURNING id`,
        [
            String(fullName || 'Guest User').trim() || 'Guest User',
            cleanEmail,
            hash,
            String(phone || '').trim() || null,
            String(serviceName || '').trim() || null
        ]
    );

    return inserted.rows[0].id;
}

async function getProviderSlotsForDate(staffId, date) {
    const availabilityRes = await pool.query(
        `SELECT start_time, end_time
         FROM staff_availability
         WHERE staff_id = $1
           AND available_date = $2
           AND status = 'approved'`,
        [staffId, date]
    );

    if (!availabilityRes.rows.length) return [];

    const leaveRes = await pool.query(
        `SELECT 1
         FROM availability_change_requests
         WHERE staff_id = $1
           AND $2::date BETWEEN start_date AND end_date
           AND status = 'Approved'
         LIMIT 1`,
        [staffId, date]
    );

    if (leaveRes.rows.length) return [];

    const bookedRes = await pool.query(
        `SELECT appointment_time::text AS time_value
         FROM appointments
         WHERE staff_id = $1
           AND appointment_date = $2
           AND booking_status IN ('Scheduled', 'Confirmed', 'Pending Payment')
         UNION
         SELECT appointment_time::text AS time_value
         FROM pending_bookings
         WHERE staff_id = $1
           AND appointment_date = $2
           AND status = 'Pending'`,
        [staffId, date]
    );

    const booked = new Set(
        bookedRes.rows.map((row) => String(row.time_value).slice(0, 5))
    );

    const slots = [];
    for (const row of availabilityRes.rows) {
        const startMin = slotMinutesFromTimeString(row.start_time);
        const endMin = slotMinutesFromTimeString(row.end_time);
        if (startMin === null || endMin === null || endMin <= startMin) continue;

        for (let timeMin = startMin; timeMin + DEFAULT_SLOT_MINUTES <= endMin; timeMin += DEFAULT_SLOT_MINUTES) {
            const slot = slotLabelFromMinutes(timeMin);
            if (!booked.has(slot)) {
                slots.push(slot);
            }
        }
    }

    return [...new Set(slots)].sort();
}

const PASSWORD_RULE =
    /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

/** Build reset URL for dev (same folder as referring login page). */
function passwordResetUrlFromReferer(referer, token) {
    if (!referer || !token) return null;
    try {
        const u = new URL(referer);
        const path = u.pathname.replace(/\/[^/]+$/, '');
        const resetPath = `${path}/reset-password.html`;
        return `${u.origin}${resetPath}?token=${encodeURIComponent(token)}`;
    } catch {
        return null;
    }
}

/* ---------- Health ---------- */
app.get('/api/health', async (_req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ ok: true });
    } catch (err) {
        console.error('Health check failed:', err);
        res.status(500).json({ ok: false });
    }
});

/* -- Newsletter -- */
app.post('/api/newsletter', async (req, res) => {
    try {
        const { email } = req.body || {};

        if (!isEmail(email)) {
            return res.status(400).json({ error: 'Valid email required' });
        }

        const sql = `
            INSERT INTO newsletter_subscribers (email, created_at)
            VALUES ($1, NOW())
            ON CONFLICT (email) DO NOTHING
            RETURNING id, email, created_at
        `;

        const { rows } = await pool.query(sql, [email.trim()]);
        const row = rows[0] || null;

        if (!row) {
            return res.status(200).json({ message: 'Already subscribed' });
        }

        res.json({ message: 'Subscribed successfully', subscriber: row });
    } catch (err) {
        console.error('Error saving newsletter:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* -- Contact -- */
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body || {};

        if (!name || !isEmail(email) || !subject || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await pool.query(
            `INSERT INTO contact_messages
             (name, email, phone, subject, message, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [name.trim(), email.trim(), (phone || '').trim(), subject.trim(), message.trim()]
        );

        res.json({ message: 'Message received' });
    } catch (err) {
        console.error('Error saving contact:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* -- Signup -- */
app.post('/api/signup', async (req, res) => {
    try {
        const {
            name = '',
            email = '',
            phone = '',
            client_type = '',
            service = '',
            note = '',
            password = '',
        } = req.body || {};

        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

        if (!name.trim() || !isEmail(email)) {
            return res.status(400).json({ error: 'Please provide a valid name and email.' });
        }

        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error: 'Password must be at least 8 characters long and include at least one number and one special character.',
            });
        }

        const { rows: existing } = await pool.query(
            'SELECT id FROM portal_clients WHERE email = $1 LIMIT 1',
            [email.trim()]
        );

        if (existing.length) {
            return res.status(409).json({ error: 'Email already registered. Please log in instead.' });
        }

        const hash = await bcrypt.hash(password, 10);

        const insertSql = `
            INSERT INTO portal_clients
            (name, email, password, phone, client_type, service, note, created_at)
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, NOW())
            RETURNING id, name, email, phone, client_type, service, note, created_at
        `;

        const { rows } = await pool.query(insertSql, [
            name.trim(),
            email.trim(),
            hash,
            phone.trim() || null,
            client_type || null,
            service || null,
            note || null,
        ]);

        return res.status(201).json({ ok: true, client: rows[0] });
    } catch (err) {
        console.error('Signup error:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

/* -- Login -- */
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const { rows } = await pool.query(
            `SELECT id, name, email, phone, client_type, service, note, password
             FROM portal_clients
             WHERE email = $1
             LIMIT 1`,
            [email.trim()]
        );

        const user = rows[0];
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const stored = user.password || '';
        let ok = false;

        if (
            stored.startsWith('$2a$') ||
            stored.startsWith('$2b$') ||
            stored.startsWith('$2y$')
        ) {
            ok = await bcrypt.compare(password, stored);
        } else {
            ok = password === stored;
        }

        if (!ok) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            ok: true,
            client: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                client_type: user.client_type,
                service: user.service,
                note: user.note
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* -- Forgot password: request reset link (token stored hashed) -- */
app.post('/api/request-password-reset', async (req, res) => {
    try {
        const email = (req.body?.email || '').trim();
        if (!isEmail(email)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        const okMsg =
            'If that email is registered, you can use the reset link to choose a new password. The link expires in one hour.';

        const { rows: users } = await pool.query(
            'SELECT id FROM portal_clients WHERE email = $1 LIMIT 1',
            [email]
        );

        if (!users.length) {
            return res.json({ ok: true, message: okMsg });
        }

        await pool.query(
            'DELETE FROM password_resets WHERE email = $1 AND used_at IS NULL',
            [email]
        );

        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await pool.query(
            `INSERT INTO password_resets (email, token_hash, expires_at)
             VALUES ($1, $2, $3)`,
            [email, tokenHash, expiresAt]
        );

        const referer = req.get('referer') || '';
        let devResetLink = passwordResetUrlFromReferer(referer, token);
        if (!devResetLink && process.env.PUBLIC_WEB_ORIGIN) {
            const base = String(process.env.PUBLIC_WEB_ORIGIN).replace(/\/$/, '');
            devResetLink = `${base}/src/reset-password.html?token=${encodeURIComponent(token)}`;
        }

        if (devResetLink) {
            console.log('[password-reset] link:', devResetLink);
        } else {
            console.log(
                '[password-reset] token issued (set PUBLIC_WEB_ORIGIN or open forgot-password from the site so Referer builds the link)'
            );
        }

        const payload = { ok: true, message: okMsg };
        if (process.env.NODE_ENV !== 'production' && devResetLink) {
            payload.devResetLink = devResetLink;
        }
        return res.json(payload);
    } catch (err) {
        console.error('request-password-reset:', err);
        return res.status(500).json({ error: 'Server error' });
    }
});

/* -- Reset password with token from email/link -- */
app.post('/api/reset-password', async (req, res) => {
    const token = String(req.body?.token ?? '').trim();
    const newPassword = String(req.body?.newPassword ?? '');

    if (!token || !PASSWORD_RULE.test(newPassword)) {
        return res.status(400).json({
            error: 'Invalid or expired link, or password must be at least 8 characters with a number and special character.',
        });
    }

    const client = await pool.connect();
    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const { rows } = await client.query(
            `SELECT id, email FROM password_resets
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
             LIMIT 1`,
            [tokenHash]
        );

        if (!rows.length) {
            return res.status(400).json({
                error: 'Invalid or expired reset link. Please request a new one.',
            });
        }

        const row = rows[0];
        const hash = await bcrypt.hash(newPassword, 10);

        await client.query('BEGIN');
        await client.query(
            'UPDATE portal_clients SET password = $1 WHERE email = $2',
            [hash, row.email]
        );
        await client.query(
            'UPDATE password_resets SET used_at = NOW() WHERE id = $1',
            [row.id]
        );
        await client.query('COMMIT');

        return res.json({ ok: true, message: 'Password updated. You can log in with your new password.' });
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch {
        }
        console.error('reset-password:', err);
        return res.status(500).json({ error: 'Server error' });
    } finally {
        client.release();
    }
});

/* -- Client Profile -- */
app.get('/api/profile', async (req, res) => {
    try {
        const { clientId } = req.query;

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        const { rows } = await pool.query(
            `SELECT id, name, email, phone, client_type, service, note, created_at, updated_at
             FROM portal_clients
             WHERE id = $1
             LIMIT 1`,
            [clientId]
        );

        const client = rows[0];
        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json({ ok: true, client });
    } catch (err) {
        console.error('Profile fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/* -- Update Client Profile -- */
app.put('/api/profile', async (req, res) => {
    try {
        const {
            clientId,
            name = '',
            email = '',
            phone = '',
            client_type = '',
            service = '',
            note = ''
        } = req.body || {};

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        if (!name.trim() || !isEmail(email)) {
            return res.status(400).json({ error: 'Valid name and email are required' });
        }

        const { rows: duplicate } = await pool.query(
            `SELECT id
             FROM portal_clients
             WHERE email = $1 AND id <> $2
             LIMIT 1`,
            [email.trim(), clientId]
        );

        if (duplicate.length) {
            return res.status(409).json({ error: 'That email is already in use' });
        }

        const { rows } = await pool.query(
            `UPDATE portal_clients
             SET name = $1,
                 email = $2,
                 phone = $3,
                 client_type = $4,
                 service = $5,
                 note = $6,
                 updated_at = NOW()
             WHERE id = $7
             RETURNING id, name, email, phone, client_type, service, note, updated_at`,
            [
                name.trim(),
                email.trim(),
                phone.trim() || null,
                client_type || null,
                service || null,
                note.trim() || null,
                clientId
            ]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json({
            ok: true,
            message: 'Profile updated successfully',
            client: rows[0]
        });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

/* -- Services Overview -- */
app.get('/api/services', async (req, res) => {
    try {
        const { clientId } = req.query;

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        const { rows } = await pool.query(
            `SELECT 
                pc.id,
                pc.service,
                pc.client_type,
                pc.note,
                s.full_name AS staff_name
             FROM portal_clients pc
             LEFT JOIN appointments a ON a.client_id = pc.id
             LEFT JOIN staff_users s ON a.staff_id = s.id
             WHERE pc.id = $1
             ORDER BY a.created_at DESC
             LIMIT 1`,
            [clientId]
        );

        const client = rows[0];

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json({
            ok: true,
            services: [
                {
                    title: client.service || 'No service selected',
                    status: 'Active',
                    client_type: client.client_type || 'Not specified',
                    staff_name: client.staff_name || 'Not assigned',
                    note: client.note || 'No additional notes available'
                }
            ]
        });
    } catch (err) {
        console.error('Services fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

/* -- Upload document -- */
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const clientId = req.body.clientId || null;
        const fileName = req.file.filename;
        const filePath = `uploads/${fileName}`;

        const result = await pool.query(
            `INSERT INTO client_documents (client_id, file_name, file_path, uploaded_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING *`,
            [clientId, fileName, filePath]
        );

        console.log('Uploaded file:', fileName);
        console.log('Inserted row:', result.rows[0]);

        res.json({
            message: 'File uploaded successfully',
            file: fileName
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Upload failed' });
    }
});

/* -- View past records -- */
app.get('/api/records', async (req, res) => {
    try {
        const { clientId } = req.query;

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        const { rows } = await pool.query(
            `SELECT id, client_id, file_name, file_path, uploaded_at
             FROM client_documents
             WHERE client_id = $1
             ORDER BY uploaded_at DESC`,
            [clientId]
        );

        res.json(rows);
    } catch (err) {
        console.error('Records fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

/*-------CLient Service History-------*/
app.get('/api/client/service-history', async (req, res) => {
    try {
        const { clientId } = req.query;

        if (!clientId) {
            return res.status(400).json({
                error: 'Client ID required'
            });
        }

        const { rows } = await pool.query(
            `SELECT
                a.id AS appointment_id,
                a.service_name,
                a.meeting_type,
                a.appointment_date,
                a.appointment_time,
                a.booking_status,
                a.booking_fee,
                a.notes,
                s.id AS staff_id,
                s.full_name AS staff_name,
                s.email AS staff_email
             FROM appointments a
             LEFT JOIN staff_users s ON s.id = a.staff_id
             WHERE a.client_id = $1
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [clientId]
        );

        res.json({
            ok: true,
            services: rows
        });

    } catch (err) {
        console.error('Client service history error:', err);
        res.status(500).json({
            error: 'Failed to load service history'
        });
    }
});

/*---------Client Payment History--------*/
app.get('/api/client/payment-history', async (req, res) => {
    try {
        const { clientId } = req.query;

        if (!clientId) {
            return res.status(400).json({
                error: 'Client ID required'
            });
        }

        const { rows } = await pool.query(
            `SELECT
                cp.id,
                cp.amount,
                cp.currency,
                cp.status,
                cp.created_at AS payment_date,
                ab.service_name,
                ab.booking_fee,
                ab.service_charge,
                ab.total_charge,
                ab.amount_paid,
                ab.amount_due,
                ab.payment_status,
                a.id AS appointment_id,
                a.appointment_date,
                a.appointment_time
             FROM client_payments cp
             JOIN appointment_billing ab ON ab.id = cp.billing_id
             LEFT JOIN appointments a ON a.id = ab.appointment_id
             WHERE cp.client_id = $1
             ORDER BY cp.created_at DESC`,
            [clientId]
        );

        res.json({
            ok: true,
            payments: rows
        });

    } catch (err) {
        console.error('Client payment history error:', err);
        res.status(500).json({
            error: 'Failed to load payment history'
        });
    }
});

/*--------Client Messages-------*/
app.post('/api/client/messages', async (req, res) => {
    try {
        const {
            clientId,
            subject = '',
            message = ''
        } = req.body || {};

        if (!clientId || !message.trim()) {
            return res.status(400).json({
                error: 'Client and message are required'
            });
        }

        // Find the latest appointment with assigned staff for this client
        const appointmentResult = await pool.query(
            `SELECT 
                id,
                staff_id
             FROM appointments
             WHERE client_id = $1
               AND staff_id IS NOT NULL
             ORDER BY appointment_date DESC, appointment_time DESC, created_at DESC
             LIMIT 1`,
            [clientId]
        );

        if (!appointmentResult.rows.length) {
            return res.status(400).json({
                error: 'No assigned staff member found for this client'
            });
        }

        const appointment = appointmentResult.rows[0];

        const { rows } = await pool.query(
            `INSERT INTO portal_messages
             (
                client_id,
                staff_id,
                appointment_id,
                sender_type,
                subject,
                message,
                created_at
             )
             VALUES ($1, $2, $3, 'client', $4, $5, NOW())
             RETURNING *`,
            [
                clientId,
                appointment.staff_id,
                appointment.id,
                subject.trim() || null,
                message.trim()
            ]
        );

        res.json({
            ok: true,
            message: rows[0]
        });

    } catch (err) {
        console.error('Client message send error:', err);
        res.status(500).json({
            error: 'Failed to send message'
        });
    }
});

app.get('/api/client/messages', async (req, res) => {
    try {
        const { clientId } = req.query;

        if (!clientId) {
            return res.status(400).json({
                error: 'Client ID required'
            });
        }

        const { rows } = await pool.query(
            `SELECT
                m.id,
                m.appointment_id,
                m.sender_type,
                m.subject,
                m.message,
                m.created_at,
                s.full_name AS staff_name
             FROM portal_messages m
             LEFT JOIN staff_users s ON s.id = m.staff_id
             WHERE m.client_id = $1
             ORDER BY m.created_at DESC`,
            [clientId]
        );

        res.json({
            ok: true,
            messages: rows
        });

    } catch (err) {
        console.error('Client messages fetch error:', err);
        res.status(500).json({
            error: 'Failed to load messages'
        });
    }
});

/*--------Client Document Request--------*/
app.get('/api/client/document-requests', async (req, res) => {
    try {
        const { clientId } = req.query;

        const { rows } = await pool.query(
            `SELECT
                dr.*,
                su.full_name AS staff_name

             FROM document_requests dr

             LEFT JOIN staff_users su
                ON dr.staff_id = su.id

             WHERE dr.client_id = $1

             ORDER BY dr.created_at DESC`,
            [clientId]
        );

        res.json({
            ok: true,
            requests: rows
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Failed to load requests'
        });
    }
});

/*-----Available Staff for Booking------*/
app.get('/api/booking-services', async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT service_name
             FROM staff_services
             WHERE service_name IS NOT NULL
               AND trim(service_name) <> ''
             ORDER BY service_name`
        );
        res.json({
            ok: true,
            services: rows.map((row) => row.service_name)
        });
    } catch (err) {
        console.error('Booking services error:', err);
        res.status(500).json({ error: 'Failed to load booking services' });
    }
});

app.get('/api/booking-providers', async (req, res) => {
    try {
        const service = String(req.query.service || '').trim();
        if (!service) {
            return res.status(400).json({ error: 'Service is required' });
        }

        const providerRes = await pool.query(
            `SELECT DISTINCT s.id, s.full_name, s.email, s.phone
             FROM staff_users s
             JOIN staff_services ss ON ss.staff_id = s.id
             WHERE ss.service_name = $1
             ORDER BY s.full_name`,
            [service]
        );

        const today = new Date();
        const providers = [];
        for (const provider of providerRes.rows) {
            let nextDate = null;
            let nextTime = null;
            for (let i = 0; i < 30; i += 1) {
                const probe = new Date(today);
                probe.setDate(today.getDate() + i);
                const isoDate = toIsoDate(probe);
                const slots = await getProviderSlotsForDate(provider.id, isoDate);
                if (slots.length) {
                    nextDate = isoDate;
                    nextTime = slots[0];
                    break;
                }
            }

            providers.push({
                ...provider,
                next_available_date: nextDate,
                next_available_time: nextTime
            });
        }

        res.json({
            ok: true,
            providers
        });
    } catch (err) {
        console.error('Booking providers error:', err);
        res.status(500).json({ error: 'Failed to load providers' });
    }
});

app.get('/api/booking-slots', async (req, res) => {
    try {
        const service = String(req.query.service || '').trim();
        const providerId = Number(req.query.providerId || 0);
        const date = String(req.query.date || '').trim();

        if (!service || !providerId || !date) {
            return res.status(400).json({
                error: 'Service, provider and date are required'
            });
        }

        const serviceCheck = await pool.query(
            `SELECT 1
             FROM staff_services
             WHERE staff_id = $1
               AND service_name = $2
             LIMIT 1`,
            [providerId, service]
        );
        if (!serviceCheck.rows.length) {
            return res.status(400).json({
                error: 'Selected provider does not offer this service.'
            });
        }

        const slots = await getProviderSlotsForDate(providerId, date);
        res.json({ ok: true, slots });
    } catch (err) {
        console.error('Booking slots error:', err);
        res.status(500).json({ error: 'Failed to load slots' });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const {
            clientId = null,
            staffId,
            fullName = '',
            email = '',
            phone = '',
            company = '',
            serviceName = '',
            meetingType = '',
            appointmentDate = '',
            appointmentTime = '',
            notes = '',
            bookingFee = 0
        } = req.body || {};

        if (!staffId || !fullName || !isEmail(email) || !phone || !serviceName || !meetingType || !appointmentDate || !appointmentTime) {
            return res.status(400).json({ error: 'Missing required booking fields' });
        }

        const serviceCheck = await pool.query(
            `SELECT 1
             FROM staff_services
             WHERE staff_id = $1 AND service_name = $2
             LIMIT 1`,
            [staffId, serviceName.trim()]
        );
        if (!serviceCheck.rows.length) {
            return res.status(400).json({
                error: 'Selected provider does not provide this service.'
            });
        }

        const validSlots = await getProviderSlotsForDate(staffId, appointmentDate);
        if (!validSlots.includes(String(appointmentTime).slice(0, 5))) {
            return res.status(409).json({
                error: 'This slot is no longer available. Please choose another time.'
            });
        }

        const resolvedClientId = await resolveClientIdForBooking({
            clientId,
            fullName,
            email,
            phone,
            serviceName
        });

        const fee = Number(bookingFee) || 0;
        const { rows } = await pool.query(
            `INSERT INTO appointments
            (
                client_id,
                staff_id,
                full_name,
                email,
                phone,
                company,
                service_name,
                meeting_type,
                appointment_date,
                appointment_time,
                notes,
                booking_fee,
                booking_status,
                created_at,
                updated_at
            )
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::time, $11, $12, 'Scheduled', NOW(), NOW())
            RETURNING *`,
            [
                resolvedClientId,
                staffId,
                String(fullName).trim(),
                String(email).trim().toLowerCase(),
                String(phone).trim(),
                String(company || '').trim() || null,
                serviceName,
                meetingType,
                appointmentDate,
                appointmentTime,
                String(notes || '').trim() || null,
                fee
            ]
        );

        try {
            await sendAppointmentConfirmationEmail(rows[0]);
        } catch (mailErr) {
            console.error('Booking email send failed:', mailErr);
        }
        return res.status(201).json({ ok: true, appointment: rows[0] });
    } catch (err) {
        console.error('Create booking error:', err);
        return res.status(500).json({ error: 'Failed to create booking' });
    }
});

app.get('/api/available-staff', async (req, res) => {

    try {

        const { date, time, service } = req.query;

        if (!date || !time || !service) {
            return res.status(400).json({
                error: 'Date, time, and service are required'
            });
        }

        const { rows } = await pool.query(

            `SELECT DISTINCT ON (s.id)

                s.id,
                s.full_name,
                s.email,
                s.phone,
                ss.service_name,

                CASE 
                    WHEN a.id IS NOT NULL 
                      OR pb.id IS NOT NULL 
                    THEN 'booked'

                    ELSE 'available'
                END AS availability_status

            FROM staff_availability sa

            JOIN staff_users s
                ON sa.staff_id = s.id

            JOIN staff_services ss
                ON ss.staff_id = s.id
               AND ss.service_name = $3

            LEFT JOIN appointments a
                ON a.staff_id = s.id
               AND a.appointment_date = $1
               AND a.appointment_time = $2::time
               AND a.booking_status IN (
                    'Scheduled',
                    'Confirmed',
                    'Pending Payment'
               )

            LEFT JOIN pending_bookings pb
                ON pb.staff_id = s.id
               AND pb.appointment_date = $1
               AND pb.appointment_time = $2::time
               AND pb.status = 'Pending'

            LEFT JOIN availability_change_requests acr
                ON acr.staff_id = s.id
               AND $1::date BETWEEN acr.start_date AND acr.end_date
               AND acr.status = 'Approved'

            WHERE sa.available_date = $1
              AND $2::time >= sa.start_time
              AND $2::time < sa.end_time
              AND sa.status = 'approved'

              AND acr.id IS NULL

            ORDER BY
                s.id,

                CASE
                    WHEN a.id IS NULL
                     AND pb.id IS NULL
                    THEN 0

                    ELSE 1
                END,

                s.full_name`,

            [date, time, service]

        );

        res.json({
            ok: true,
            staff: rows
        });

    } catch (err) {

        console.error('Available staff error:', err);

        res.status(500).json({
            error: 'Failed to fetch staff availability'
        });
    }
});

/*-------Client Appointment-------*/
app.post('/api/appointments', async (req, res) => {
    try {
        const {
            clientId,
            staffId,
            fullName = '',
            email = '',
            phone = '',
            company = '',
            serviceName = '',
            meetingType = '',
            appointmentDate = '',
            appointmentTime = '',
            notes = '',
            bookingFee = 0
        } = req.body || {};

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        if (!staffId || !fullName || !email || !phone || !serviceName || !meetingType || !appointmentDate || !appointmentTime) {
            return res.status(400).json({ error: 'Missing required appointment fields' });
        }

        const serviceCheck = await pool.query(
            `SELECT 1
     FROM staff_services
     WHERE staff_id = $1 AND service_name = $2
     LIMIT 1`,
            [staffId, serviceName.trim()]
        );

        if (!serviceCheck.rows.length) {
            return res.status(400).json({
                error: 'Selected staff does not provide this service.'
            });
        }

        // Prevent double booking
        const existing = await pool.query(
            `SELECT id
     FROM appointments
     WHERE staff_id = $1
       AND appointment_date = $2
       AND appointment_time = $3::time
       AND booking_status IN('Scheduled', 'Confirmed')
     LIMIT 1`,
            [staffId, appointmentDate, appointmentTime]
        );

        if (existing.rows.length > 0) {
            return res.status(409).json({
                error: 'This staff member is already booked for this session.'
            });
        }

        const fee = Number(bookingFee) || 0;

        const { rows } = await pool.query(
            `INSERT INTO appointments
            (client_id, email, staff_id, full_name, email, phone, company, service_name, meeting_type, appointment_date, appointment_time, notes, booking_fee, booking_status, created_at, updated_at)
     VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::time, $11, $12, 'Pending Payment', NOW(), NOW())
     RETURNING * `,
            [
                clientId,
                staffId,
                fullName.trim(),
                email.trim(),
                phone.trim(),
                company.trim() || null,
                serviceName,
                meetingType,
                appointmentDate,
                appointmentTime,
                notes.trim() || null,
                fee
            ]
        );
        const staffResult = await pool.query(
            `SELECT full_name FROM staff_users WHERE id = $1 LIMIT 1`,
            [staffId]
        );

        res.json({
            ok: true,
            appointment: {
                ...rows[0],
                staff_name: staffResult.rows[0]?.full_name || 'Not assigned'
            }
        });
    } catch (err) {
        console.error('Create appointment error:', err);
        res.status(500).json({ error: 'Failed to create appointment' });
    }
});


/*----- Booking Billing -------*/
app.post('/api/create-booking-billing', async (req, res) => {
    try {
        const {
            appointmentId,
            clientId,
            serviceName = '',
            bookingFee = 0
        } = req.body || {};

        if (!appointmentId || !clientId) {
            return res.status(400).json({ error: 'Appointment ID and Client ID are required' });
        }

        const booking = Number(bookingFee) || 0;
        const service = 0;
        const total = booking + service;
        const paid = 0;
        const due = total;
        const status = due === 0 ? 'Paid' : 'Pending';

        const existing = await pool.query(
            `SELECT id
             FROM appointment_billing
             WHERE appointment_id = $1
             LIMIT 1`,
            [appointmentId]
        );

        if (existing.rows.length) {
            return res.status(409).json({ error: 'Billing record already exists for this appointment' });
        }

        const result = await pool.query(
            `INSERT INTO appointment_billing
            (appointment_id, client_id, service_name, booking_fee, service_charge, total_charge, amount_paid, amount_due, payment_status, created_at, updated_at)
             VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
             RETURNING * `,
            [appointmentId, clientId, serviceName, booking, service, total, paid, due, status]
        );

        res.json({
            ok: true,
            billing: result.rows[0]
        });
    } catch (err) {
        console.error('Create booking billing error:', err);
        res.status(500).json({ error: 'Failed to create booking billing record' });
    }
});

/*-----Internal Login: Admin or Staff-----*/
app.post('/api/internal-login', async (req, res) => {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        let user = null;
        let userType = null;

        // 1. Check admins table first
        const adminResult = await pool.query(
            `SELECT id, full_name, email, password, role, verified
             FROM admins
             WHERE email = $1
             LIMIT 1`,
            [email.trim()]
        );

        if (adminResult.rows.length) {
            user = adminResult.rows[0];
            userType = 'admin';
        }

        // 2. If not admin, check staff_users table
        if (!user) {
            const staffResult = await pool.query(
                `SELECT id, full_name, email, password, verified
                 FROM staff_users
                 WHERE email = $1
                 LIMIT 1`,
                [email.trim()]
            );

            if (staffResult.rows.length) {
                user = staffResult.rows[0];
                userType = 'staff';
            }
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        if (!user.verified) {
            return res.status(403).json({ error: 'Account is not verified' });
        }

        const stored = user.password || '';
        let ok = false;

        if (
            stored.startsWith('$2a$') ||
            stored.startsWith('$2b$') ||
            stored.startsWith('$2y$')
        ) {
            ok = await bcrypt.compare(password, stored);
        } else {
            ok = password === stored;
        }

        if (!ok) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        res.json({
            ok: true,
            user: {
                id: user.id,
                name: user.full_name,
                email: user.email,
                role: userType
            }
        });
    } catch (err) {
        console.error('Internal login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/*-----Staff-------*/
app.get('/api/staff/me', async (req, res) => {
    try {
        const staffId = req.query.id;

        if (!staffId || isNaN(staffId)) {
            return res.status(400).json({ error: 'Invalid staff ID' });
        }

        const result = await pool.query(
            'SELECT id, full_name, email, phone FROM staff_users WHERE id = $1',
            [staffId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Staff not found' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

/*-------Staff Portal Messages------*/
app.get('/api/staff/messages', async (req, res) => {
    try {
        const staffId = Number(req.query.staffId);

        if (!staffId) {
            return res.status(400).json({
                error: 'Valid staff ID required'
            });
        }
        const { rows } = await pool.query(
            `SELECT
m.id, m.client_id, pc.name AS client_name,
               m.appointment_id, m.sender_type,
               m.subject, m.message, m.created_at
            FROM portal_messages m
            JOIN portal_clients pc ON pc.id = m.client_id
            WHERE m.staff_id = $1
            ORDER BY m.created_at DESC`,
            [staffId]
        );
        res.json({ ok: true, messages: rows });
    } catch (err) {
        console.error('Staff messages error:', err);
        res.status(500).json({ error: 'Failed to load messages' });
    }
});

app.post('/api/staff/messages', async (req, res) => {
    try {
        const {
            clientId,
            staffId,
            subject,
            message
        } = req.body;

        const { rows } = await pool.query(
            `INSERT INTO portal_messages
             (
                client_id,
                staff_id,
                sender_type,
                subject,
                message,
                created_at
             )
             VALUES ($1, $2, 'staff', $3, $4, NOW())
             RETURNING *`,
            [
                clientId,
                staffId,
                subject || null,
                message
            ]
        );

        res.json({
            ok: true,
            message: rows[0]
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: 'Failed to send message'
        });
    }
});
/*-------Staff Portal Appointments------*/
app.get('/api/staff/appointments', async (req, res) => {
    try {
        const staffId = Number(req.query.staffId);

        if (!staffId) {
            return res.status(400).json({
                error: 'Valid staff ID required'
            });
        }

        if (!staffId) {
            return res.status(400).json({
                error: 'Staff ID required'
            });
        }

        const { rows } = await pool.query(
            `SELECT
                a.id,
                a.client_id,
                a.staff_id,
                a.full_name AS client_name,
                a.email,
                a.phone,
                a.company,
                a.service_name,
                a.meeting_type,
                a.appointment_date,
                a.appointment_time,
                a.notes,
                a.booking_fee,
                a.booking_status,
                a.created_at
             FROM appointments a
             WHERE a.staff_id = $1
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [staffId]
        );

        res.json({
            ok: true,
            appointments: rows
        });

    } catch (err) {
        console.error('Staff appointments error:', err);
        res.status(500).json({
            error: 'Failed to load staff appointments'
        });
    }
});

/*--------Get Clients Booked With A Staff------*/
app.get('/api/staff/clients', async (req, res) => {
    try {

        const staffId = Number(req.query.staffId);

        if (!staffId) {
            return res.status(400).json({
                error: 'Valid staff ID required'
            });
        }

        const { rows } = await pool.query(
            `SELECT DISTINCT
                pc.id AS client_id,
                pc.name AS client_name

             FROM appointments a

             JOIN portal_clients pc
                ON a.client_id = pc.id

             WHERE a.staff_id = $1

             ORDER BY pc.name ASC`,
            [staffId]
        );

        res.json({
            ok: true,
            clients: rows
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: 'Failed to load clients'
        });
    }
});

/*------Staff Availability Block Request------*/
app.post('/api/staff/availability-change-request', async (req, res) => {
    try {
        const {
            staffId,
            startDate,
            endDate,
            reason = ''
        } = req.body || {};

        if (!staffId || !startDate || !endDate) {
            return res.status(400).json({
                error: 'Staff ID, start date, and end date are required'
            });
        }

        if (new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({
                error: 'End date cannot be before start date'
            });
        }

        const { rows } = await pool.query(
            `INSERT INTO availability_change_requests
             (
                staff_id,
                availability_id,
                start_date,
                end_date,
                reason,
                status,
                requested_at
             )
             VALUES ($1, NULL, $2, $3, $4, 'Pending', NOW())
             RETURNING *`,
            [
                staffId,
                startDate,
                endDate,
                reason || null
            ]
        );

        res.json({
            ok: true,
            request: rows[0]
        });

    } catch (err) {
        console.error('Availability request error:', err);
        res.status(500).json({
            error: 'Failed to submit availability request'
        });
    }
});

/*Document Request To Client-----*/
app.post('/api/staff/request-document', async (req, res) => {
    try {
        const {
            staffId,
            clientId,
            appointmentId,
            serviceName = '',
            documentTitle = '',
            message = ''
        } = req.body || {};

        if (!staffId || !clientId || !documentTitle.trim()) {
            return res.status(400).json({
                error: 'Staff, client, and document title are required'
            });
        }

        const ownershipCheck = await pool.query(
            `SELECT id
             FROM appointments
             WHERE staff_id = $1
               AND client_id = $2
             LIMIT 1`,
            [staffId, clientId]
        );

        if (!ownershipCheck.rows.length) {
            return res.status(403).json({
                error: 'This client is not assigned to this staff member'
            });
        }

        const { rows } = await pool.query(
            `INSERT INTO document_requests
             (
                client_id,
                staff_id,
                appointment_id,
                service_name,
                document_title,
                message,
                status,
                requested_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, 'Requested', NOW())
             RETURNING *`,
            [
                clientId,
                staffId,
                appointmentId || null,
                serviceName || null,
                documentTitle.trim(),
                message.trim() || null
            ]
        );

        res.json({
            ok: true,
            request: rows[0]
        });

    } catch (err) {
        console.error('Document request error:', err);
        res.status(500).json({
            error: 'Failed to request document'
        });
    }
});

/*-----Client Transfer Request------*/
app.post('/api/staff/client-transfer-request', async (req, res) => {
    try {
        const {
            appointmentId,
            clientId,
            fromStaffId,
            toStaffId,
            reason = ''
        } = req.body || {};

        if (!appointmentId || !clientId || !fromStaffId || !reason.trim()) {
            return res.status(400).json({
                error: 'Appointment, client, staff, and reason are required'
            });
        }

        const check = await pool.query(
            `SELECT id
             FROM appointments
             WHERE id = $1
               AND client_id = $2
               AND staff_id = $3
             LIMIT 1`,
            [appointmentId, clientId, fromStaffId]
        );

        if (!check.rows.length) {
            return res.status(403).json({
                error: 'This appointment does not belong to this staff member'
            });
        }

        const { rows } = await pool.query(
            `INSERT INTO client_transfer_requests
             (
                appointment_id,
                client_id,
                from_staff_id,
                to_staff_id,
                reason,
                status,
                requested_at
             )
             VALUES ($1, $2, $3, $4, $5, 'Pending', NOW())
             RETURNING *`,
            [
                appointmentId,
                clientId,
                fromStaffId,
                toStaffId || null,
                reason.trim()
            ]
        );

        res.json({
            ok: true,
            transferRequest: rows[0]
        });

    } catch (err) {
        console.error('Client transfer request error:', err);
        res.status(500).json({
            error: 'Failed to submit transfer request'
        });
    }
});

/*-------Staff Payment History-------*/
app.get('/api/staff/payment-history', async (req, res) => {
    try {
        const staffId = Number(req.query.staffId);

        if (!staffId) {
            return res.status(400).json({
                error: 'Valid staff ID required'
            });
        }

        if (!staffId) {
            return res.status(400).json({
                error: 'Staff ID required'
            });
        }

        const { rows } = await pool.query(
            `SELECT
                cp.id,
                cp.client_id,
                pc.name AS client_name,
                pc.email AS client_email,
                a.id AS appointment_id,
                a.service_name,
                cp.amount,
                cp.currency,
                cp.status,
                cp.created_at AS payment_date
             FROM client_payments cp
             JOIN appointment_billing ab ON ab.id = cp.billing_id
             JOIN appointments a ON a.id = ab.appointment_id
             JOIN portal_clients pc ON pc.id = cp.client_id
             WHERE a.staff_id = $1
             ORDER BY cp.created_at DESC`,
            [staffId]
        );

        res.json({
            ok: true,
            payments: rows
        });

    } catch (err) {
        console.error('Staff payment history error:', err);
        res.status(500).json({
            error: 'Failed to load payment history'
        });
    }
});

/*-------Staff Portal Document Requests------*/
app.get('/api/staff/document-requests', async (req, res) => {
    try {
        const staffId = Number(req.query.staffId);

        if (!staffId) {
            return res.status(400).json({
                error: 'Valid staff ID required'
            });
        }
        const { rows } = await pool.query(
            `SELECT
dr.id, dr.client_id, pc.name AS client_name,
               dr.appointment_id, dr.service_name,
               dr.document_title, dr.message,
               dr.status, dr.requested_at
            FROM document_requests dr
            JOIN portal_clients pc ON pc.id = dr.client_id
            WHERE dr.staff_id = $1
            ORDER BY dr.requested_at DESC`,
            [staffId]
        );
        res.json({ ok: true, requests: rows });
    } catch (err) {
        console.error('Document requests error:', err);
        res.status(500).json({ error: 'Failed to load document requests' });
    }
});

app.post('/api/staff/document-requests', async (req, res) => {
    try {
        const {
            clientId,
            staffId,
            appointmentId,
            serviceName = '',
            documentTitle = '',
            message = ''
        } = req.body || {};
        if (!clientId || !staffId || !documentTitle.trim()) {
            return res.status(400).json({ error: 'Missing document request details' });
        }
        const { rows } = await pool.query(
            `INSERT INTO document_requests
            (client_id, staff_id, appointment_id, service_name, document_title, message, status, requested_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'Requested', NOW())
            RETURNING *`,
            [
                clientId,
                staffId,
                appointmentId || null,
                serviceName,
                documentTitle.trim(),
                message.trim() || null
            ]
        );
        res.json({ ok: true, request: rows[0] });
    } catch (err) {
        console.error('Create document request error:', err);
        res.status(500).json({ error: 'Failed to create document request' });
    }
});

/*-------Staff Portal Document Payments------*/
app.get('/api/staff/payments', async (req, res) => {
    try {
        const staffId = Number(req.query.staffId);

        if (!staffId) {
            return res.status(400).json({
                error: 'Valid staff ID required'
            });
        }
        const { rows } = await pool.query(
            `SELECT
cp.id, pc.name AS client_name,
               a.service_name,
               cp.amount,
               cp.currency,
               cp.status,
               cp.created_at AS payment_date
            FROM client_payments cp
            JOIN appointment_billing ab ON ab.id = cp.billing_id
            JOIN appointments a ON a.id = ab.appointment_id
            JOIN portal_clients pc ON pc.id = cp.client_id
            WHERE a.staff_id = $1
            ORDER BY cp.created_at DESC`,
            [staffId]
        );
        res.json({ ok: true, payments: rows });
    } catch (err) {
        console.error('Staff payments error:', err);
        res.status(500).json({ error: 'Failed to load staff payments' });
    }
});

/*------Admin Appointments-------*/

app.get('/api/admin/appointments', async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT 
                a.id, a.client_id, a.staff_id,
            a.full_name, a.email, a.phone, a.company,
            a.service_name, a.meeting_type,
            a.appointment_date, a.appointment_time,
            a.notes, a.booking_fee, a.booking_status, a.created_at,
            s.full_name AS staff_name
             FROM appointments a
             LEFT JOIN staff_users s ON a.staff_id = s.id
             ORDER BY a.created_at DESC`
        );

        res.json({
            ok: true,
            appointments: rows
        });
    } catch (err) {
        console.error('Admin appointments fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

/*------Update appointment from admin portal----*/

app.put('/api/admin/appointments/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const {
            fullName = '',
            appointmentDate = '',
            appointmentTime = '',
            serviceName = '',
            meetingType = '',
            bookingStatus = 'Scheduled',
            notes = ''
        } = req.body || {};

        const { rows } = await pool.query(
            `UPDATE appointments
             SET full_name = $1,
            appointment_date = $2,
            appointment_time = $3,
            service_name = $4,
            meeting_type = $5,
            booking_status = $6,
            notes = $7,
            updated_at = NOW()
             WHERE id = $8
             RETURNING * `,
            [
                fullName.trim(),
                appointmentDate,
                appointmentTime,
                serviceName,
                meetingType,
                bookingStatus,
                notes.trim() || null,
                appointmentId
            ]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({
            ok: true,
            appointment: rows[0]
        });
    } catch (err) {
        console.error('Admin appointment update error:', err);
        res.status(500).json({ error: 'Failed to update appointment' });
    }
});

/*------Delete appointment from admin portal------*/

app.delete('/api/admin/appointments/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const { rowCount } = await pool.query(
            `DELETE FROM appointments
             WHERE id = $1`,
            [appointmentId]
        );

        if (!rowCount) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('Admin appointment delete error:', err);
        res.status(500).json({ error: 'Failed to delete appointment' });
    }
});

/*------Admin Billing------*/

app.put('/api/admin/billing/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const {
            clientId,
            serviceName = '',
            bookingFee = 0,
            serviceCharge = 0,
            amountPaid = 0
        } = req.body || {};

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        const booking = Number(bookingFee) || 0;
        const service = Number(serviceCharge) || 0;
        const paid = Number(amountPaid) || 0;

        const total = booking + service;
        const due = Math.max(total - paid, 0);
        const status = due === 0 ? 'Paid' : 'Pending';

        const existing = await pool.query(
            `SELECT id
             FROM appointment_billing
             WHERE appointment_id = $1
             LIMIT 1`,
            [appointmentId]
        );

        let result;

        if (existing.rows.length) {
            result = await pool.query(
                `UPDATE appointment_billing
                 SET client_id = $1,
            service_name = $2,
            booking_fee = $3,
            service_charge = $4,
            total_charge = $5,
            amount_paid = $6,
            amount_due = $7,
            payment_status = $8,
            updated_at = NOW()
                 WHERE appointment_id = $9
                 RETURNING * `,
                [clientId, serviceName, booking, service, total, paid, due, status, appointmentId]
            );
        } else {
            result = await pool.query(
                `INSERT INTO appointment_billing
            (appointment_id, client_id, service_name, booking_fee, service_charge, total_charge, amount_paid, amount_due, payment_status, created_at, updated_at)
                 VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                 RETURNING * `,
                [appointmentId, clientId, serviceName, booking, service, total, paid, due, status]
            );
        }

        res.json({
            ok: true,
            billing: result.rows[0]
        });
    } catch (err) {
        console.error('Admin billing update error:', err);
        res.status(500).json({ error: 'Failed to update billing' });
    }
});

/* ---------- STRIPE PAYMENT ---------- */
app.get('/api/charges', async (req, res) => {
    try {
        const { clientId } = req.query;

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        const { rows } = await pool.query(
            `SELECT appointment_id, service_name, booking_fee, service_charge, total_charge, amount_paid, amount_due, payment_status
             FROM appointment_billing
             WHERE client_id = $1
             ORDER BY updated_at DESC
             LIMIT 1`,
            [clientId]
        );

        if (!rows.length) {
            return res.json({
                appointmentId: null,
                bookingFee: 0,
                serviceCharge: 0,
                totalCharge: 0,
                amountPaid: 0,
                totalDue: 0,
                status: 'Up to date',
                serviceName: 'Not assigned'
            });
        }

        const row = rows[0];

        res.json({
            appointmentId: row.appointment_id,
            bookingFee: row.booking_fee,
            serviceCharge: row.service_charge,
            totalCharge: row.total_charge,
            amountPaid: row.amount_paid,
            totalDue: row.amount_due,
            status: row.payment_status,
            serviceName: row.service_name
        });
    } catch (err) {
        console.error('Charges fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch charges' });
    }
});

/*------ Payment Intent -------*/
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { clientId } = req.body || {};

        if (!clientId) {
            return res.status(400).json({ error: 'Client ID required' });
        }

        const { rows } = await pool.query(
            `SELECT id, service_name, amount_due
             FROM appointment_billing
             WHERE client_id = $1
             ORDER BY updated_at DESC
             LIMIT 1`,
            [clientId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'No billing record found' });
        }

        const billing = rows[0];
        const amountDue = Number(billing.amount_due || 0);

        if (amountDue <= 0) {
            return res.status(400).json({ error: 'No outstanding balance to pay' });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountDue,
            currency: 'aud',
            automatic_payment_methods: { enabled: true },
            metadata: {
                clientId: String(clientId),
                billingId: String(billing.id),
                serviceName: billing.service_name || 'Appointment payment'
            }
        });

        // Save payment intent ID so webhook can match the correct billing row
        await pool.query(
            `UPDATE appointment_billing
             SET stripe_payment_intent_id = $1,
            updated_at = NOW()
             WHERE id = $2`,
            [paymentIntent.id, billing.id]
        );

        res.json({
            clientSecret: paymentIntent.client_secret,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        });
    } catch (err) {
        console.error('Stripe error:', err);
        res.status(500).json({ error: 'Payment initialization failed' });
    }
});

/*-------- Other Payment Routes ---------*/
app.post('/api/create-pending-booking-payment-intent', async (req, res) => {

    try {

        const {
            clientId,
            staffId,
            fullName,
            email,
            phone,
            company,
            serviceName,
            meetingType,
            appointmentDate,
            appointmentTime,
            notes,
            bookingFee
        } = req.body || {};

        if (
            !clientId ||
            !staffId ||
            !fullName ||
            !email ||
            !phone ||
            !serviceName ||
            !meetingType ||
            !appointmentDate ||
            !appointmentTime ||
            !bookingFee
        ) {
            return res.status(400).json({
                error: 'Missing booking details'
            });
        }

        // Prevent double booking BEFORE payment
        const existingAppointment = await pool.query(
            `SELECT id
     FROM appointments
     WHERE staff_id = $1
       AND appointment_date = $2
       AND appointment_time = $3::time
       AND booking_status IN ('Scheduled', 'Confirmed', 'Pending Payment')
     LIMIT 1`,
            [staffId, appointmentDate, appointmentTime]
        );

        if (existingAppointment.rows.length > 0) {
            return res.status(409).json({
                error: 'This staff member is already booked for this session.'
            });
        }

        const existingPending = await pool.query(
            `SELECT id
     FROM pending_bookings
     WHERE staff_id = $1
       AND appointment_date = $2
       AND appointment_time = $3::time
       AND status = 'Pending'
     LIMIT 1`,
            [staffId, appointmentDate, appointmentTime]
        );

        if (existingPending.rows.length > 0) {
            return res.status(409).json({
                error: 'This staff member is already in the process of being booked for this session.'
            });
        }

        // Create Stripe payment intent
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Number(bookingFee),
            currency: 'aud',
            automatic_payment_methods: {
                enabled: true
            },
            metadata: {
                clientId: String(clientId),
                serviceName: serviceName || 'Appointment booking'
            }
        });

        // Save temporary booking
        await pool.query(
            `INSERT INTO pending_bookings
            (
                stripe_payment_intent_id,
                client_id,
                staff_id,
                full_name,
                email,
                phone,
                company,
                service_name,
                meeting_type,
                appointment_date,
                appointment_time,
                notes,
                booking_fee,
                status,
                created_at
            )
            VALUES
            (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Pending',NOW()
            )`,
            [
                paymentIntent.id,
                clientId,
                staffId,
                fullName.trim(),
                email.trim(),
                phone.trim(),
                company?.trim() || null,
                serviceName,
                meetingType,
                appointmentDate,
                appointmentTime,
                notes?.trim() || null,
                Number(bookingFee)
            ]
        );

        res.json({
            clientSecret: paymentIntent.client_secret,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
        });

    } catch (err) {

        console.error('Pending booking payment intent error:', err);

        res.status(500).json({
            error: 'Payment initialization failed'
        });
    }
});

/* -- DB Info -- */
app.get('/api/dbinfo', async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT current_database() AS db,
            current_user AS usr,
            inet_server_addr():: text AS host,
            inet_server_port() AS port,
            current_schema() AS schema
            `);
        res.json(rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'dbinfo failed' });
    }
});

/* ---------- Multer Error Handler ---------- */
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
        }
        return res.status(400).json({ error: err.message });
    }

    if (err) {
        return res.status(400).json({ error: err.message || 'Upload failed' });
    }

    next();
});

/* ---------- Start ---------- */
app.listen(PORT, () => {
    console.log(`✅ API running on http://localhost:${PORT}`);
});