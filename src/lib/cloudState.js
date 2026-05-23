import { seedGraph } from "../data/seed";
import { supabase } from "./supabaseClient";

const LEGACY_ROW_ID = "main";
const PLATFORM = "enfe-clean-v2";

const tableNames = [
  "enfe_app_meta",
  "enfe_users",
  "enfe_productivity",
  "enfe_completed_demands",
  "enfe_finish_bets",
  "enfe_chat_messages",
  "enfe_feed_events",
  "enfe_competitions",
  "enfe_competition_options",
  "enfe_competition_bets"
];

export function toCloudState(state) {
  const { user, ...globalState } = state;
  return globalState;
}

function cleanUndefined(row) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined));
}

function numberOr(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function isoOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function makeFeedId(message, index) {
  let hash = 0;
  for (let i = 0; i < message.length; i += 1) {
    hash = ((hash << 5) - hash + message.charCodeAt(i)) | 0;
  }
  return `feed-${index}-${Math.abs(hash)}`;
}

function demandHistoryKey(item) {
  return [item.startedAt, item.file ?? "", item.task ?? ""].join("|");
}

async function loadLegacyCloudState() {
  const { data, error } = await supabase.from("crybet_state").select("data").eq("id", LEGACY_ROW_ID).maybeSingle();
  if (error) {
    console.warn("ENFE legacy Supabase load failed:", error.message);
    return null;
  }
  return data?.data ?? null;
}

async function tableExists() {
  const { error } = await supabase.from("enfe_app_meta").select("id").limit(1);
  return !error;
}

export async function loadCloudState() {
  if (!supabase) return null;

  if (!(await tableExists())) {
    return loadLegacyCloudState();
  }

  const [
    metaResult,
    usersResult,
    productivityResult,
    completedResult,
    finishBetsResult,
    chatResult,
    feedResult,
    competitionsResult,
    optionsResult,
    competitionBetsResult
  ] = await Promise.all([
    supabase.from("enfe_app_meta").select("*").eq("id", LEGACY_ROW_ID).maybeSingle(),
    supabase.from("enfe_users").select("*").order("created_at", { ascending: true }),
    supabase.from("enfe_productivity").select("*"),
    supabase.from("enfe_completed_demands").select("*").order("finished_at", { ascending: false }),
    supabase.from("enfe_finish_bets").select("*").order("created_at", { ascending: true }),
    supabase.from("enfe_chat_messages").select("*").order("created_at", { ascending: true }),
    supabase.from("enfe_feed_events").select("*").order("position", { ascending: true }),
    supabase.from("enfe_competitions").select("*").order("created_at", { ascending: false }),
    supabase.from("enfe_competition_options").select("*").order("position", { ascending: true }),
    supabase.from("enfe_competition_bets").select("*").order("created_at", { ascending: true })
  ]);

  const error = [
    metaResult,
    usersResult,
    productivityResult,
    completedResult,
    finishBetsResult,
    chatResult,
    feedResult,
    competitionsResult,
    optionsResult,
    competitionBetsResult
  ].find((result) => result.error)?.error;

  if (error) {
    console.warn("ENFE Supabase table load failed:", error.message);
    return loadLegacyCloudState();
  }

  const hasTableData =
    (usersResult.data ?? []).length ||
    (productivityResult.data ?? []).length ||
    (finishBetsResult.data ?? []).length ||
    (chatResult.data ?? []).length ||
    (feedResult.data ?? []).length ||
    (competitionsResult.data ?? []).length;

  if (!hasTableData) {
    const legacyState = await loadLegacyCloudState();
    if (legacyState && Object.keys(legacyState).length) {
      await saveCloudState({ ...legacyState, user: null });
      return legacyState;
    }
  }

  const completedKeysByUser = {};
  const completedByUser = (completedResult.data ?? {}).reduce ? (completedResult.data ?? []).reduce((acc, row) => {
    acc[row.user_id] = acc[row.user_id] ?? [];
    completedKeysByUser[row.user_id] = completedKeysByUser[row.user_id] ?? new Set();
    const item = {
      id: row.id,
      file: row.file ?? "",
      task: row.task ?? "",
      topics: row.topics ?? 1,
      progress: row.progress ?? 0,
      startedAt: row.started_at,
      pausedMs: row.paused_ms ?? 0,
      finishedAt: row.finished_at,
      estimateMinutes: row.estimate_minutes ?? 0,
      actualMinutes: row.actual_minutes ?? 0,
      savedMinutes: row.saved_minutes ?? 0,
      speedBonus: row.speed_bonus ?? 0,
      finishedAtLabel: row.finished_at_label,
      durationLabel: row.duration_label
    };
    const key = demandHistoryKey(item);
    if (!completedKeysByUser[row.user_id].has(key)) {
      completedKeysByUser[row.user_id].add(key);
      acc[row.user_id].push(item);
    }
    return acc;
  }, {}) : {};

  const productivity = (productivityResult.data ?? []).reduce((acc, row) => {
    acc[row.user_id] = {
      currentFile: row.current_file ?? "",
      currentTask: row.current_task ?? "",
      progress: row.progress ?? 0,
      estimateHours: numberOr(row.estimate_hours, 1),
      targetTopics: row.target_topics ?? 1,
      completedTopics: row.completed_topics ?? 0,
      completedFiles: row.completed_files ?? 0,
      deliveredAssets: row.delivered_assets ?? 0,
      waterMl: row.water_ml ?? 0,
      revisionStatus: row.revision_status ?? "Em produção",
      startedAt: row.started_at,
      pausedAt: row.paused_at,
      pausedMs: row.paused_ms ?? 0,
      finishedAt: row.finished_at,
      canceledAt: row.canceled_at,
      extensionCount: row.extension_count ?? 0,
      extensionHours: numberOr(row.extension_hours, 0),
      updatedAt: row.updated_at,
      completedHistory: completedByUser[row.user_id] ?? []
    };
    return acc;
  }, {});

  const optionsByCompetition = (optionsResult.data ?? []).reduce((acc, row) => {
    acc[row.competition_id] = acc[row.competition_id] ?? [];
    acc[row.competition_id].push({ id: row.id, label: row.label });
    return acc;
  }, {});

  const betsByCompetition = (competitionBetsResult.data ?? []).reduce((acc, row) => {
    acc[row.competition_id] = acc[row.competition_id] ?? [];
    acc[row.competition_id].push({
      id: row.id,
      userId: row.user_id,
      username: row.username,
      optionId: row.option_id,
      optionLabel: row.option_label,
      amount: row.amount ?? 0,
      odds: numberOr(row.odds, 1),
      confidence: row.confidence ?? 0,
      createdAt: row.created_at
    });
    return acc;
  }, {});

  const meta = metaResult.data ?? {};

  return {
    platform: meta.platform ?? PLATFORM,
    users: (usersResult.data ?? []).map((row) => ({
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      enfecoins: row.enfecoins ?? 50,
      wins: row.wins ?? 0,
      losses: row.losses ?? 0,
      totalWon: row.total_won ?? 0,
      totalLost: row.total_lost ?? 0,
      bestOddsWon: numberOr(row.best_odds_won, 0),
      winstreak: row.winstreak ?? 0,
      completedDemands: row.completed_demands ?? 0,
      speedBonusWon: row.speed_bonus_won ?? 0,
      favoriteCompetition: row.favorite_competition ?? "Sprint Editorial",
      active: row.active ?? false,
      rank: row.rank,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })),
    predictions: [],
    incidents: [],
    feed: (feedResult.data ?? []).map((row) => row.message),
    chatMessages: (chatResult.data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      fromId: row.from_id,
      fromName: row.from_name,
      toId: row.to_id,
      text: row.text,
      createdAt: row.created_at
    })),
    competitions: (competitionsResult.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      participants: row.participants,
      participantIds: row.participant_ids ?? [],
      category: row.category,
      challengeType: row.challenge_type,
      timer: row.timer,
      reward: row.reward ?? 0,
      entryAmount: row.entry_amount ?? 0,
      endTime: row.end_time,
      status: row.status,
      createdById: row.created_by_id,
      createdByName: row.created_by_name,
      winningOptionId: row.winning_option_id,
      createdAt: row.created_at,
      options: optionsByCompetition[row.id] ?? [],
      bets: betsByCompetition[row.id] ?? []
    })),
    finishBets: (finishBetsResult.data ?? []).map((row) => ({
      id: row.id,
      bettorId: row.bettor_id,
      bettorName: row.bettor_name,
      targetUserId: row.target_user_id,
      targetName: row.target_name,
      windowId: row.window_id,
      windowLabel: row.window_label,
      amount: row.amount ?? 0,
      odds: numberOr(row.odds, 1),
      status: row.status,
      winningWindow: row.winning_window,
      won: row.won,
      refunded: row.refunded,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      canceledAt: row.canceled_at
    })),
    productivity,
    graph: Array.isArray(meta.graph) ? meta.graph : seedGraph,
    marketHeat: meta.market_heat ?? 38,
    volatility: meta.volatility ?? 22,
    eventStatus: meta.event_status ?? "Sprint criativo carregando",
    topEvent: meta.top_event ?? "Sprint Editorial de Sexta",
    totalCoinFlow: meta.total_coin_flow ?? 0,
    activeTriggerCount: meta.active_trigger_count ?? 0
  };
}

