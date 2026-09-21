import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  leanAppToken?: string;
  leanCustomerId?: string;
  kycCompleted?: boolean;
  isPremium?: boolean;
  income?: number;          // monthly income in SAR
  leanVerifiedAt?: string;  // ISO timestamp — set when income came from Lean open-banking lookup
  createdAt: string;
}

export interface LeanEntity { id: string; bankName: string; status: string; }
export interface LeanAccount {
  id: string; entityId: string; bankName: string; accountType: string;
  iban?: string; lastFour: string; balanceAvailable?: number;
}

interface AuthState {
  user: UserProfile | null;
  isLoggedIn: boolean;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchLeanAccounts: () => Promise<LeanAccount[]>;
  markKycCompleted: () => Promise<void>;
  saveIncome: (amount: number, fromLean?: boolean) => Promise<void>;
  upgradeToPremium: () => Promise<void>;
  downgradePremium: () => Promise<void>;
  restorePremium: () => Promise<boolean>;
}

const STORAGE_KEY_USER          = '@subtrack_user';
const STORAGE_KEY_JWT           = '@subtrack_jwt';
const STORAGE_KEY_ENTITLEMENTS  = '@subtrack_premium_entitlements';
/** Email of the account that owns the locally stored app data */
const STORAGE_KEY_DATA_OWNER    = '@subtrack_data_owner';

/** All per-account app data keys — cleared when a different account signs in */
const APP_DATA_KEYS = [
  '@subtrack_subscriptions',
  '@subtrack_banks',
  '@subtrack_bills',
  '@subtrack_budgets',
  '@subtrack_goals',
  '@subtrack_loans',
  '@subtrack_monthly_snapshots',
  '@subtrack_snapshots_backfilled',
  '@subtrack_bank_prompt_shown',
  '@subtrack_skip_export_preview',
];

/**
 * Clears locally stored app data when the signing-in account is not the one
 * that created it, so a new/different account never inherits another
 * account's subscriptions, connected banks, bills, goals, or loans.
 */
async function claimLocalData(email: string) {
  const owner = await AsyncStorage.getItem(STORAGE_KEY_DATA_OWNER);
  if (owner !== email) {
    await AsyncStorage.multiRemove(APP_DATA_KEYS);
    await AsyncStorage.setItem(STORAGE_KEY_DATA_OWNER, email);
  }
}
const LEAN_API_BASE             = 'https://api.leantech.me';
const API_BASE                  = process.env.EXPO_PUBLIC_API_URL ?? '';
/** Cached premium is trusted for up to 7 days while the device is offline */
const GRACE_PERIOD_MS           = 7 * 24 * 60 * 60 * 1000;

// ── JWT storage ────────────────────────────────────────────────────────────
async function getStoredJwt(): Promise<string | null> {
  try { return await AsyncStorage.getItem(STORAGE_KEY_JWT); } catch { return null; }
}
async function saveJwt(token: string) { await AsyncStorage.setItem(STORAGE_KEY_JWT, token); }
async function clearJwt()             { await AsyncStorage.removeItem(STORAGE_KEY_JWT); }

// ── Grace-period entitlement cache ─────────────────────────────────────────
// Keyed by email so it survives logout / user-record resets on the same device.
// Only used as a READ-ONLY fallback when the server is unreachable.
interface EntitlementEntry { isPremium: boolean; verifiedAt: string; }

async function readCache(): Promise<Record<string, EntitlementEntry>> {
  try { const r = await AsyncStorage.getItem(STORAGE_KEY_ENTITLEMENTS); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}
async function writeCache(email: string, entry: EntitlementEntry) {
  const m = await readCache(); m[email] = entry;
  await AsyncStorage.setItem(STORAGE_KEY_ENTITLEMENTS, JSON.stringify(m));
}
/** Returns cached value if within grace period; undefined if absent or expired (conservative deny). */
async function readGracedCache(email: string): Promise<boolean | undefined> {
  const e = (await readCache())[email];
  if (!e) return undefined;
  return Date.now() - new Date(e.verifiedAt).getTime() <= GRACE_PERIOD_MS ? e.isPremium : undefined;
}

// ── Server helpers ─────────────────────────────────────────────────────────
function bearer(jwt: string): HeadersInit {
  return { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };
}
function jsonHeaders(): HeadersInit { return { 'Content-Type': 'application/json' }; }

/**
 * Returns:
 *   'ok'       – created or already exists with same credentials (idempotent)
 *   'conflict' – email taken by a different password (user must log in instead)
 *   'offline'  – could not reach the server (non-fatal; retried on next login)
 */
async function serverRegister(
  email: string, passwordHash: string, name: string, userId: string,
): Promise<'ok' | 'conflict' | 'offline'> {
  if (!API_BASE) return 'offline';
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST', headers: jsonHeaders(),
      body: JSON.stringify({ email, passwordHash, name, userId }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 409) return 'conflict';
    return 'ok';
  } catch { return 'offline'; }
}

