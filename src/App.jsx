import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChatPanel } from "./components/ChatPanel";
import { Leaderboard } from "./components/Leaderboard";
import { LiveFeed } from "./components/LiveFeed";
import { MetricCard } from "./components/MetricCard";
import { DemandBetting, classifyFinishWindow, didFinishBetWin } from "./components/DemandBetting";
import { CompletedDemands, ProductivityPanel, TeamProgress } from "./components/ProductivityPanel";
import { categories, challengeTypes, rankFor } from "./data/enfe";
import { loadCloudState, saveCloudState, subscribeCloudState, toCloudState } from "./lib/cloudState";
import { clamp, emptyState, loadState, makeId, resetCrybetStorage, saveState } from "./lib/storage";
import { backendMode, supabase } from "./lib/supabaseClient";

const MIN_BONUS_RATIO = 0.25;

function money(value) {
  return Math.round(value ?? 0);
}

function demandHistoryKey(item) {
  return [item.startedAt, item.file ?? "", item.task ?? ""].join("|");
}

function completedDemandId(userId, startedAt) {
  const startedTime = new Date(startedAt).getTime();
  return Number.isNaN(startedTime) ? makeId("completed-demand") : `completed-demand-${userId}-${startedTime}`;
}

function updateUserRecord(user, updates = {}) {
  const next = { ...user, ...updates };
  return { ...next, rank: rankFor(next), updatedAt: new Date().toISOString() };
}

function isAfter(left, right) {
  const leftTime = left ? new Date(left).getTime() : 0;
  const rightTime = right ? new Date(right).getTime() : 0;
  return leftTime > rightTime;
}

function mergeUsersByUpdatedAt(localUsers = [], cloudUsers = []) {
  const usersById = new Map(cloudUsers.map((user) => [user.id, user]));
  localUsers.forEach((localUser) => {
    const cloudUser = usersById.get(localUser.id);
    if (!cloudUser || isAfter(localUser.updatedAt, cloudUser.updatedAt)) {
      usersById.set(localUser.id, localUser);
    }
  });
  return [...usersById.values()];
}

function mergeProductivityByUpdatedAt(localProductivity = {}, cloudProductivity = {}) {
  const merged = { ...cloudProductivity };
  Object.entries(localProductivity).forEach(([userId, localStats]) => {
    const cloudStats = cloudProductivity[userId];
    const completedHistory = mergeCompletedHistory(localStats?.completedHistory, cloudStats?.completedHistory);
    const activeDemandKey = localStats?.startedAt
      ? demandHistoryKey({ startedAt: localStats.startedAt, file: localStats.currentFile, task: localStats.currentTask })
      : "";
    const activeDemandAlreadyCompleted = activeDemandKey && completedHistory.some((item) => demandHistoryKey(item) === activeDemandKey);

    if (!cloudStats || (isAfter(localStats.updatedAt, cloudStats.updatedAt) && !activeDemandAlreadyCompleted)) {
      merged[userId] = { ...localStats, completedHistory };
      return;
    }

    merged[userId] = { ...cloudStats, completedHistory };
  });
  return merged;
}

function mergeCompletedHistory(localHistory = [], cloudHistory = []) {
  const historyByKey = new Map();
  [...cloudHistory, ...localHistory].forEach((item) => {
    if (!item?.startedAt) return;
    const key = demandHistoryKey(item);
    const current = historyByKey.get(key);
    if (!current || isAfter(item.finishedAt, current.finishedAt)) {
      historyByKey.set(key, item);
    }
  });
  return [...historyByKey.values()].sort((a, b) => new Date(b.finishedAt ?? 0) - new Date(a.finishedAt ?? 0));
}

function betMatchesCurrentDemand(bet, productivity) {
  const targetStartedAt = productivity?.[bet.targetUserId]?.startedAt;
  if (!targetStartedAt || !bet.createdAt) return false;
  return new Date(bet.createdAt).getTime() >= new Date(targetStartedAt).getTime();
}

function normalizeDemandBets(state) {
  const productivity = state.productivity ?? {};
  const finishBets = (state.finishBets ?? []).map((bet) => {
    if (bet.status !== "active") return bet;
    const stats = productivity[bet.targetUserId] ?? {};
    if (betMatchesCurrentDemand(bet, productivity)) return bet;
    return { ...bet, status: "expired", expiredAt: stats.startedAt ?? new Date().toISOString() };
  });
  return { ...state, finishBets };
}

function applyCloudState(current, cloudState) {
  const users = mergeUsersByUpdatedAt(current.users, cloudState.users);
  const productivity = mergeProductivityByUpdatedAt(current.productivity, cloudState.productivity);
  const syncedUser = users.find((user) => user.id === current.user?.id);
  return normalizeDemandBets({
    ...current,
    ...cloudState,
    users,
    productivity,
    user: syncedUser ? { ...syncedUser, active: true } : current.user
  });
}

function calcOdds(competition, optionId, users = [], productivity = {}) {
  const total = Math.max(competition.bets.length, 1);
  const optionBets = competition.bets.filter((bet) => bet.optionId === optionId).length;
  const option = competition.options.find((item) => item.id === optionId);
  const matchedUser = users.find((user) => option?.label?.toLowerCase().includes(user.username.toLowerCase()));
  const stats = matchedUser ? productivity[matchedUser.id] ?? {} : {};
  const performanceBoost = (stats.completedTopics ?? 0) * 0.08 + ((stats.progress ?? 0) / 100) * 0.35;
  const popularityPenalty = optionBets / total;
  const lonelyBonus = optionBets === 0 ? 1.25 : 0;
  const activity = Math.min(1.4, competition.bets.length * 0.12);
  return Number(Math.max(1.2, Math.min(6.8, 2.4 + lonelyBonus + activity - popularityPenalty * 3 - performanceBoost)).toFixed(1));
}

