import { DAILY_QUEST_DEFINITIONS } from "../data/dailyQuests.js";

const GROUPS = Object.freeze(["driving", "earnings", "routine"]);

function seededIndex(day, salt, length) {
  let value = ((Math.max(1, day) * 2654435761) ^ (salt * 2246822519)) >>> 0;
  value = (value ^ (value >>> 16)) >>> 0;
  return value % Math.max(1, length);
}

export function selectDailyQuests(day, definitions = DAILY_QUEST_DEFINITIONS) {
  return GROUPS.map((group, index) => {
    const pool = definitions.filter((quest) => quest.group === group);
    return pool[seededIndex(day, index + 1, pool.length)];
  }).filter(Boolean);
}

export function createDailyQuestState(day = 1) {
  return {
    day,
    entries: selectDailyQuests(day).map((quest) => ({
      id: quest.id,
      progress: 0,
      completed: false,
      rewardPaid: false,
    })),
  };
}

export function syncDailyQuestDay(state, day) {
  if (state.day === day && state.entries?.length === 3) return false;
  Object.assign(state, createDailyQuestState(day));
  return true;
}

export function restoreDailyQuestState(state, savedState, currentDay) {
  if (!savedState || savedState.day !== currentDay) {
    syncDailyQuestDay(state, currentDay);
    return;
  }

  const validIds = new Set(DAILY_QUEST_DEFINITIONS.map((quest) => quest.id));
  const entries = (savedState.entries ?? []).filter((entry) => validIds.has(entry.id));
  if (entries.length !== 3) {
    syncDailyQuestDay(state, currentDay);
    return;
  }

  state.day = currentDay;
  state.entries = entries.map((entry) => ({
    id: entry.id,
    progress: Math.max(0, Number(entry.progress) || 0),
    completed: Boolean(entry.completed),
    rewardPaid: Boolean(entry.rewardPaid),
  }));
}

export function getDailyQuestViews(state) {
  return (state.entries ?? []).map((entry) => {
    const definition = DAILY_QUEST_DEFINITIONS.find((quest) => quest.id === entry.id);
    if (!definition) return null;
    return {
      ...definition,
      ...entry,
      progress: Math.min(definition.target, entry.progress),
      progressRatio: Math.min(1, entry.progress / Math.max(1, definition.target)),
    };
  }).filter(Boolean);
}

export function recordDailyQuestEvent(state, type, amount = 1, currentDay = 1) {
  syncDailyQuestDay(state, currentDay);
  const progressAmount = Math.max(0, Number(amount) || 0);
  const completed = [];

  getDailyQuestViews(state).forEach((quest) => {
    const entry = state.entries.find((item) => item.id === quest.id);
    if (!entry || entry.completed || quest.eventType !== type) return;
    entry.progress = Math.min(quest.target, entry.progress + progressAmount);
    if (entry.progress >= quest.target) {
      entry.completed = true;
      completed.push(quest);
    }
  });

  return completed;
}