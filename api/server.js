// server.js  (ES module)
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* ---------- Middleware ---------- */
app.use(cors({ origin: true }));
app.use(express.json());

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

/* ---------- Tiny request log ---------- */
app.use((req, _res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

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

/* ---------- Helpers ---------- */
const isEmail = (s = '') => /^\S+@\S+\.\S+$/.test(s);

/* ============================================================================
   ROUTES
============================================================================ */

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

        if (!row) return res.status(200).json({ message: 'Already subscribed' });
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

/* -- SIGNUP (with strong-password rule) -- */
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

        // Strong password: ≥8 chars, at least one digit and one special
        const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;

        if (!name.trim() || !isEmail(email)) {
            return res.status(400).json({ error: 'Please provide a valid name and email.' });
        }
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                error:
                    'Password must be at least 8 characters long and include at least one number and one special character.',
            });
        }

        // Already registered?
        const { rows: existing } = await pool.query(
            'SELECT id FROM portal_clients WHERE email = $1 LIMIT 1',
            [email.trim()]
        );
        if (existing.length) {
            return res.status(409).json({ error: 'Email already registered. Please log in instead.' });
        }

        // Hash and store in the `password` column (make sure your table has this column)
        const hash = await bcrypt.hash(password, 10);

        const insertSql = `
      INSERT INTO portal_clients
        (name, email, password, phone, client_type, service, note, created_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, name, email, created_at
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

/* -- LOGIN (works with hashed or legacy plain-text) -- */
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // IMPORTANT: this selects the `password` column
        const { rows } = await pool.query(
            'SELECT id, name, email, password FROM portal_clients WHERE email = $1 LIMIT 1',
            [email.trim()]
        );
        const user = rows[0];
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const stored = user.password || '';
        let ok = false;

        // If it looks like a bcrypt hash, compare; else allow legacy plain-text match.
        if (stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')) {
            ok = await bcrypt.compare(password, stored);
        } else {
            ok = password === stored;
        }

        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        res.json({ ok: true, client: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

/* -- DB Info (debug) -- */
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

/* ---------- Start ---------- */
app.listen(PORT, () => {
    console.log(`✅ API running on http://localhost:${PORT}`);
});
