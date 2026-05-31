#!/usr/bin/env node
/** Run: node test-email.js [recipient@email.com] */
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || '').replace(/\s+/g, '');
const to = (process.argv[2] || user || '').trim();

if (!user || !pass) {
    console.error('Set EMAIL_USER and EMAIL_PASS in api/.env first.');
    process.exit(1);
}

const host = (process.env.SMTP_HOST || '').trim();
const transport = host
    ? nodemailer.createTransport({
          host,
          port: Number(process.env.SMTP_PORT || 587),
          secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
          auth: { user, pass }
      })
    : nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });

try {
    await transport.verify();
    console.log('SMTP login OK');
    const info = await transport.sendMail({
        from: `"Constant & Co" <${user}>`,
        to,
        subject: 'Constant & Co — test booking email',
        text: 'If you received this, appointment confirmation emails will work.'
    });
    console.log('Sent to', to, '— messageId:', info.messageId);
} catch (err) {
    console.error('FAILED:', err.message);
    console.error('\nGmail: use App Password from https://myaccount.google.com/apppasswords (2FA required).');
    console.error('Or use free Mailtrap: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env');
    process.exit(1);
}