function Login({ users, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    const clean = username.trim();
    if (!clean) return setMessage("Digite um nome de produtor.");
    const existing = users.find((user) => user.username.toLowerCase() === clean.toLowerCase());
    if (mode === "login") {
      if (!existing) return setMessage("Produtor não encontrado. Cadastre primeiro.");
      onLogin(existing);
      return;
    }
    if (existing) return setMessage("Esse produtor já existe. Use Entrar.");
    onRegister({ username: clean, avatar: (avatar.trim() || clean.charAt(0)).slice(0, 2).toUpperCase() });
  }

  return (
    <main className="login-shell">
      <div className="arena-orb orb-a" />
      <div className="arena-orb orb-b" />
      <motion.section className="login-card" initial={false} animate={{ opacity: 1 }}>
        <p className="eyebrow">Workspace criativo fictício / ENFECOINS sem valor real</p>
        <h1>ENFE 2026</h1>
        <p className="login-copy">
          A arena editorial onde a equipe transforma arquivos, revisões, entregas e desafios criativos em um jogo social.
        </p>
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>Entrar</button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>Cadastrar</button>
        </div>
        <form className="login-form" onSubmit={submit}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nome do produtor" maxLength={18} />
          {mode === "register" ? <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="Avatar opcional" maxLength={2} /> : null}
          {message ? <p className="form-message">{message}</p> : null}
          <button type="submit">{mode === "login" ? "Entrar no ENFE 2026" : "Criar produtor"}</button>
        </form>
      </motion.section>
    </main>
  );
}