async function upsertRows(table, rows) {
  if (!rows.length) return;
  const { error } = await supabase.from(table).upsert(rows);
  if (error) throw error;
}

function isAfter(left, right) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return leftTime > rightTime;
}

async function upsertUserRows(rows) {
  if (!rows.length) return;

  const ids = rows.map((row) => row.id);
  const { data, error } = await supabase.from("enfe_users").select("*").in("id", ids);
  if (error) throw error;

  const existingById = new Map((data ?? []).map((row) => [row.id, row]));
  const mergedRows = rows.map((row) => {
    const existing = existingById.get(row.id);
    if (existing && isAfter(existing.updated_at, row.updated_at)) {
      return existing;
    }
    return row;
  });

  await upsertRows("enfe_users", mergedRows);
}

const finishBetStatusRank = {
  active: 1,
  expired: 2,
  canceled: 3,
  resolved: 4
};

async function upsertFinishBetRows(rows) {
  if (!rows.length) return;

  const ids = rows.map((row) => row.id);
  const { data, error } = await supabase
    .from("enfe_finish_bets")
    .select("id,status,winning_window,won,refunded,resolved_at,canceled_at")
    .in("id", ids);

  if (error) throw error;

  const existingById = new Map((data ?? []).map((row) => [row.id, row]));
  const mergedRows = rows.map((row) => {
    const existing = existingById.get(row.id);
    const incomingRank = finishBetStatusRank[row.status] ?? 1;
    const existingRank = finishBetStatusRank[existing?.status] ?? 0;
    if (existing && existingRank > incomingRank) {
      return {
        ...row,
        status: existing.status,
        winning_window: existing.winning_window,
        won: existing.won,
        refunded: existing.refunded,
        resolved_at: existing.resolved_at,
        canceled_at: existing.canceled_at
      };
    }
    return row;
  });

  await upsertRows("enfe_finish_bets", mergedRows);
}

