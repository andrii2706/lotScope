"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS } from "./defaults";
import { onUserChange } from "./me";
import type { Report, Settings } from "./types";

const PREFS_KEY = "lotscope.prefs.v1";
const LOCAL_KEYS = ["theme", "expertName"] as const;

type Prefs = Pick<Settings, (typeof LOCAL_KEYS)[number]>;

interface State {
  loaded: boolean;
  server: Report[];
  remote: Partial<Settings>;
  canSave: boolean;
}

const listeners = new Set<() => void>();
let state: State = { loaded: false, server: [], remote: {}, canSave: false };
let ephemeral: Report[] = [];
let prefs: Prefs | null = null;
let combinedReports: Report[] = [];
let combinedSettings: Settings = DEFAULT_SETTINGS;
let currentUser: string | null = null;
let generation = 0;

const NO_REPORTS: Report[] = [];

function notify() {
  combinedReports = [...ephemeral, ...state.server.filter((r) => !ephemeral.some((e) => e.id === r.id))];
  combinedSettings = { ...DEFAULT_SETTINGS, ...state.remote, ...readPrefs() };
  listeners.forEach((l) => l());
}

function readPrefs(): Prefs {
  if (prefs) return prefs;
  let stored: Partial<Prefs> = {};
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    stored = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
  } catch {
    stored = {};
  }
  prefs = { theme: stored.theme ?? DEFAULT_SETTINGS.theme, expertName: stored.expertName ?? "" };
  return prefs;
}

function writePrefs(next: Prefs) {
  prefs = next;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {
    return;
  }
}

async function load() {
  const run = ++generation;
  const [reports, settings] = await Promise.all([
    fetch("/api/reports", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<{ reports: Report[]; canSave: boolean }>) : null)).catch(() => null),
    fetch("/api/settings", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<{ settings: Partial<Settings> }>) : null)).catch(() => null),
  ]);
  if (run !== generation) return;
  state = { loaded: true, server: reports?.reports ?? [], remote: settings?.settings ?? {}, canSave: reports?.canSave ?? false };
  notify();
}

function reset(userId: string | null) {
  if (userId === currentUser && state.loaded) return;
  currentUser = userId;
  ephemeral = [];
  state = { loaded: false, server: [], remote: {}, canSave: false };
  generation++;
  notify();
  if (userId) void load();
  else {
    state = { ...state, loaded: true };
    notify();
  }
}

if (typeof window !== "undefined") onUserChange(reset);

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    subscribe,
    () => {
      if (!state.loaded && combinedSettings === DEFAULT_SETTINGS) combinedSettings = { ...DEFAULT_SETTINGS, ...readPrefs() };
      return combinedSettings;
    },
    () => DEFAULT_SETTINGS,
  );
}

export function useReports(): Report[] {
  return useSyncExternalStore(subscribe, () => combinedReports, () => NO_REPORTS);
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => state.loaded,
    () => false,
  );
}

export function getSettings(): Settings {
  return combinedSettings === DEFAULT_SETTINGS ? { ...DEFAULT_SETTINGS, ...readPrefs() } : combinedSettings;
}

export function saveSettings(settings: Settings) {
  const nextPrefs: Prefs = { theme: settings.theme, expertName: settings.expertName };
  writePrefs(nextPrefs);
  const remote = { ...settings } as Partial<Settings>;
  for (const key of LOCAL_KEYS) delete remote[key];
  const changed = (Object.keys(remote) as (keyof Settings)[]).some((k) => remote[k] !== (state.remote[k] ?? DEFAULT_SETTINGS[k]));
  if (changed) {
    state = { ...state, remote };
    notify();
    void fetch("/api/settings", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(remote) })
      .then((r) => {
        if (!r.ok) void load();
      })
      .catch(() => void load());
  } else {
    notify();
  }
}

export class SaveReportError extends Error {}

export async function saveReport(report: Report, persist: boolean): Promise<Report> {
  if (!persist) {
    const draft = { ...report, saved: false };
    ephemeral = [draft, ...ephemeral.filter((r) => r.id !== draft.id)];
    notify();
    return draft;
  }
  const res = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(report) }).catch(() => null);
  const data = (await res?.json().catch(() => null)) as { report?: Report; error?: string } | null;
  if (!res || !res.ok || !data?.report) throw new SaveReportError(data?.error || "Не вдалося зберегти звіт.");
  state = { ...state, server: [data.report, ...state.server.filter((r) => r.id !== data.report?.id)] };
  notify();
  return data.report;
}

export function updateReport(id: string, patch: Partial<Report>) {
  const apply = (list: Report[]) => list.map((r) => (r.id === id ? { ...r, ...patch } : r));
  ephemeral = apply(ephemeral);
  state = { ...state, server: apply(state.server) };
  notify();
  if (ephemeral.some((r) => r.id === id)) return;
  const body: Record<string, unknown> = {};
  if (patch.overrides) body.overrides = patch.overrides;
  if (patch.expert) body.expert = patch.expert;
  if (!Object.keys(body).length) return;
  void fetch(`/api/reports/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => {
      if (!r.ok) void load();
    })
    .catch(() => void load());
}

export function deleteReport(id: string) {
  const wasLocal = ephemeral.some((r) => r.id === id);
  ephemeral = ephemeral.filter((r) => r.id !== id);
  state = { ...state, server: state.server.filter((r) => r.id !== id) };
  notify();
  if (!wasLocal) void fetch(`/api/reports/${id}`, { method: "DELETE" }).then((r) => !r.ok && void load()).catch(() => void load());
}