function CompetitionCreator({ users, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [challengeType, setChallengeType] = useState("productivity");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [durationHours, setDurationHours] = useState(2);
  const [reward, setReward] = useState(20);
  const [entryAmount, setEntryAmount] = useState(5);
  const [options, setOptions] = useState("");

  function toggleParticipant(user) {
    setSelectedParticipants((current) => {
      const exists = current.some((item) => item.id === user.id);
      if (exists) return current.filter((item) => item.id !== user.id);
      return [...current, { id: user.id, username: user.username }];
    });
  }

  function fillParticipantOptions() {
    setOptions(selectedParticipants.map((user) => `${user.username} vence o desafio`).join("\n"));
  }

  function submit(event) {
    event.preventDefault();
    const parsed = options.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 8);
    if (!title.trim() || parsed.length < 2) return;
    const participantNames = selectedParticipants.map((user) => user.username);
    onCreate({
      title: title.trim(),
      description: description.trim() || "Desafio criativo da equipe.",
      participants: participantNames.length ? participantNames.join(", ") : "Equipe editorial",
      participantIds: selectedParticipants.map((user) => user.id),
      category: challengeType === "creative" ? "tournament" : challengeType === "health" ? "challenge" : "active",
      challengeType,
      timer: `${durationHours || 1}h`,
      reward: Number(reward) || 0,
      entryAmount: Number(entryAmount) || 0,
      endTime: `termina em ${durationHours || 1}h`,
      options: parsed.map((label, index) => ({ id: `option-${index + 1}`, label }))
    });
    setTitle("");
    setDescription("");
    setSelectedParticipants([]);
    setDurationHours(2);
    setReward(20);
    setEntryAmount(5);
    setOptions("");
  }

  return (
    <form className="creator-card" onSubmit={submit}>
      <div>
        <p className="eyebrow">Criar desafio rápido</p>
        <h3>Novo desafio da equipe</h3>
        <p className="helper-copy">Preencha o essencial. O ENFE transforma isso em uma competição com ENFECOINS fictícios.</p>
      </div>
      <label>
        1. Qual é o desafio?
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Quem termina o arquivo primeiro?" />
      </label>
      <label>
        2. Regra simples
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: vale arquivo exportado e aprovado" />
      </label>

      <div className="creator-wide">
        <span className="field-title">3. Quem participa?</span>
        <small>Escolha pessoas cadastradas. Depois clique para gerar os palpites automaticamente.</small>
        <div className="choice-grid">
          {!users.length ? <p className="empty-state">Nenhum usuário cadastrado ainda.</p> : null}
          {users.map((user) => {
            const active = selectedParticipants.some((item) => item.id === user.id);
            return (
              <button className={active ? "choice active" : "choice"} type="button" key={user.id} onClick={() => toggleParticipant(user)}>
                {user.avatar} {user.username}
              </button>
            );
          })}
        </div>
        <button className="ghost-button" type="button" onClick={fillParticipantOptions} disabled={!selectedParticipants.length}>
          Gerar opções com participantes
        </button>
      </div>

      <div className="creator-wide">
        <span className="field-title">4. Tipo do desafio</span>
        <div className="choice-grid">
          {challengeTypes.map((item) => (
            <button className={challengeType === item.id ? "choice active" : "choice"} type="button" key={item.id} onClick={() => setChallengeType(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <label>
        5. Duração em horas
        <input type="number" min="1" max="48" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
      </label>
      <label>
        Recompensa
        <input type="number" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="20" />
        <small>Bônus fictício pago ao vencedor.</small>
      </label>
      <label>
        Entrada por palpite
        <input type="number" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} placeholder="5" />
        <small>Valor sugerido em ENFECOINS.</small>
      </label>
      <label className="creator-wide">
        6. Opções de palpite
        <textarea value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Uma opção por linha. Ex: Pedro vence o desafio" />
        <small>Se escolher participantes, você pode gerar isso automaticamente.</small>
      </label>
      <button type="submit">Criar desafio</button>
    </form>
  );
}

function CompetitionCard({ competition, user, users, productivity, onBet, onResolve, onDelete }) {
  const [amount, setAmount] = useState(competition.entryAmount || 5);
  const existingBet = competition.bets.find((bet) => bet.userId === user.id);
  const pool = competition.bets.reduce((sum, bet) => sum + bet.amount, 0);
  const category = categories.find((item) => item.id === competition.category) ?? categories[0];
  const challenge = challengeTypes.find((item) => item.id === competition.challengeType);

  return (
    <motion.article className={`competition-card ${category.color}`} whileHover={{ y: -4 }}>
      <div className="card-topline">
        <span>{challenge?.label ?? category.label}</span>
        <strong>{competition.status === "active" ? "AO VIVO" : "ENCERRADA"}</strong>
      </div>
      <h3>{competition.title}</h3>
      <p>{competition.description}</p>
      <div className="competition-meta">
        <span>{competition.participants}</span>
        <span>{competition.timer || "Sprint ativo"}</span>
        <span>Prêmio {pool + (competition.reward ?? 0)} ENFECOINS</span>
        <span>Entrada {competition.entryAmount ?? 0}</span>
        <span>{competition.endTime || "sem fim definido"}</span>
        <span>{competition.bets.length} palpites</span>
      </div>
      <div className="options-grid">
        {competition.options.map((option) => {
          const odds = calcOdds(competition, option.id, users, productivity);
          const votes = competition.bets.filter((bet) => bet.optionId === option.id).length;
          return (
            <div className="option-card" key={option.id}>
              <div className="option-head">
                <strong>{option.label}</strong>
                <span>x{odds}</span>
              </div>
              <p>{votes} palpites / retorno {money(amount * odds)} ENFECOINS</p>
              <button
                type="button"
                disabled={Boolean(existingBet) || competition.status !== "active" || user.enfecoins < amount}
                onClick={() => onBet({ competitionId: competition.id, optionId: option.id, amount, odds })}
              >
                {existingBet ? "Travado" : "Palpitar"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="card-actions">
        <label>
          ENFECOINS
          <input type="number" min="1" max={user.enfecoins} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 1)} />
        </label>
        <div>
          {competition.options.map((option) => (
            <button key={option.id} type="button" onClick={() => onResolve({ competitionId: competition.id, winningOptionId: option.id })}>
              Vencedor: {option.label}
            </button>
          ))}
          <button type="button" className="danger" onClick={() => onDelete(competition.id)}>Apagar</button>
        </div>
      </div>
    </motion.article>
  );
}

function WhoBetWhat({ users, competitions }) {
  const bets = competitions.flatMap((competition) => competition.bets.map((bet) => ({ ...bet, competitionTitle: competition.title })));
  return (
    <section className="section-card">
      <p className="eyebrow">Palpites criativos em tempo real</p>
      <h2>WHO BET WHAT</h2>
      <div className="social-grid">
        {!bets.length ? <p className="empty-state">Nenhum palpite ainda. O sprint está esperando.</p> : null}
        {bets.slice(-12).reverse().map((bet) => {
          const user = users.find((item) => item.id === bet.userId);
          return (
            <article key={bet.id} className="social-card">
              <div className="avatar">{user?.avatar ?? bet.username.charAt(0)}</div>
              <div>
                <h3>{bet.username}</h3>
                <p>Desafio: {bet.competitionTitle}</p>
                <p>Palpite: {bet.optionLabel}</p>
                <p>Aposta: {bet.amount} ENFECOINS / Odds x{bet.odds}</p>
                <span>{rankFor(user ?? {})}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PlayerProfile({ user, productivity, finishBets, onRename }) {
  const [name, setName] = useState(user.username);
  const [open, setOpen] = useState(false);
  const stats = productivity?.[user.id] ?? {};
  const history = stats.completedHistory ?? [];
  const activeUserBets = (finishBets ?? []).filter(
    (bet) =>
      bet.status === "active" &&
      (bet.bettorId === user.id || bet.targetUserId === user.id) &&
      betMatchesCurrentDemand(bet, productivity)
  );

  useEffect(() => {
    setName(user.username);
  }, [user.username]);

  return (
    <section className="section-card player-profile">
      <div className="profile-row">
        <div className="avatar large">{user.avatar}</div>
        <div>
          <p className="eyebrow">Perfil do usuário</p>
          <h2>{user.username}</h2>
          <p>{rankFor(user)}</p>
        </div>
      </div>
      <button className="profile-edit-toggle" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "Fechar edição" : "Alterar nome"}
      </button>
      {open ? (
        <form
          className="rename-form"
          onSubmit={(event) => {
            event.preventDefault();
            onRename(name);
            setOpen(false);
          }}
        >
          <label>
            Novo nome
            <input value={name} onChange={(event) => setName(event.target.value)} maxLength={18} />
          </label>
          <button type="submit">Salvar nome</button>
        </form>
      ) : null}
      <div className="profile-detail-grid">
        <span>Demandas concluídas: {user.completedDemands ?? 0}</span>
        <span>Bônus de produção: {money(user.speedBonusWon ?? 0)}</span>
        <span>Moedas ganhas: {money(user.totalWon ?? 0)}</span>
        <span>Palpites ativos: {activeUserBets.length}</span>
      </div>
      <div className="profile-history">
        <strong>Últimas demandas</strong>
        {!history.length ? <p>Nenhuma demanda concluída ainda.</p> : null}
        {history.slice(0, 3).map((item) => (
          <article key={item.id}>
            <span>{item.file || "Demanda sem nome"}</span>
            <small>{item.durationLabel} / {item.topics ?? 1} tópicos</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function Dashboard({ state, setState, onLogout }) {
  const userProfile = state.users.find((user) => user.id === state.user?.id) ?? state.user;
  const activeCompetitions = state.competitions.filter((item) => item.status === "active");
  const productivity = state.productivity ?? {};
  const totalCoins = state.users.reduce((sum, user) => sum + (user.enfecoins ?? 0), 0);
  const totalTopics = state.users.reduce((sum, user) => sum + (productivity[user.id]?.completedTopics ?? 0), 0);
  const totalFiles = state.users.reduce((sum, user) => sum + (productivity[user.id]?.completedFiles ?? 0), 0);
  const topProducer = [...state.users].sort((a, b) => {
    const coinDiff = Number(b.enfecoins ?? 0) - Number(a.enfecoins ?? 0);
    if (coinDiff) return coinDiff;
    return (b.completedDemands ?? 0) - (a.completedDemands ?? 0);
  })[0];

  function createCompetition(data) {
    const competition = {
      id: makeId("competition"),
      ...data,
      bets: [],
      status: "active",
      createdById: state.user.id,
      createdByName: state.user.username,
      createdAt: new Date().toISOString()
    };
    setState((current) => ({
      ...current,
      competitions: [competition, ...current.competitions],
      volatility: clamp(current.volatility + 4),
      graph: [...current.graph.slice(1), clamp(current.volatility + 12)],
      feed: [`${current.user.username} criou o desafio: ${competition.title}`, ...current.feed].slice(0, 20)
    }));
  }

  function betCompetition({ competitionId, optionId, amount, odds }) {
    setState((current) => {
      const competition = current.competitions.find((item) => item.id === competitionId);
      if (!competition || competition.bets.some((bet) => bet.userId === current.user.id) || current.user.enfecoins < amount) return current;
      const option = competition.options.find((item) => item.id === optionId);
      const bet = {
        id: makeId("bet"),
        userId: current.user.id,
        username: current.user.username,
        optionId,
        optionLabel: option?.label ?? "Opção",
        amount,
        odds,
        confidence: Math.floor(55 + Math.random() * 44),
        createdAt: new Date().toISOString()
      };
      return {
        ...current,
        user: updateUserRecord(current.user, { enfecoins: current.user.enfecoins - amount }),
        users: current.users.map((user) =>
          user.id === current.user.id ? updateUserRecord(user, { enfecoins: (user.enfecoins ?? 0) - amount }) : user
        ),
        competitions: current.competitions.map((item) => item.id === competitionId ? { ...item, bets: [...item.bets, bet] } : item),
        volatility: clamp(current.volatility + 2),
        totalCoinFlow: current.totalCoinFlow + amount,
        feed: [`${current.user.username} apostou ${amount} ENFECOINS em ${option?.label}`, ...current.feed].slice(0, 20)
      };
    });
  }

  function resolveCompetition({ competitionId, winningOptionId }) {
    setState((current) => {
      const competition = current.competitions.find((item) => item.id === competitionId);
      if (!competition || competition.status !== "active") return current;
      const winner = competition.options.find((item) => item.id === winningOptionId);
      const users = current.users.map((user) => {
        const bet = competition.bets.find((item) => item.userId === user.id);
        if (!bet) return user;
        const won = bet.optionId === winningOptionId;
        const reward = won ? Math.round(bet.amount * bet.odds) + (competition.reward ?? 0) : 0;
        const next = {
          ...user,
          enfecoins: user.enfecoins + reward,
          wins: (user.wins ?? 0) + (won ? 1 : 0),
          losses: (user.losses ?? 0) + (won ? 0 : 1),
          totalWon: (user.totalWon ?? 0) + reward,
          totalLost: (user.totalLost ?? 0) + (won ? 0 : bet.amount),
          bestOddsWon: won ? Math.max(user.bestOddsWon ?? 0, bet.odds) : user.bestOddsWon ?? 0,
          winstreak: won ? (user.winstreak ?? 0) + 1 : 0
        };
        return updateUserRecord(next, { rank: rankFor(next) });
      });
      return {
        ...current,
        users,
        user: users.find((user) => user.id === current.user.id) ?? current.user,
        competitions: current.competitions.map((item) => item.id === competitionId ? { ...item, status: "resolved", winningOptionId } : item),
        feed: [`${competition.title} encerrou. Resultado: ${winner?.label}`, ...current.feed].slice(0, 20)
      };
    });
  }

  function deleteCompetition(id) {
    setState((current) => ({
      ...current,
      competitions: current.competitions.filter((item) => item.id !== id),
      feed: [`${current.user.username} apagou um desafio`, ...current.feed].slice(0, 20)
    }));
  }

  function updateProductivity(draft) {
    setState((current) => ({
      ...current,
      productivity: {
        ...(current.productivity ?? {}),
        [current.user.id]: {
          ...(current.productivity?.[current.user.id] ?? {}),
          ...draft,
          startedAt:
            current.productivity?.[current.user.id]?.currentFile === draft.currentFile &&
            current.productivity?.[current.user.id]?.currentTask === draft.currentTask
              ? current.productivity?.[current.user.id]?.startedAt ?? new Date().toISOString()
              : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      feed: [`${current.user.username} atualizou: ${draft.currentTask || "produção em andamento"}`, ...current.feed].slice(0, 20)
    }));
  }

  function startDemand(draft) {
    setState((current) => {
      const startedAt = new Date().toISOString();
      const staleBets = (current.finishBets ?? []).filter(
        (bet) => bet.targetUserId === current.user.id && bet.status === "active"
      );

      return {
        ...current,
        finishBets: (current.finishBets ?? []).map((bet) =>
          bet.targetUserId === current.user.id && bet.status === "active"
            ? { ...bet, status: "expired", expiredAt: startedAt }
            : bet
        ),
        productivity: {
          ...(current.productivity ?? {}),
          [current.user.id]: {
            ...(current.productivity?.[current.user.id] ?? {}),
            ...draft,
            progress: Number(draft.progress ?? 0),
            revisionStatus: draft.revisionStatus || "Em produção",
            startedAt,
            pausedAt: null,
            pausedMs: 0,
            updatedAt: startedAt
          }
        },
        feed: [
          `${current.user.username} iniciou ${draft.currentFile} com ${Number(draft.targetTopics) || 1} tópicos planejados`,
          `Prazo inicial de ${current.user.username}: ${Number(draft.estimateHours || 1)}h`,
          staleBets.length ? `${staleBets.length} palpites antigos foram liberados para a nova demanda` : null,
          ...current.feed
        ].filter(Boolean).slice(0, 20)
      };
    });
  }

  function workedMilliseconds(stats, finishedAt) {
    const start = stats.startedAt ? new Date(stats.startedAt).getTime() : new Date(finishedAt).getTime();
    const end = new Date(finishedAt).getTime();
    const pausedUntilFinish = stats.pausedAt ? Math.max(0, end - new Date(stats.pausedAt).getTime()) : 0;
    const pausedTotal = Number(stats.pausedMs ?? 0) + pausedUntilFinish;
    return Math.max(0, end - start - pausedTotal);
  }

  function formatDuration(stats, finishedAt) {
    const totalMinutes = Math.max(0, Math.round(workedMilliseconds(stats, finishedAt) / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours && minutes) return `${hours}h ${minutes}min`;
    if (hours) return `${hours}h`;
    return `${minutes}min`;
  }

  function calculateEarlyBonus(stats, finishedAt) {
    const estimateMinutes = Math.max(0, Number(stats.estimateHours || 0) * 60);
    const actualMinutes = Math.max(0, Math.round(workedMilliseconds(stats, finishedAt) / 60000));
    const savedMinutes = Math.max(0, Math.round(estimateMinutes - actualMinutes));
    const bonus = savedMinutes > 0 ? Math.max(1, Math.round(savedMinutes / 5)) : 0;
    return { estimateMinutes, actualMinutes, savedMinutes, bonus };
  }

  function calculateOnTimeBonus(stats, early) {
    const targetTopics = Math.max(1, Number(stats.targetTopics) || 1);
    const finishedOnTime = early.estimateMinutes > 0 && early.actualMinutes <= early.estimateMinutes;
    return finishedOnTime ? Math.max(5, targetTopics * 2) : 0;
  }

  function minimumBonusMinutes(early) {
    return Math.max(1, Math.ceil(early.estimateMinutes * MIN_BONUS_RATIO));
  }

  function canReceiveProductionBonus(early) {
    return early.actualMinutes >= minimumBonusMinutes(early);
  }

  function isBetForStartedDemand(bet, startedAt) {
    if (!startedAt || !bet.createdAt) return false;
    return new Date(bet.createdAt).getTime() >= new Date(startedAt).getTime();
  }

  function pauseDemand() {
    setState((current) => {
      const stats = current.productivity?.[current.user.id] ?? {};
      if (!stats.startedAt || stats.pausedAt) return current;
      return {
        ...current,
        productivity: {
          ...(current.productivity ?? {}),
          [current.user.id]: {
            ...stats,
            pausedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        },
        feed: [`${current.user.username} pausou a demanda`, ...current.feed].slice(0, 20)
      };
    });
  }

  function resumeDemand() {
    setState((current) => {
      const stats = current.productivity?.[current.user.id] ?? {};
      if (!stats.startedAt || !stats.pausedAt) return current;
      const pauseMs = Math.max(0, Date.now() - new Date(stats.pausedAt).getTime());
      return {
        ...current,
        productivity: {
          ...(current.productivity ?? {}),
          [current.user.id]: {
            ...stats,
            pausedAt: null,
            pausedMs: Number(stats.pausedMs ?? 0) + pauseMs,
            updatedAt: new Date().toISOString()
          }
        },
        feed: [`${current.user.username} retomou a demanda`, ...current.feed].slice(0, 20)
      };
    });
  }

  function extendDemand(additionalHours) {
    setState((current) => {
      const stats = current.productivity?.[current.user.id] ?? {};
      const hours = Math.max(0.25, Number(additionalHours) || 0.25);
      if (!stats.startedAt) return current;
      const previousEstimate = Number(stats.estimateHours || 1);
      const nextEstimate = Number((previousEstimate + hours).toFixed(2));
      return {
        ...current,
        productivity: {
          ...(current.productivity ?? {}),
          [current.user.id]: {
            ...stats,
            estimateHours: nextEstimate,
            extensionCount: (stats.extensionCount ?? 0) + 1,
            extensionHours: Number(((stats.extensionHours ?? 0) + hours).toFixed(2)),
            updatedAt: new Date().toISOString()
          }
        },
        feed: [
          `${current.user.username} adicionou ${hours}h ao prazo da demanda`,
          `Novo prazo de ${current.user.username}: ${nextEstimate}h no total`,
          ...current.feed
        ].slice(0, 20)
      };
    });
  }

  function cancelDemand() {
    setState((current) => {
      const stats = current.productivity?.[current.user.id] ?? {};
      if (!stats.startedAt) return current;

      const canceledAt = new Date().toISOString();
      const activeBets = (current.finishBets ?? []).filter(
        (bet) =>
          bet.targetUserId === current.user.id &&
          bet.status === "active" &&
          isBetForStartedDemand(bet, stats.startedAt)
      );
      const refundedUsers = current.users.map((user) => {
        const refund = activeBets
          .filter((bet) => bet.bettorId === user.id)
          .reduce((sum, bet) => sum + Number(bet.amount ?? 0), 0);
        return refund ? updateUserRecord(user, { enfecoins: (user.enfecoins ?? 0) + refund }) : user;
      });

      return {
        ...current,
        users: refundedUsers,
        user: refundedUsers.find((user) => user.id === current.user.id) ?? current.user,
        finishBets: (current.finishBets ?? []).map((bet) =>
          bet.targetUserId === current.user.id && bet.status === "active" && isBetForStartedDemand(bet, stats.startedAt)
            ? { ...bet, status: "canceled", canceledAt, refunded: true }
            : bet
        ),
        productivity: {
          ...(current.productivity ?? {}),
          [current.user.id]: {
            ...stats,
            currentFile: "",
            currentTask: "",
            estimateHours: 1,
            targetTopics: 1,
            progress: 0,
            revisionStatus: "Em produção",
            startedAt: null,
            pausedAt: null,
            pausedMs: 0,
            canceledAt,
            updatedAt: canceledAt
          }
        },
        feed: [
          `${current.user.username} cancelou a demanda atual`,
          activeBets.length ? `${activeBets.length} palpites foram cancelados e reembolsados` : "Nenhum palpite precisava ser reembolsado",
          ...current.feed
        ].slice(0, 20)
      };
    });
  }

  function placeFinishBet({ targetUserId, windowId, windowLabel, amount, odds }) {
    setState((current) => {
      const target = current.users.find((user) => user.id === targetUserId);
      const bettor = current.users.find((user) => user.id === current.user.id) ?? current.user;
      const targetStats = current.productivity?.[targetUserId] ?? {};
      const betAmount = Math.max(1, Number(amount) || 1);
      const already = (current.finishBets ?? []).some(
        (bet) =>
          bet.bettorId === bettor.id &&
          bet.targetUserId === targetUserId &&
          bet.status === "active" &&
          isBetForStartedDemand(bet, targetStats.startedAt)
      );
      const currentBalance = bettor.enfecoins ?? 0;
      if (!target || !targetStats.startedAt || already || currentBalance < betAmount) return current;
      const bet = {
        id: makeId("finish-bet"),
        bettorId: bettor.id,
        bettorName: bettor.username,
        targetUserId,
        targetName: target.username,
        targetStartedAt: targetStats.startedAt,
        windowId,
        windowLabel,
        amount: betAmount,
        odds,
        status: "active",
        createdAt: new Date().toISOString()
      };
      return {
        ...current,
        user: updateUserRecord(current.user, { username: bettor.username, enfecoins: currentBalance - betAmount }),
        users: current.users.map((user) => user.id === bettor.id ? updateUserRecord(user, { enfecoins: currentBalance - betAmount }) : user),
        finishBets: [...(current.finishBets ?? []), bet],
        totalCoinFlow: current.totalCoinFlow + betAmount,
        feed: [`${bettor.username} acreditou em ${target.username}`, ...current.feed].slice(0, 20)
      };
    });
  }

  function cancelFinishBet(betId) {
    setState((current) => {
      const bettor = current.users.find((user) => user.id === current.user.id) ?? current.user;
      const bet = (current.finishBets ?? []).find(
        (item) => item.id === betId && item.bettorId === bettor.id && item.status === "active"
      );
      if (!bet) return current;

      const canceledAt = new Date().toISOString();
      const refund = Number(bet.amount ?? 0);
      const users = current.users.map((user) =>
        user.id === bettor.id ? updateUserRecord(user, { enfecoins: (user.enfecoins ?? 0) + refund }) : user
      );

      return {
        ...current,
        users,
        user: users.find((user) => user.id === bettor.id) ?? current.user,
        finishBets: (current.finishBets ?? []).map((item) =>
          item.id === betId ? { ...item, status: "canceled", refunded: true, canceledAt } : item
        ),
        feed: [`${bettor.username} cancelou um palpite e recebeu ${refund} ENFECOINS de volta`, ...current.feed].slice(0, 20)
      };
    });
  }

  function completeDemand() {
    setState((current) => {
      const stats = current.productivity?.[current.user.id] ?? {};
      if (!stats.startedAt) return current;
      const currentDemandKey = demandHistoryKey({
        startedAt: stats.startedAt,
        file: stats.currentFile,
        task: stats.currentTask
      });
      const alreadyCompleted = (stats.completedHistory ?? []).some((item) => demandHistoryKey(item) === currentDemandKey);
      if (alreadyCompleted) {
        const canceledAt = new Date().toISOString();
        const stuckBets = (current.finishBets ?? []).filter(
          (bet) =>
            bet.targetUserId === current.user.id &&
            bet.status === "active" &&
            isBetForStartedDemand(bet, stats.startedAt)
        );
        const refundedUsers = current.users.map((user) => {
          const refund = stuckBets
            .filter((bet) => bet.bettorId === user.id)
            .reduce((sum, bet) => sum + Number(bet.amount ?? 0), 0);
          return refund ? updateUserRecord(user, { enfecoins: (user.enfecoins ?? 0) + refund }) : user;
        });
        return {
          ...current,
          users: refundedUsers,
          user: refundedUsers.find((user) => user.id === current.user.id) ?? current.user,
          finishBets: (current.finishBets ?? []).map((bet) =>
            stuckBets.some((stuckBet) => stuckBet.id === bet.id)
              ? { ...bet, status: "canceled", refunded: true, canceledAt }
              : bet
          ),
          productivity: {
            ...(current.productivity ?? {}),
            [current.user.id]: {
              ...stats,
              currentFile: "",
              currentTask: "",
              estimateHours: 1,
              targetTopics: 1,
              progress: 0,
              revisionStatus: "Em produção",
              startedAt: null,
              pausedAt: null,
              pausedMs: 0,
              updatedAt: new Date().toISOString()
            }
          },
          feed: [
            `${current.user.username} tentou finalizar uma demanda já registrada`,
            stuckBets.length ? `${stuckBets.length} palpites presos foram reembolsados` : null,
            ...current.feed
          ].filter(Boolean).slice(0, 20)
        };
      }
      const finishedAt = new Date().toISOString();
      const pausedMsAtFinish = Number(stats.pausedMs ?? 0) + (
        stats.pausedAt ? Math.max(0, new Date(finishedAt).getTime() - new Date(stats.pausedAt).getTime()) : 0
      );
      const winningWindow = classifyFinishWindow(stats, finishedAt);
      const durationLabel = formatDuration(stats, finishedAt);
      const early = calculateEarlyBonus(stats, finishedAt);
      const minimumMinutes = minimumBonusMinutes(early);
      const bonusAllowed = canReceiveProductionBonus(early);
      const earlyBonus = bonusAllowed ? early.bonus : 0;
      const onTimeBonus = bonusAllowed ? calculateOnTimeBonus(stats, early) : 0;
      const producerBonus = earlyBonus + onTimeBonus;
      const finishBets = (current.finishBets ?? []).map((bet) =>
        bet.targetUserId === current.user.id && bet.status === "active" && isBetForStartedDemand(bet, stats.startedAt)
          ? { ...bet, status: "resolved", winningWindow, won: didFinishBetWin(bet, stats, finishedAt), resolvedAt: finishedAt }
          : bet
      );
      const resolvedBets = finishBets.filter((bet) => bet.targetUserId === current.user.id && bet.resolvedAt === finishedAt);
      const wonCount = resolvedBets.filter((bet) => bet.won).length;
      const winnerFeed = resolvedBets
        .filter((bet) => bet.won)
        .map((bet) => `${bet.bettorName} ganhou ${Math.round(bet.amount * bet.odds)} ENFECOINS por acreditar em ${bet.targetName} (${bet.windowLabel || bet.windowId})`);
      const users = current.users.map((user) => {
        const wonBets = finishBets.filter((bet) => bet.bettorId === user.id && bet.resolvedAt === finishedAt && bet.won);
        const reward = wonBets.reduce((sum, bet) => sum + Math.round(bet.amount * bet.odds), 0);
        const productionBonus = user.id === current.user.id ? producerBonus : 0;
        if (!reward && !productionBonus && user.id !== current.user.id) return user;
        return updateUserRecord(user, {
          enfecoins: (user.enfecoins ?? 0) + reward + productionBonus,
          wins: (user.wins ?? 0) + (reward ? wonBets.length : 0),
          completedDemands: (user.completedDemands ?? 0) + (user.id === current.user.id ? 1 : 0),
          totalWon: (user.totalWon ?? 0) + reward + productionBonus,
          speedBonusWon: (user.speedBonusWon ?? 0) + productionBonus
        });
      });
      return {
        ...current,
        users,
        user: users.find((user) => user.id === current.user.id) ?? current.user,
        finishBets,
        productivity: {
          ...(current.productivity ?? {}),
          [current.user.id]: {
            ...stats,
            currentFile: "",
            currentTask: "",
            estimateHours: 1,
            targetTopics: 1,
            progress: 0,
            revisionStatus: "Em produção",
            completedTopics: (stats.completedTopics ?? 0) + (Number(stats.targetTopics) || 1),
            completedFiles: (stats.completedFiles ?? 0) + 1,
            finishedAt,
            startedAt: null,
            pausedAt: null,
            pausedMs: 0,
            updatedAt: finishedAt,
            completedHistory: [
              {
                id: completedDemandId(current.user.id, stats.startedAt),
                file: stats.currentFile,
                task: stats.currentTask,
                topics: Number(stats.targetTopics) || 1,
                progress: stats.progress,
                startedAt: stats.startedAt,
                pausedMs: pausedMsAtFinish,
                finishedAt,
                estimateMinutes: early.estimateMinutes,
                actualMinutes: early.actualMinutes,
                savedMinutes: early.savedMinutes,
                speedBonus: producerBonus,
                onTimeBonus,
                earlyBonus,
                noBonusReason: bonusAllowed ? "" : `Sem bônus: trabalhou menos de 25% do prazo marcado (${minimumMinutes} min).`,
                finishedAtLabel: new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit"
                }).format(new Date(finishedAt)),
                durationLabel
              },
              ...(stats.completedHistory ?? []).filter((item) => demandHistoryKey(item) !== currentDemandKey)
            ].slice(0, 20)
          }
        },
        feed: [
          bonusAllowed ? null : `${current.user.username} finalizou antes de 25% do prazo marcado e não recebeu bônus`,
          onTimeBonus ? `${current.user.username} ganhou ${onTimeBonus} ENFECOINS por cumprir o prazo marcado` : `${current.user.username} não recebeu bônus de prazo`,
          earlyBonus ? `${current.user.username} ganhou ${earlyBonus} ENFECOINS extras por terminar antes do tempo` : null,
          `${current.user.username} finalizou a demanda em ${durationLabel}`,
          `${current.user.username} concluiu ${Number(stats.targetTopics) || 1} tópicos`,
          ...winnerFeed.slice(0, 5),
          resolvedBets.length ? `${wonCount} de ${resolvedBets.length} palpites acertaram a janela ${winningWindow}` : "Nenhum palpite ativo nessa demanda",
          ...current.feed
        ].filter(Boolean).slice(0, 20)
      };
    });
  }

  function sendChatMessage({ type, toId, text }) {
    const message = { id: makeId("chat"), type, toId, text, fromId: state.user.id, fromName: state.user.username, createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, chatMessages: [...current.chatMessages, message].slice(-200) }));
  }

  function renameUser(newName) {
    const clean = newName.trim();
    if (!clean || clean.length < 2) return;
    setState((current) => ({
      ...current,
      user: updateUserRecord(current.user, { username: clean }),
      users: current.users.map((user) => user.id === current.user.id ? updateUserRecord(user, { username: clean }) : user),
      finishBets: (current.finishBets ?? []).map((bet) => ({
        ...bet,
        bettorName: bet.bettorId === current.user.id ? clean : bet.bettorName,
        targetName: bet.targetUserId === current.user.id ? clean : bet.targetName
      })),
      chatMessages: current.chatMessages.map((message) =>
        message.fromId === current.user.id ? { ...message, fromName: clean } : message
      ),
      feed: [`${current.user.username} mudou o nome para ${clean}`, ...current.feed].slice(0, 20)
    }));
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div className="brand-pill">ENFE 2026</div>
        <div className="nav-stats">
          <span>{money(userProfile.enfecoins)} ENFECOINS</span>
          <span>{rankFor(userProfile)}</span>
          <span>{backendMode}</span>
        </div>
        <button onClick={onLogout}>Sair</button>
      </nav>

      <section className="hero-section">
        <div className="hero-glow" />
        <p className="eyebrow">Arena editorial colaborativa / competição fictícia / sem dinheiro real</p>
        <motion.h1 initial={false} animate={{ opacity: 1 }}>ENFE 2026</motion.h1>
        <p>Workspace criativo gamificado para arquivos, layouts, apresentações e sprints de equipe.</p>
        <div className="hero-metrics">
          <MetricCard label="Produtores Online" value={state.users.filter((user) => user.active).length} detail="ao vivo" />
          <MetricCard label="Tópicos Concluídos" value={totalTopics} detail="equipe" />
          <MetricCard label="Arquivos Finalizados" value={totalFiles} detail="entregas" />
          <MetricCard label="Demandas Ativas" value={state.users.filter((user) => productivity[user.id]?.startedAt).length} detail="agora" />
          <MetricCard label="Líder Atual" value={topProducer?.username ?? "--"} detail="ranking" />
          <MetricCard label="ENFECOINS" value={totalCoins} detail="fictícios" />
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="main-stack">
          <Leaderboard users={state.users} />
          <ProductivityPanel
            user={state.user}
            productivity={productivity}
            onUpdate={updateProductivity}
            onStart={startDemand}
            onPause={pauseDemand}
            onResume={resumeDemand}
            onExtend={extendDemand}
            onCancel={cancelDemand}
            onComplete={completeDemand}
          />
          <CompletedDemands user={state.user} productivity={productivity} />
          <TeamProgress users={state.users} productivity={productivity} />
          <DemandBetting
            user={userProfile}
            users={state.users}
            productivity={productivity}
            finishBets={state.finishBets ?? []}
            onBet={placeFinishBet}
            onCancelBet={cancelFinishBet}
          />
          <WhoBetWhat users={state.users} competitions={state.competitions} />
        </div>

        <aside className="side-stack">
          <PlayerProfile user={userProfile} productivity={productivity} finishBets={state.finishBets ?? []} onRename={renameUser} />

          <section className="section-card compact-profile">
            <p className="eyebrow">Estatísticas do jogador</p>
            <div className="profile-stats">
              <span>{money(userProfile.enfecoins)} ENFECOINS</span>
              <span>Vitórias {userProfile.wins ?? 0}</span>
              <span>Derrotas {userProfile.losses ?? 0}</span>
              <span>Winstreak {userProfile.winstreak ?? 0}</span>
              <span>Melhor odd x{userProfile.bestOddsWon ?? 0}</span>
              <span>Bônus de produção {money(userProfile.speedBonusWon ?? 0)}</span>
              <span>Favorito {userProfile.favoriteCompetition ?? "Sprint Editorial"}</span>
            </div>
          </section>

          <LiveFeed feed={state.feed.length ? state.feed : ["Sprint editorial está ao vivo"]} />
          <ChatPanel user={state.user} users={state.users} messages={state.chatMessages} onSend={sendChatMessage} />
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  const [state, setState] = useState(() => normalizeDemandBets(loadState()));
  const applyingRemote = useRef(false);
  const cloudReady = useRef(!supabase);
  const lastCloudSnapshot = useRef("");

  useEffect(() => {
    const mustReset = window.localStorage.getItem("enfe-force-state") !== "clean-v2";
    if (mustReset) {
      resetCrybetStorage();
      window.localStorage.setItem("enfe-reset-marker", "enfe-clean-v2");
      window.localStorage.setItem("enfe-force-state", "clean-v2");
      setState(emptyState());
    }
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    loadCloudState().then((cloudState) => {
      cloudReady.current = true;
      if (cancelled || !cloudState || Object.keys(cloudState).length === 0 || cloudState.platform !== "enfe-clean-v2") return;
      lastCloudSnapshot.current = JSON.stringify(cloudState);
      applyingRemote.current = true;
      setState((current) => {
        const normalized = applyCloudState(current, cloudState);
        const normalizedSnapshot = JSON.stringify(toCloudState(normalized));
        if (normalizedSnapshot !== JSON.stringify(cloudState)) {
          lastCloudSnapshot.current = normalizedSnapshot;
          window.setTimeout(() => saveCloudState(normalized), 0);
        }
        return normalized;
      });
    });
    return subscribeCloudState((cloudState) => {
      if (cloudState.platform !== "enfe-clean-v2") return;
      lastCloudSnapshot.current = JSON.stringify(cloudState);
      applyingRemote.current = true;
      setState((current) => {
        const normalized = applyCloudState(current, cloudState);
        const normalizedSnapshot = JSON.stringify(toCloudState(normalized));
        if (normalizedSnapshot !== JSON.stringify(cloudState)) {
          lastCloudSnapshot.current = normalizedSnapshot;
          window.setTimeout(() => saveCloudState(normalized), 0);
        }
        return normalized;
      });
    });
  }, []);

  useEffect(() => {
    saveState(state);
    if (!supabase || applyingRemote.current || !cloudReady.current) {
      applyingRemote.current = false;
      return;
    }
    const snapshot = JSON.stringify(toCloudState(state));
    if (snapshot === lastCloudSnapshot.current) return;
    lastCloudSnapshot.current = snapshot;
    saveCloudState(state);
  }, [state]);

  function activateUser(profile, label) {
    const activeProfile = updateUserRecord(profile, { enfecoins: profile.enfecoins ?? 50, active: true, rank: rankFor(profile) });
    setState((current) => ({
      ...current,
      user: activeProfile,
      users: [activeProfile, ...current.users.filter((user) => user.id !== activeProfile.id)].map((user) =>
        user.id === activeProfile.id ? activeProfile : user
      ),
      feed: [`${activeProfile.username} ${label}`, ...current.feed].slice(0, 20)
    }));
  }

  function register(user) {
    activateUser({
      id: makeId("user"),
      username: user.username,
      avatar: user.avatar,
      enfecoins: 50,
      wins: 0,
      losses: 0,
      totalWon: 0,
      totalLost: 0,
      bestOddsWon: 0,
      winstreak: 0,
      favoriteCompetition: "Sprint Editorial"
    }, "entrou no sprint editorial");
  }

  function logout() {
    setState((current) => ({
      ...current,
      user: null,
      users: current.users.map((user) => user.id === current.user?.id ? updateUserRecord(user, { active: false }) : user)
    }));
  }

  if (!state.user) return <Login users={state.users} onLogin={(user) => activateUser(user, "entrou no workspace")} onRegister={register} />;
  return <Dashboard state={state} setState={setState} onLogout={logout} />;
}
