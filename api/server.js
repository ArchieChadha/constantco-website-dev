// server.js (ES module)
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import Stripe from 'stripe';

dotenv.config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

        // Record the event first
        await client.query(
            `INSERT INTO processed_stripe_events
             (stripe_event_id, event_type, created_at)
             VALUES ($1, $2, NOW())`,
            [event.id, event.type]
        );

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const paidAmount = Number(paymentIntent.amount_received || paymentIntent.amount || 0);
            const currency = paymentIntent.currency || 'aud';

            // 2. Find the billing record for this payment intent
            const billingResult = await client.query(
                `SELECT id, client_id, total_charge, amount_paid
                 FROM appointment_billing
                 WHERE stripe_payment_intent_id = $1
                 LIMIT 1`,
                [paymentIntent.id]
            );

            if (!billingResult.rows.length) {
                throw new Error(`No billing record found for payment intent ${paymentIntent.id}`);
            }

            const billing = billingResult.rows[0];

            // 3. Deduplicate by payment intent ID too
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
                     (billing_id, client_id, stripe_payment_intent_id, amount, currency, status, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                    [
                        billing.id,
                        billing.client_id,
                        paymentIntent.id,
                        paidAmount,
                        currency,
                        'succeeded'
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
            }
        }

        if (event.type === 'payment_intent.payment_failed') {
            const paymentIntent = event.data.object;

            await client.query(
                `UPDATE appointment_billing
                 SET payment_status = 'Failed',
                     updated_at = NOW()
                 WHERE stripe_payment_intent_id = $1`,
                [paymentIntent.id]
            );
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

app.use(express.static(path.join(process.cwd(), 'src')));

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
            `SELECT id, service, client_type, note
             FROM portal_clients
             WHERE id = $1
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

app.post('/api/appointments', async (req, res) => {
    try {
        const {
            clientId,
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

        if (!fullName || !email || !phone || !serviceName || !meetingType || !appointmentDate || !appointmentTime) {
            return res.status(400).json({ error: 'Missing required appointment fields' });
        }

        const fee = Number(bookingFee) || 0;

        const { rows } = await pool.query(
            `INSERT INTO appointments
             (client_id, full_name, email, phone, company, service_name, meeting_type, appointment_date, appointment_time, notes, booking_fee, booking_status, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Scheduled', NOW(), NOW())
             RETURNING *`,
            [
                clientId,
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

        res.json({
            ok: true,
            appointment: rows[0]
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
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
             RETURNING *`,
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

/*------Appointments-------*/

app.get('/api/admin/appointments', async (_req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT id, client_id, full_name, email, phone, company, service_name, meeting_type,
                    appointment_date, appointment_time, notes, booking_fee, booking_status, created_at
             FROM appointments
             ORDER BY created_at DESC`
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

app.get('/api/admin/appointments/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const { rows } = await pool.query(
            `SELECT *
             FROM appointments
             WHERE id = $1
             LIMIT 1`,
            [appointmentId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        res.json({
            ok: true,
            appointment: rows[0]
        });
    } catch (err) {
        console.error('Admin appointment fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch appointment' });
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
                 RETURNING *`,
                [clientId, serviceName, booking, service, total, paid, due, status, appointmentId]
            );
        } else {
            result = await pool.query(
                `INSERT INTO appointment_billing
                 (appointment_id, client_id, service_name, booking_fee, service_charge, total_charge, amount_paid, amount_due, payment_status, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
                 RETURNING *`,
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

/* -- DB Info -- */
app.get('/api/dbinfo', async (_req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT current_database() AS db,
                   current_user AS usr,
                   inet_server_addr()::text AS host,
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