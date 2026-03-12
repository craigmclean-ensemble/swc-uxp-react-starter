/**
 * Minimal OAuth helper server for the Photoshop UXP plugin.
 * Run: node server/oauth-server.js
 * Requires: DROPBOX_APP_KEY and DROPBOX_APP_SECRET (from your Dropbox app console).
 *
 * Flow:
 * 1. Plugin opens http://localhost:8000/login?requestId=xxx in the browser.
 * 2. Server redirects to Dropbox; user signs in and approves.
 * 3. Dropbox redirects to /callback?code=...&state=requestId.
 * 4. Server exchanges code for token, stores by requestId, shows success page.
 * 5. Plugin polls GET /getCredentials?requestId=xxx until token is returned.
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

const PORT = Number(process.env.OAUTH_PORT) || 8000;

// Load from env (create .env or export before running)
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY || '';
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET || '';
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = 'files.metadata.read files.content.read files.content.write';
const AUTHORIZE_URL = 'https://www.dropbox.com/oauth2/authorize';
const TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';

// In-memory: requestId -> { accessToken, refreshToken?, expiry }
const tokensByRequestId = new Map();

function send(res, statusCode, body, contentType = 'text/html') {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
}

function sendJson(res, statusCode, data) {
  send(res, statusCode, JSON.stringify(data), 'application/json');
}

function getQuery(req) {
  const u = new URL(req.url || '', `http://localhost:${PORT}`);
  return Object.fromEntries(u.searchParams);
}

async function exchangeCodeForToken(code) {
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: REDIRECT_URI,
    client_id: DROPBOX_APP_KEY,
    client_secret: DROPBOX_APP_SECRET,
  }).toString();

  return new Promise((resolve, reject) => {
    const req = https.request(
      TOKEN_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (ch) => (data += ch));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) reject(new Error(json.error_description || json.error));
            else
              resolve({
                accessToken: json.access_token,
                refreshToken: json.refresh_token || null,
                expiry: json.expires_in ? Date.now() + json.expires_in * 1000 : null,
              });
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const path = new URL(req.url || '', `http://localhost:${PORT}`).pathname;

  // GET /login?requestId=xxx → redirect to Dropbox
  if (path === '/login' && req.method === 'GET') {
    const { requestId } = getQuery(req);
    if (!requestId) {
      send(res, 400, 'Missing requestId');
      return;
    }
    const authUrl = new URL(AUTHORIZE_URL);
    authUrl.searchParams.set('client_id', DROPBOX_APP_KEY);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('state', requestId);
    authUrl.searchParams.set('token_access_type', 'offline');
    res.writeHead(302, { Location: authUrl.toString() });
    res.end();
    return;
  }

  // GET /callback?code=...&state=requestId → exchange token, store, show success
  if (path === '/callback' && req.method === 'GET') {
    const { code, state: requestId, error } = getQuery(req);
    if (error) {
      send(res, 200, `<!DOCTYPE html><html><body><p>Authorization denied or error: ${error}</p></body></html>`);
      return;
    }
    if (!code || !requestId) {
      send(res, 400, 'Missing code or state');
      return;
    }
    try {
      const tokenData = await exchangeCodeForToken(code);
      tokensByRequestId.set(requestId, tokenData);
      send(
        res,
        200,
        `<!DOCTYPE html><html><body><p>Success! You can close this window and return to Photoshop.</p></body></html>`
      );
    } catch (e) {
      send(res, 200, `<!DOCTYPE html><html><body><p>Token exchange failed: ${e.message}</p></body></html>`);
    }
    return;
  }

  // GET /getCredentials?requestId=xxx → return token when ready (plugin polls)
  if (path === '/getCredentials' && req.method === 'GET') {
    const { requestId } = getQuery(req);
    if (!requestId) {
      sendJson(res, 400, { error: 'Missing requestId' });
      return;
    }
    const tokenData = tokensByRequestId.get(requestId);
    if (!tokenData) {
      sendJson(res, 202, {}); // not ready yet
      return;
    }
    tokensByRequestId.delete(requestId); // one-time use
    sendJson(res, 200, {
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken ?? null,
      expiry: tokenData.expiry ?? null,
    });
    return;
  }

  send(res, 404, 'Not found');
});

server.listen(PORT, () => {
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
    console.error('Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET (env or .env).');
    console.error('Example: DROPBOX_APP_KEY=xxx DROPBOX_APP_SECRET=yyy node server/oauth-server.js');
    process.exit(1);
  }
  console.log(`OAuth helper server: http://localhost:${PORT}`);
  console.log('  /login?requestId=xxx  -> redirect to Dropbox');
  console.log('  /callback             -> receive code, exchange token');
  console.log('  /getCredentials?requestId=xxx -> plugin polls for token');
});