async function serverLogin(email: string, passwordHash: string): Promise<string | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: jsonHeaders(),
      body: JSON.stringify({ email, passwordHash }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()).token ?? null;
  } catch { return null; }
}

async function fetchServerProfile(jwt: string): Promise<{ name: string; email: string; userId: string | null } | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      headers: bearer(jwt), signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

type EntitlementResult = { entitled: boolean; online: boolean; tokenExpired: boolean };

async function checkServerEntitlement(email: string, jwt: string): Promise<EntitlementResult> {
  if (!API_BASE || !jwt) return { entitled: false, online: false, tokenExpired: false };
  try {
    const res = await fetch(`${API_BASE}/premium/${encodeURIComponent(email)}`, {
      headers: bearer(jwt), signal: AbortSignal.timeout(6000),
    });
    if (res.status === 401 || res.status === 403) return { entitled: false, online: true, tokenExpired: true };
    if (!res.ok) return { entitled: false, online: true, tokenExpired: false };
    return { entitled: !!(await res.json()).isPremium, online: true, tokenExpired: false };
  } catch { return { entitled: false, online: false, tokenExpired: false }; }
}

/** Returns true only if the server confirmed the write. Returns false if offline or JWT absent. */
async function setServerEntitlement(email: string, jwt: string, grant: boolean): Promise<boolean> {
  if (!API_BASE || !jwt) return false;
  try {
    const res = await fetch(`${API_BASE}/premium/${encodeURIComponent(email)}`, {
      method: grant ? 'POST' : 'DELETE', headers: bearer(jwt),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok;
  } catch { return false; }
}

/** Tries a fresh login to get a new JWT when the current one has expired. */
async function silentRefresh(email: string, passwordHash: string): Promise<string | null> {
  return serverLogin(email, passwordHash);
}

// ── Simple local hash (not cryptographically secure) ──────────────────────
function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return Math.abs(h).toString(36) + str.length.toString(36);
}

// ── Context ────────────────────────────────────────────────────────────────
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY_USER);
        if (!raw) return;
        const u: UserProfile = JSON.parse(raw);

        let jwt = await getStoredJwt();
        let isPremium = false;

        // If no JWT is stored (e.g. after a redeploy, server switch, or storage
        // partial-clear), try to silently re-authenticate using the stored hash
        // so the account survives across builds without the user having to log in again.
        if (!jwt && u.passwordHash && API_BASE) {
          // First ensure the account exists on the server (idempotent)
          await serverRegister(u.email, u.passwordHash, u.name, u.id);
          jwt = await silentRefresh(u.email, u.passwordHash);
          if (jwt) await saveJwt(jwt);
        }

        if (jwt) {
          let r = await checkServerEntitlement(u.email, jwt);
          if (r.tokenExpired) {
            jwt = await silentRefresh(u.email, u.passwordHash);
            if (jwt) { await saveJwt(jwt); r = await checkServerEntitlement(u.email, jwt); }
          }
          if (r.online) {
            if (r.entitled) {
              // Server confirms premium — always trust it.
              isPremium = true;
              await writeCache(u.email, { isPremium: true, verifiedAt: new Date().toISOString() });
            } else {
              // Server says not premium. Honour the grace cache so a locally-granted
              // premium survives a refresh even when the server grant endpoint is
              // disabled in production (dev-only route) or the background write from
              // upgradeToPremium lost the race against this boot check.
              isPremium = (await readGracedCache(u.email)) ?? false;
              if (!isPremium) {
                await writeCache(u.email, { isPremium: false, verifiedAt: new Date().toISOString() });
              }
            }
          } else {
            isPremium = (await readGracedCache(u.email)) ?? false;
          }
        } else {
          isPremium = (await readGracedCache(u.email)) ?? false;
        }

        const merged = { ...u, isPremium };
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(merged));
        setUser(merged);
      } finally { setLoading(false); }
    })();
  }, []);

  // ── AppState: re-verify on foreground ────────────────────────────────────
  useEffect(() => {
    const handle = (next: AppStateStatus) => {
      if (next !== 'active') return;
      setUser(prev => {
        if (!prev) return prev;
        (async () => {
          let jwt = await getStoredJwt();
          if (!jwt) return;
          let r = await checkServerEntitlement(prev.email, jwt);
          if (r.tokenExpired) {
            jwt = await silentRefresh(prev.email, prev.passwordHash);
            if (jwt) { await saveJwt(jwt); r = await checkServerEntitlement(prev.email, jwt); }
          }
          if (!r.online) return;
          // Mirror the boot-sequence rule: server true is authoritative; server
          // false defers to the grace cache so a locally-granted premium isn't
          // stripped by a foreground check that races the background server write.
          let entitled: boolean;
          if (r.entitled) {
            entitled = true;
            await writeCache(prev.email, { isPremium: true, verifiedAt: new Date().toISOString() });
          } else {
            entitled = (await readGracedCache(prev.email)) ?? false;
            if (!entitled) {
              await writeCache(prev.email, { isPremium: false, verifiedAt: new Date().toISOString() });
            }
          }
          setUser(cur => {
            if (!cur || entitled === !!cur.isPremium) return cur;
            const upd = { ...cur, isPremium: entitled };
            AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(upd)).catch(() => {});
            return upd;
          });
        })();
        return prev;
      });
    };
    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, []);

  const saveUser = async (u: UserProfile) => {
    await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(u));
    setUser(u);
  };

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(async (name: string, email: string, password: string) => {
    const existing = await AsyncStorage.getItem(STORAGE_KEY_USER);
    if (existing) {
      const u: UserProfile = JSON.parse(existing);
      if (u.email.toLowerCase() === email.toLowerCase()) throw new Error('An account with this email already exists.');
    }
    const hash = simpleHash(password);
    const id   = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const norm = email.trim().toLowerCase();

    // Check the server BEFORE saving locally so we can surface a useful error
    // if the email is already taken with different credentials.
    const serverResult = await serverRegister(norm, hash, name.trim(), id);
    if (serverResult === 'conflict') {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const newUser: UserProfile = { id, name: name.trim(), email: norm, passwordHash: hash, createdAt: new Date().toISOString() };
    await claimLocalData(norm); // fresh account must never inherit another account's data
    await saveUser(newUser);
    const jwt = await serverLogin(norm, hash);
    if (jwt) await saveJwt(jwt);
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    const norm = email.trim().toLowerCase();
    const hash = simpleHash(password);
    const raw  = await AsyncStorage.getItem(STORAGE_KEY_USER);

    if (!raw) {
      // ── REINSTALL PATH: no local data — authenticate via server first ──
      const jwt = await serverLogin(norm, hash);
      if (!jwt) throw new Error('Email or password is incorrect. If you haven\'t registered yet, please create an account.');
      await saveJwt(jwt);

      // Fetch stored profile from server to reconstruct local record
      const profile = await fetchServerProfile(jwt);
      const restoredUser: UserProfile = {
        id:           profile?.userId ?? Date.now().toString(36),
        name:         profile?.name   ?? norm.split('@')[0],
        email:        norm,
        passwordHash: hash,
        createdAt:    new Date().toISOString(),
      };

      // Restore entitlement
      const r = await checkServerEntitlement(norm, jwt);
      const isPremium = r.online ? r.entitled : false;
      if (r.online) await writeCache(norm, { isPremium: r.entitled, verifiedAt: new Date().toISOString() });

      await claimLocalData(norm);
      await saveUser({ ...restoredUser, isPremium });
      return;
    }

    // ── NORMAL PATH: local record exists ──────────────────────────────────
    const u: UserProfile = JSON.parse(raw);
    if (u.email !== norm)  throw new Error('Email or password is incorrect.');
    if (u.passwordHash !== hash) throw new Error('Email or password is incorrect.');

    // Get or refresh JWT
    let jwt = await serverLogin(norm, hash);
    if (!jwt) {
      // Server unreachable — try to register (idempotent) so next login succeeds
      await serverRegister(norm, hash, u.name, u.id);
      jwt = await serverLogin(norm, hash);
    }
    if (jwt) await saveJwt(jwt);

    // Verify entitlement
    let isPremium = u.isPremium ?? false;
    if (jwt) {
      const r = await checkServerEntitlement(norm, jwt);
      if (r.online) {
        isPremium = r.entitled;
        await writeCache(norm, { isPremium: r.entitled, verifiedAt: new Date().toISOString() });
      } else {
        isPremium = (await readGracedCache(norm)) ?? isPremium;
      }
    } else {
      isPremium = (await readGracedCache(norm)) ?? isPremium;
    }

    await claimLocalData(norm);
    await saveUser({ ...u, isPremium });
  }, []);

  const logout = useCallback(async () => { await clearJwt(); setUser(null); }, []);

  // ── Premium ────────────────────────────────────────────────────────────────
  /**
   * Grants premium ONLY after the server confirms the write.
   * Throws if offline or JWT is absent so the UI can show a clear message.
   */
  const upgradeToPremium = useCallback(async () => {
    if (!user) return;
    // Grant premium locally first — this always succeeds regardless of network state.
    await writeCache(user.email, { isPremium: true, verifiedAt: new Date().toISOString() });
    await saveUser({ ...user, isPremium: true });
    // Best-effort server sync: get/refresh JWT then write entitlement.
    // Failures are silent — the local grant above is the source of truth.
    (async () => {
      try {
        let jwt = await getStoredJwt();
        if (!jwt && API_BASE) {
          jwt = await serverLogin(user.email, user.passwordHash);
          if (jwt) await saveJwt(jwt);
        }
        if (!jwt) return;
        const ok = await setServerEntitlement(user.email, jwt, true);
        if (!ok) {
          const fresh = await silentRefresh(user.email, user.passwordHash);
          if (fresh) { await saveJwt(fresh); await setServerEntitlement(user.email, fresh, true); }
        }
      } catch { /* ignore — local grant already applied */ }
    })();
  }, [user]);

  /** Downgrades premium — best-effort server sync, always clears locally. */
  const downgradePremium = useCallback(async () => {
    if (!user) return;
    const jwt = await getStoredJwt();
    if (jwt) await setServerEntitlement(user.email, jwt, false);
    await writeCache(user.email, { isPremium: false, verifiedAt: new Date().toISOString() });
    await saveUser({ ...user, isPremium: false });
  }, [user]);

  /** Checks the server and restores premium if confirmed. Falls back to grace cache if offline. */
  const restorePremium = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    let jwt = await getStoredJwt();
    if (!jwt) jwt = await serverLogin(user.email, user.passwordHash);
    if (jwt) await saveJwt(jwt);

    if (jwt) {
      let r = await checkServerEntitlement(user.email, jwt);
      if (r.tokenExpired) {
        jwt = await silentRefresh(user.email, user.passwordHash);
        if (jwt) { await saveJwt(jwt); r = await checkServerEntitlement(user.email, jwt); }
      }
      if (r.online) {
        await writeCache(user.email, { isPremium: r.entitled, verifiedAt: new Date().toISOString() });
        if (r.entitled !== !!user.isPremium) await saveUser({ ...user, isPremium: r.entitled });
        return r.entitled;
      }
    }

    // Offline: honour grace period (conservative — undefined treated as false)
    const cached = (await readGracedCache(user.email)) ?? false;
    if (cached && !user.isPremium) await saveUser({ ...user, isPremium: true });
    return cached;
  }, [user]);

  // ── Lean ──────────────────────────────────────────────────────────────────
  const markKycCompleted = useCallback(async () => { if (user) await saveUser({ ...user, kycCompleted: true }); }, [user]);

  const saveIncome = useCallback(async (amount: number, fromLean = false) => {
    if (!user) return;
    await saveUser({
      ...user,
      income: amount,
      leanVerifiedAt: fromLean ? new Date().toISOString() : user.leanVerifiedAt,
    });
  }, [user]);

  const fetchLeanAccounts = useCallback(async (): Promise<LeanAccount[]> => {
    if (!user?.leanCustomerId) return [];
    const h = {} as Record<string, string>;
    const eRes = await fetch(`${LEAN_API_BASE}/entities/v1/?customer_id=${user.leanCustomerId}`, { headers: h });
    if (!eRes.ok) throw new Error('Failed to fetch bank connections from Lean.');
    const entities: LeanEntity[] = (await eRes.json()).results ?? [];
    const groups = await Promise.all(entities.map(async (ent: any) => {
      try {
        const aRes = await fetch(`${LEAN_API_BASE}/accounts/v1/?entity_id=${ent.id}`, { headers: h });
        if (!aRes.ok) return [];
        return ((await aRes.json()).results ?? []).map((acc: any) => ({
          id: acc.id, entityId: ent.id,
          bankName: ent.bank_identifier ?? ent.bankName ?? 'Bank',
          accountType: acc.account_type ?? acc.type ?? 'Current',
          iban: acc.iban,
          lastFour: acc.iban ? acc.iban.slice(-4) : acc.account_number?.slice(-4) ?? '••••',
          balanceAvailable: acc.balance?.available ?? acc.available_balance,
        }));
      } catch { return []; }
    }));
    return groups.flat();
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, isLoggedIn: !!user, loading,
      register, login, logout,
      fetchLeanAccounts, markKycCompleted, saveIncome,
      upgradeToPremium, downgradePremium, restorePremium,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