export async function saveCloudState(state) {
  if (!supabase) return;
  if (!(await tableExists())) {
    const { error } = await supabase.from("crybet_state").upsert({
      id: LEGACY_ROW_ID,
      data: toCloudState(state),
      updated_at: new Date().toISOString()
    });
    if (error) console.warn("ENFE legacy Supabase save failed:", error.message);
    return;
  }

  const global = toCloudState(state);
  const now = new Date().toISOString();
  const productivity = global.productivity ?? {};

  const userRows = (global.users ?? []).map((user) => cleanUndefined({
    id: user.id,
    username: user.username,
    avatar: user.avatar,
    enfecoins: user.enfecoins ?? 50,
    wins: user.wins ?? 0,
    losses: user.losses ?? 0,
    total_won: user.totalWon ?? 0,
    total_lost: user.totalLost ?? 0,
    best_odds_won: user.bestOddsWon ?? 0,
    winstreak: user.winstreak ?? 0,
    completed_demands: user.completedDemands ?? 0,
    speed_bonus_won: user.speedBonusWon ?? 0,
    favorite_competition: user.favoriteCompetition ?? "Sprint Editorial",
    active: user.active ?? false,
    rank: user.rank,
    created_at: isoOrNull(user.createdAt) ?? now,
    updated_at: isoOrNull(user.updatedAt) ?? now
  }));

  const productivityRows = Object.entries(productivity).map(([userId, stats]) => cleanUndefined({
    user_id: userId,
    current_file: stats.currentFile ?? "",
    current_task: stats.currentTask ?? "",
    progress: stats.progress ?? 0,
    estimate_hours: stats.estimateHours ?? 1,
    target_topics: stats.targetTopics ?? 1,
    completed_topics: stats.completedTopics ?? 0,
    completed_files: stats.completedFiles ?? 0,
    delivered_assets: stats.deliveredAssets ?? 0,
    water_ml: stats.waterMl ?? 0,
    revision_status: stats.revisionStatus ?? "Em produção",
    started_at: isoOrNull(stats.startedAt),
    paused_at: isoOrNull(stats.pausedAt),
    paused_ms: stats.pausedMs ?? 0,
    finished_at: isoOrNull(stats.finishedAt),
    canceled_at: isoOrNull(stats.canceledAt),
    extension_count: stats.extensionCount ?? 0,
    extension_hours: stats.extensionHours ?? 0,
    updated_at: now
  }));

  const completedRows = Object.entries(productivity).flatMap(([userId, stats]) =>
    (stats.completedHistory ?? []).map((item) => cleanUndefined({
      id: item.id,
      user_id: userId,
      file: item.file ?? "",
      task: item.task ?? "",
      topics: item.topics ?? 1,
      progress: item.progress ?? 0,
      started_at: isoOrNull(item.startedAt),
      paused_ms: item.pausedMs ?? 0,
      finished_at: isoOrNull(item.finishedAt) ?? now,
      estimate_minutes: item.estimateMinutes ?? 0,
      actual_minutes: item.actualMinutes ?? 0,
      saved_minutes: item.savedMinutes ?? 0,
      speed_bonus: item.speedBonus ?? 0,
      finished_at_label: item.finishedAtLabel,
      duration_label: item.durationLabel,
      created_at: isoOrNull(item.finishedAt) ?? now
    }))
  );

  const finishBetRows = (global.finishBets ?? []).map((bet) => cleanUndefined({
    id: bet.id,
    bettor_id: bet.bettorId,
    bettor_name: bet.bettorName,
    target_user_id: bet.targetUserId,
    target_name: bet.targetName,
    window_id: bet.windowId,
    window_label: bet.windowLabel,
    amount: bet.amount ?? 0,
    odds: bet.odds ?? 1,
    status: bet.status ?? "active",
    winning_window: bet.winningWindow,
    won: bet.won,
    refunded: bet.refunded ?? false,
    created_at: isoOrNull(bet.createdAt) ?? now,
    resolved_at: isoOrNull(bet.resolvedAt),
    canceled_at: isoOrNull(bet.canceledAt)
  }));

  const chatRows = (global.chatMessages ?? []).map((message) => cleanUndefined({
    id: message.id,
    type: message.type ?? "global",
    from_id: message.fromId,
    from_name: message.fromName,
    to_id: message.toId,
    text: message.text,
    created_at: isoOrNull(message.createdAt) ?? now
  }));

  const feedRows = (global.feed ?? []).map((message, index) => ({
    id: makeFeedId(message, index),
    message,
    position: index,
    created_at: now
  }));

  const competitionRows = (global.competitions ?? []).map((competition) => cleanUndefined({
    id: competition.id,
    title: competition.title,
    description: competition.description,
    participants: competition.participants,
    participant_ids: competition.participantIds ?? [],
    category: competition.category ?? "active",
    challenge_type: competition.challengeType,
    timer: competition.timer,
    reward: competition.reward ?? 0,
    entry_amount: competition.entryAmount ?? 0,
    end_time: competition.endTime,
    status: competition.status ?? "active",
    created_by_id: competition.createdById,
    created_by_name: competition.createdByName,
    winning_option_id: competition.winningOptionId,
    created_at: isoOrNull(competition.createdAt) ?? now
  }));

  const optionRows = (global.competitions ?? []).flatMap((competition) =>
    (competition.options ?? []).map((option, index) => ({
      id: option.id,
      competition_id: competition.id,
      label: option.label,
      position: index
    }))
  );

  const competitionBetRows = (global.competitions ?? []).flatMap((competition) =>
    (competition.bets ?? []).map((bet) => cleanUndefined({
      id: bet.id,
      competition_id: competition.id,
      user_id: bet.userId,
      username: bet.username,
      option_id: bet.optionId,
      option_label: bet.optionLabel,
      amount: bet.amount ?? 0,
      odds: bet.odds ?? 1,
      confidence: bet.confidence ?? 0,
      created_at: isoOrNull(bet.createdAt) ?? now
    }))
  );

  try {
    await upsertUserRows(userRows);
    await Promise.all([
      supabase.from("enfe_app_meta").upsert({
        id: LEGACY_ROW_ID,
        platform: global.platform ?? PLATFORM,
        graph: global.graph ?? seedGraph,
        market_heat: global.marketHeat ?? 38,
        volatility: global.volatility ?? 22,
        event_status: global.eventStatus ?? "Sprint criativo carregando",
        top_event: global.topEvent ?? "Sprint Editorial de Sexta",
        total_coin_flow: global.totalCoinFlow ?? 0,
        active_trigger_count: global.activeTriggerCount ?? 0,
        updated_at: now
      }),
      upsertRows("enfe_productivity", productivityRows),
      upsertRows("enfe_completed_demands", completedRows),
      upsertFinishBetRows(finishBetRows),
      upsertRows("enfe_chat_messages", chatRows),
      upsertRows("enfe_competitions", competitionRows)
    ]);

    await Promise.all([
      supabase.from("enfe_feed_events").delete().neq("id", "__never__"),
      supabase.from("enfe_competition_options").delete().neq("competition_id", "__never__"),
      supabase.from("enfe_competition_bets").delete().neq("id", "__never__")
    ]);

    await Promise.all([
      upsertRows("enfe_feed_events", feedRows),
      upsertRows("enfe_competition_options", optionRows),
      upsertRows("enfe_competition_bets", competitionBetRows)
    ]);
  } catch (error) {
    console.warn("ENFE Supabase table save failed:", error.message);
  }
}

export function subscribeCloudState(onState) {
  if (!supabase) return () => {};

  let timer = null;
  const reload = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(async () => {
      const nextState = await loadCloudState();
      if (nextState) onState(nextState);
    }, 350);
  };

  const channels = tableNames.map((table) =>
    supabase
      .channel(`enfe-${table}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, reload)
      .subscribe()
  );

  const legacyChannel = supabase
    .channel("crybet-state")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "crybet_state", filter: `id=eq.${LEGACY_ROW_ID}` },
      reload
    )
    .subscribe();

  return () => {
    window.clearTimeout(timer);
    [...channels, legacyChannel].forEach((channel) => supabase.removeChannel(channel));
  };
}
