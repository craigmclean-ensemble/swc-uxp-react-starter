# OAuth helper server

This server runs on **localhost:8000** and handles the OAuth flow between your Photoshop UXP plugin and Dropbox (or another provider). The plugin opens the browser to `/login`, and after the user signs in, the server stores the token and the plugin polls `/getCredentials` to get it.

## 1. Get your Dropbox app secret

- Go to [Dropbox App Console](https://www.dropbox.com/developers/apps).
- Open your app (or create one). Use the same **App key** as in `src/oauth.local.ts`.
- Under **OAuth 2** → **Redirect URIs**, add: `http://localhost:8000/callback`.
- Copy the **App secret** (you’ll use it only in the server, not in the plugin).

## 2. Set environment variables

Use your App key and App secret (same key as in `oauth.local.ts`):

**macOS (terminal):**

```bash
export DROPBOX_APP_KEY="your_app_key_here"
export DROPBOX_APP_SECRET="your_app_secret_here"
```

**Optional:** Create a `.env` file in the project root and install `dotenv`:

```bash
npm install dotenv
```

Then in `server/oauth-server.js` add at the top: `import 'dotenv/config';`  
And in `.env` (add `.env` to `.gitignore` if it isn’t already):

```
DROPBOX_APP_KEY=your_app_key_here
DROPBOX_APP_SECRET=your_app_secret_here
```

## 3. Start the server

From the project root:

```bash
npm run server
```

You should see:

```
OAuth helper server: http://localhost:8000
  /login?requestId=xxx  -> redirect to Dropbox
  /callback             -> receive code, exchange token
  /getCredentials?requestId=xxx -> plugin polls for token
```

Leave this terminal running. In Photoshop, open your plugin and click Connect; the browser will open and the plugin will receive the token after you sign in.
