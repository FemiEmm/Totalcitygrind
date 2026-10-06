function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function getDefinition(definitions, objectiveId) {
  return definitions.find((definition) => definition.id === objectiveId) ?? null;
}

function prerequisitesComplete(state, definition) {
  return (definition.prerequisiteIds ?? []).every((objectiveId) => {
    return state.entries[objectiveId]?.status === "completed";
  });
}

function unlockEligibleObjectives(state, definitions) {
  const unlockedIds = [];

  definitions.forEach((definition) => {
    const entry = state.entries[definition.id];

    if (
      entry?.status === "locked" &&
      prerequisitesComplete(state, definition)
    ) {
      entry.status = "active";
      unlockedIds.push(definition.id);

      if (definition.autoTrack) {
        state.trackedObjectiveId = definition.id;
      }
    }
  });

  return unlockedIds;
}

export function createObjectiveState(definitions) {
  const entries = {};

  definitions.forEach((definition) => {
    entries[definition.id] = {
      progress: 0,
      status: definition.activationEventType
        ? "dormant"
        : (definition.prerequisiteIds?.length ?? 0) > 0
          ? "locked"
          : "active",
      completedDay: null,
      rewardClaimed: false,
    };
  });

  return {
    entries,
    trackedObjectiveId:
      definitions.find((definition) => definition.autoTrack)?.id ??
      definitions[0]?.id ??
      null,
    totalCompleted: 0,
  };
}

export function restoreObjectiveState(state, savedState, definitions) {
  if (!savedState) {
    return;
  }

  Object.entries(savedState.entries ?? {}).forEach(([objectiveId, savedEntry]) => {
    if (state.entries[objectiveId]) {
      Object.assign(state.entries[objectiveId], savedEntry);
    }
  });

  if (getDefinition(definitions, savedState.trackedObjectiveId)) {
    state.trackedObjectiveId = savedState.trackedObjectiveId;
  }

  state.totalCompleted = Object.values(state.entries).filter((entry) => {
    return entry.status === "completed";
  }).length;
  unlockEligibleObjectives(state, definitions);

  if (state.entries[state.trackedObjectiveId]?.status === "completed") {
    state.trackedObjectiveId =
      definitions.find((definition) => {
        return state.entries[definition.id]?.status === "active";
      })?.id ?? state.trackedObjectiveId;
  }
}

export function recordObjectiveEvent({
  state,
  definitions,
  type,
  amount = 1,
  currentDay = 1,
}) {
  const completedIds = [];
  const activatedIds = [];
  const progressAmount = Math.max(0, Number(amount) || 0);

  definitions.forEach((definition) => {
    const entry = state.entries[definition.id];

    if (
      entry?.status === "dormant" &&
      definition.activationEventType === type
    ) {
      entry.status = "active";
      activatedIds.push(definition.id);

      if (definition.autoTrack) {
        state.trackedObjectiveId = definition.id;
      }
    }
  });

  definitions.forEach((definition) => {
    const entry = state.entries[definition.id];

    if (
      entry?.status !== "active" ||
      definition.eventType !== type
    ) {
      return;
    }

    entry.progress = clamp(
      entry.progress + progressAmount,
      0,
      definition.target,
    );

    if (entry.progress >= definition.target) {
      entry.status = "completed";
      entry.completedDay = currentDay;
      state.totalCompleted += 1;
      completedIds.push(definition.id);
    }
  });

  const unlockedIds = unlockEligibleObjectives(state, definitions);

  if (state.entries[state.trackedObjectiveId]?.status === "completed") {
    state.trackedObjectiveId =
      definitions.find((definition) => {
        return state.entries[definition.id]?.status === "active";
      })?.id ?? state.trackedObjectiveId;
  }

  return { completedIds, unlockedIds, activatedIds };
}

export function updateObjectiveDeadlines({
  state,
  definitions,
  currentDay,
}) {
  const failedIds = [];

  definitions.forEach((definition) => {
    const entry = state.entries[definition.id];

    if (
      entry?.status === "active" &&
      Number.isFinite(definition.deadlineDay) &&
      currentDay > definition.deadlineDay
    ) {
      entry.status = "failed";
      failedIds.push(definition.id);
    }
  });

  return failedIds;
}

export function setTrackedObjective(state, objectiveId, definitions) {
  const definition = getDefinition(definitions, objectiveId);
  const entry = state.entries[objectiveId];

  if (!definition || !entry || entry.status === "locked") {
    return false;
  }

  state.trackedObjectiveId = objectiveId;
  return true;
}

export function claimObjectiveReward(state, objectiveId, definitions) {
  const definition = getDefinition(definitions, objectiveId);
  const entry = state.entries[objectiveId];

  if (
    !definition ||
    entry?.status !== "completed" ||
    entry.rewardClaimed
  ) {
    return null;
  }

  entry.rewardClaimed = true;
  return { ...(definition.reward ?? {}) };
}

export function getObjectiveViews(state, definitions) {
  return definitions.map((definition) => {
    const entry = state.entries[definition.id] ?? {};

    return {
      ...definition,
      ...entry,
      progressRatio: clamp(
        (entry.progress ?? 0) / Math.max(1, definition.target),
        0,
        1,
      ),
      tracked: state.trackedObjectiveId === definition.id,
    };
  });
}
