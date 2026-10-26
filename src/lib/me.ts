"use client";

import { useSyncExternalStore } from "react";
import { can, type Permission, type Role } from "./roles";

export { ROLE_LABEL } from "./roles";

export interface Me {
  id: string;
  email: string;
  name: string;
  role: Role;
  companyId: string;
  companyName: string;
  plan: string;
  credits: number;
  periodEnd: string | null;
  recurringActive: boolean;
  isAdmin: boolean;
  companyKind: "team" | "personal";
  subscribed: boolean;
  suspended: boolean;
  suspendedReason: string;
  sessionExpiresAt: string;
}

export type MeState = { status: "loading" } | { status: "ready"; user: Me | null; dbConfigured: boolean; dbError?: string };

let state: MeState = { status: "loading" };
let inflight: Promise<void> | null = null;
let lastUserId: string | null | undefined;
const listeners = new Set<() => void>();
const userHooks = new Set<(id: string | null) => void>();

export function onUserChange(hook: (id: string | null) => void): () => void {
  userHooks.add(hook);
  if (lastUserId !== undefined) hook(lastUserId);
  return () => userHooks.delete(hook);
}

function settle(user: Me | null) {
  const id = user?.id ?? null;
  if (id !== lastUserId) {
    lastUserId = id;
    userHooks.forEach((h) => h(id));
  }
}

export function refreshMe(): Promise<void> {
  inflight ??= fetch("/api/auth/me", { cache: "no-store" })
    .then((r) => r.json())
    .then((d: { user: Me | null; dbConfigured: boolean; dbError?: string }) => {
      state = { status: "ready", user: d.user, dbConfigured: d.dbConfigured, dbError: d.dbError };
      settle(d.user);
    })
    .catch(() => {
      state = { status: "ready", user: null, dbConfigured: true };
      settle(null);
    })
    .finally(() => {
      inflight = null;
      listeners.forEach((l) => l());
    });
  return inflight;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (state.status === "loading") void refreshMe();
  return () => listeners.delete(cb);
}

const LOADING: MeState = { status: "loading" };

export function useMe(): MeState {
  return useSyncExternalStore(subscribe, () => state, () => LOADING);
}

export function useCan(permission: Permission): boolean {
  const me = useMe();
  return me.status === "ready" && Boolean(me.user) && can(me.user, permission);
}
