"use client";

import { useSyncExternalStore } from "react";
import { api } from "./api";
import type { Lesson } from "./types";

let lessons: Lesson[] = [];
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function refreshLessons(): Promise<void> {
  loading ??= api<{ lessons: Lesson[] }>("/api/lessons")
    .then((d) => {
      lessons = d.lessons;
      loaded = true;
      emit();
    })
    .catch(() => {})
    .finally(() => {
      loading = null;
    });
  return loading;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!loaded) void refreshLessons();
  return () => listeners.delete(cb);
}

const EMPTY: Lesson[] = [];

export function useLessons(): Lesson[] {
  return useSyncExternalStore(subscribe, () => lessons, () => EMPTY);
}

export async function saveLesson(lesson: Partial<Lesson>) {
  await api("/api/lessons", { body: lesson });
  await refreshLessons();
}

export async function setLessonActive(id: string, active: boolean) {
  lessons = lessons.map((l) => (l.id === id ? { ...l, active } : l));
  emit();
  await api("/api/lessons", { method: "PATCH", body: { id, active } });
  await refreshLessons();
}

export async function removeLesson(params: { id?: string; reportId?: string }) {
  await api("/api/lessons", { method: "DELETE", body: params });
  await refreshLessons();
}
