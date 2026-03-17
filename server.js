import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { closeMssqlPool, createMssqlRouter, getMssqlConfigStatus } from './src/api/mssql/index.js';
import { createPlatformRouter } from './src/api/platform/router.js';

dotenv.config();

async function createServer() {
  const app = express();

  const getEviaClientId = () => process.env.EVIA_SIGN_CLIENT_ID || process.env.VITE_EVIA_SIGN_CLIENT_ID || '';
  const getEviaClientSecret = () => process.env.EVIA_SIGN_CLIENT_SECRET || process.env.VITE_EVIA_SIGN_CLIENT_SECRET || '';

  const sendEmail = async ({ to, subject, html, text, from, fromName }) => {
    const apiKey = process.env.SENDGRID_API_KEY || process.env.VITE_SENDGRID_API_KEY;

    if (!apiKey) {
      return {
        success: true,
        simulated: true,
        message: 'Email simulated - SENDGRID_API_KEY is not configured.'
      };
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: from || process.env.DEFAULT_FROM_EMAIL || 'noreply@khrentals.com',
          name: fromName || process.env.DEFAULT_FROM_NAME || 'KH Rentals'
        },
        subject,
        content: [
          ...(text ? [{ type: 'text/plain', value: text }] : []),
          ...(html ? [{ type: 'text/html', value: html }] : [])
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `SendGrid request failed with status ${response.status}`);
    }

    return {
      success: true,
      simulated: false,
      message: 'Email sent successfully.'
    };
  };

  const exchangeEviaToken = async ({ grantType, code, refreshToken, redirectUri }) => {
    const clientId = getEviaClientId();
    const clientSecret = getEviaClientSecret();

    if (!clientId || !clientSecret) {
      throw new Error('Evia Sign server credentials are not configured.');
    }

    const payload = {
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: grantType
    };

    if (grantType === 'authorization_code') {
      payload.code = code;
      payload.redirect_uri = redirectUri;
    }

    if (grantType === 'refresh_token') {
      payload.refresh_token = refreshToken;
    }

    const tokenUrl = 'https://evia.enadocapp.com/_apis/falcon/auth/api/v1/Token';

    const jsonResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (jsonResponse.ok) {
      return jsonResponse.json();
    }

    const fallbackBody = new URLSearchParams();
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        fallbackBody.append(key, value);
      }
    });

    const formResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: fallbackBody.toString()
    });

    if (!formResponse.ok) {
      const errorText = await formResponse.text();
      throw new Error(errorText || `Evia token request failed with status ${formResponse.status}`);
    }

    return formResponse.json();
  };

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      server: 'kh-rentals-dev-server',
      database: getMssqlConfigStatus()
    });
  });

  app.post('/api/send-email', async (req, res, next) => {
    try {
      const { to, subject, html, text, from, fromName } = req.body || {};

      if (!to || !subject || (!html && !text)) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: to, subject, and either html or text.'
        });
        return;
      }

      const result = await sendEmail({ to, subject, html, text, from, fromName });
      res.json({
        ...result,
        to,
        subject,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/evia/token', async (req, res, next) => {
    try {
      const { grantType, code, refreshToken, redirectUri } = req.body || {};

      if (!grantType || !['authorization_code', 'refresh_token'].includes(grantType)) {
        res.status(400).json({
          success: false,
          error: 'grantType must be authorization_code or refresh_token.'
        });
        return;
      }

      if (grantType === 'authorization_code' && (!code || !redirectUri)) {
        res.status(400).json({
          success: false,
          error: 'code and redirectUri are required for authorization_code.'
        });
        return;
      }

      if (grantType === 'refresh_token' && !refreshToken) {
        res.status(400).json({
          success: false,
          error: 'refreshToken is required for refresh_token.'
        });
        return;
      }

      const data = await exchangeEviaToken({ grantType, code, refreshToken, redirectUri });
      res.json(data);
    } catch (error) {
      next(error);
    }
  });

  app.use('/api/mssql', createMssqlRouter());
  app.use('/api/platform', createPlatformRouter());
  app.use('/storage', express.static(path.resolve(process.cwd(), 'public', 'storage')));

  const vite = await createViteServer({
    server: { middlewareMode: true }
  });

  app.use(vite.middlewares);

  app.use((error, _req, res, _next) => {
    console.error('[Server] Unhandled API error:', error);

    res.status(500).json({
      error: error.message || 'Unexpected server error'
    });
  });

  const port = Number(process.env.PORT) || 5174;
  const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log('[Server] MSSQL status:', getMssqlConfigStatus());
  });

  const shutdown = async () => {
    console.log('\n[Server] Shutting down...');
    server.close();
    await closeMssqlPool().catch((error) => {
      console.error('[Server] Error closing MSSQL pool:', error);
    });
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

createServer().catch((error) => {
  console.error('[Server] Failed to start:', error);
  process.exit(1);
});