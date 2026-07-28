'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthService, type AuthState } from '@/services/authService';

const STORAGE_KEY = 'djossi_auth_state';

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => ({
    user: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
  }));

  useEffect(() => {
    const initial = AuthService.getInitialState();
    setState({ ...initial, isLoading: false });
  }, []);

  const login = useCallback(async (email: string, password: string, role: 'candidate' | 'employer') => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const next = await AuthService.login({ email, password }, role);
      setState(next);
      return next;
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await AuthService.logout();
    setState({ user: null, profile: null, isLoading: false, isAuthenticated: false });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onStorage = () => {
      const next = AuthService.getInitialState();
      setState((prev) => ({ ...prev, ...next }));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { ...state, login, logout };
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [stored, setStored] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStored((prev) => {
        const next = value instanceof Function ? value(prev) : value;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(next));
        }
        return next;
      });
    },
    [key]
  );

  return [stored, setValue];
}

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);
  return matches;
}

export function useSearchParamsState() {
  const [params, setParams] = useState<Record<string, string>>({});
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const obj: Record<string, string> = {};
      const sp = new URLSearchParams(window.location.search);
      sp.forEach((v, k) => {
        obj[k] = v;
      });
      setParams(obj);
    };
    update();
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return params;
}

export { STORAGE_KEY };
