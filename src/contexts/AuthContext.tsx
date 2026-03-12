import {
  DROPBOX_ACCESS_TOKEN_KEY,
  OAUTH_SERVER_URL,
} from '../oauth.local';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { OAuthUtils } from '../utils/OAuthUtils';
import { setAuthToken } from '../api/client';

interface Auth {
  isAuthorized: boolean;
  loading: boolean;
  accessToken: string | null;
  handleConnect: () => void;
  handleDisconnect: () => void;
  error: boolean;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

/** Generates a simple unique id for the OAuth request (server will associate token with this). */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

const LOG_PREFIX = '[OAuth]';

/** UXP secureStorage may return values as Uint8Array/ArrayBuffer; decode to string. (No TextDecoder in UXP.) */
function storageValueToString(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === 'string') return raw;
  let bytes: Uint8Array;
  if (raw instanceof ArrayBuffer) bytes = new Uint8Array(raw);
  else if (raw instanceof Uint8Array) bytes = raw;
  else if (Array.isArray(raw) && raw.every((x) => typeof x === 'number')) {
    return String.fromCharCode(...raw);
  } else {
    return String(raw);
  }
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return s;
}

/** Poll server for token until we get it or timeout. */
async function pollForToken(requestId: string): Promise<{ accessToken: string; refreshToken?: string; expiry?: number } | null> {
  const maxAttempts = 120; // ~2 min at 1s interval
  const intervalMs = 1000;
  console.log(`${LOG_PREFIX} Polling for token (requestId: ${requestId.slice(0, 12)}…), max ${maxAttempts} attempts`);

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const url = `${OAUTH_SERVER_URL}/getCredentials?requestId=${encodeURIComponent(requestId)}`;
      const res = await fetch(url);
      const text = await res.text();
      if (!res.ok) {
        if (i === 0 || i % 10 === 9) console.log(`${LOG_PREFIX} Poll attempt ${i + 1}: status ${res.status}, waiting…`);
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }
      let data: { accessToken?: string; refreshToken?: string; expiry?: number; expires_in?: number };
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        if (i === 0 || i % 10 === 9) console.log(`${LOG_PREFIX} Poll attempt ${i + 1}: response not JSON, waiting…`);
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }
      if (data.accessToken) {
        console.log(`${LOG_PREFIX} Token received on attempt ${i + 1}`);
        return {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiry: data.expiry ?? (data.expires_in ? Date.now() + data.expires_in * 1000 : undefined),
        };
      }
    } catch (e) {
      if (i === 0 || i % 10 === 9) console.log(`${LOG_PREFIX} Poll attempt ${i + 1} error:`, e);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.log(`${LOG_PREFIX} Polling timed out after ${maxAttempts} attempts`);
  return null;
}

export const AuthContext = createContext<Auth | null>(null);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const uxp = require('uxp') as typeof import('uxp');
  const storage = uxp.storage.secureStorage;
  const [oauthUtils] = useState<OAuthUtils>(() => new OAuthUtils(storage));
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const checkAccessToken = async () => {
      try {
        console.log(`${LOG_PREFIX} Checking for existing token…`);
        const raw = await storage.getItem(DROPBOX_ACCESS_TOKEN_KEY);
        console.log(`${LOG_PREFIX} getItem returned, type: ${raw == null ? 'null/undefined' : typeof raw}`);
        const token_id = storageValueToString(raw);
        if (!token_id) {
          console.log(`${LOG_PREFIX} No stored token id`);
          return;
        }
        console.log(`${LOG_PREFIX} Found token id, fetching token…`);
        const token = await oauthUtils.getAccessToken(token_id);
        if (token) {
          console.log(`${LOG_PREFIX} Restored session (token id: ${token_id.slice(0, 12)}…)`);
          setAccessToken(token);
          setAuthToken(token);
          setIsAuthorized(true);
        } else {
          console.log(`${LOG_PREFIX} getAccessToken returned no token`);
        }
      } catch (e) {
        console.log(`${LOG_PREFIX} Stored token invalid or expired:`, e);
      }
    };

    checkAccessToken();
  }, [oauthUtils, storage]);

  const handleConnect = useCallback(async () => {
    setLoading(true);
    setError(false);
    console.log(`${LOG_PREFIX} Connect started`);

    try {
      const requestId = generateRequestId();
      const loginUrl = `${OAUTH_SERVER_URL}/login?requestId=${encodeURIComponent(requestId)}`;
      console.log(`${LOG_PREFIX} Opening browser: ${loginUrl}`);

      await uxp.shell.openExternal(loginUrl);
      console.log(`${LOG_PREFIX} Browser opened; polling server for token…`);

      // Server handles OAuth with Dropbox and stores token by requestId; we poll until it’s ready.
      const tokenData = await pollForToken(requestId);

      if (!tokenData) {
        setError(true);
        console.error(`${LOG_PREFIX} Failed: timed out or no token from server`);
        return;
      }

      console.log(`${LOG_PREFIX} Storing token in secure storage…`);
      const expiry = tokenData.expiry ?? Date.now() + 3600 * 1000;
      const tokenPayload = JSON.stringify({
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken ?? null,
        expiry,
      });
      await storage.setItem(requestId, tokenPayload);
      await storage.setItem(DROPBOX_ACCESS_TOKEN_KEY, requestId);

      setAccessToken(tokenData.accessToken);
      setAuthToken(tokenData.accessToken);
      setIsAuthorized(true);
      console.log(`${LOG_PREFIX} Connect complete; you are logged in`);
    } catch (e) {
      setError(true);
      console.error(`${LOG_PREFIX} Authorization failed:`, e);
    } finally {
      setLoading(false);
    }
  }, [oauthUtils, storage, uxp]);

  const handleDisconnect = useCallback(() => {
    console.log(`${LOG_PREFIX} Logging out`);
    storage.removeItem(DROPBOX_ACCESS_TOKEN_KEY);
    setAccessToken(null);
    setLoading(false);
    setIsAuthorized(false);
  }, [storage]);

  const contextValue = useMemo(
    () => ({
      isAuthorized,
      loading,
      accessToken,
      handleConnect,
      handleDisconnect,
      error,
    }),
    [isAuthorized, loading, accessToken, handleConnect, handleDisconnect, error],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export function useAuth(): Auth {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
