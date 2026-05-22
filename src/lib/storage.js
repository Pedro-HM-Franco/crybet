import { seedGraph } from "../data/seed";

const KEY = "enfe-2026-state-v1";
const RESET_MARKER = "enfe-reset-marker";
const RESET_VERSION = "enfe-2026-v1";

const baseState = {
  platform: "enfe-2026",
  user: null,
  users: [],
  predictions: [],
  incidents: [],
  feed: [],
  chatMessages: [],
  competitions: [],
  graph: seedGraph,
  marketHeat: 38,
  volatility: 22,
  eventStatus: "Weekend Arena loading",
  topEvent: "Friday Night Arena",
  totalCoinFlow: 0,
  activeTriggerCount: 0
};

export function loadState() {
  try {
    if (typeof window === "undefined") return baseState;
    if (window.localStorage.getItem(RESET_MARKER) !== RESET_VERSION) {
      resetCrybetStorage();
      window.localStorage.setItem(RESET_MARKER, RESET_VERSION);
      return baseState;
    }
    const cached = window.localStorage.getItem(KEY);
    return cached ? { ...baseState, ...JSON.parse(cached) } : baseState;
  } catch {
    return baseState;
  }
}

export function resetCrybetStorage() {
  if (typeof window === "undefined") return;
  Object.keys(window.localStorage)
    .filter((key) => key.startsWith("crybet-") || key.startsWith("enfe-"))
    .forEach((key) => window.localStorage.removeItem(key));
}

export function emptyState() {
  return {
    ...baseState,
    users: [],
    predictions: [],
    incidents: [],
    feed: [],
    graph: [...baseState.graph]
  };
}

export function saveState(state) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  }
}

export function nowLabel() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date());
}

export function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}
