import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChatPanel } from "./components/ChatPanel";
import { Graph } from "./components/Graph";
import { Leaderboard } from "./components/Leaderboard";
import { LiveFeed } from "./components/LiveFeed";
import { MetricCard } from "./components/MetricCard";
import { categories, rankFor, ranks, starterCompetitions, weekendEvents } from "./data/enfe";
import { loadCloudState, saveCloudState, subscribeCloudState, toCloudState } from "./lib/cloudState";
import { clamp, emptyState, loadState, makeId, resetCrybetStorage, saveState } from "./lib/storage";
import { supabase, backendMode } from "./lib/supabaseClient";

function calcOdds(competition, optionId) {
  const total = Math.max(competition.bets.length, 1);
  const optionBets = competition.bets.filter((bet) => bet.optionId === optionId).length;
  const popularityPenalty = optionBets / total;
  const lonelyBonus = optionBets === 0 ? 1.25 : 0;
  const activity = Math.min(1.4, competition.bets.length * 0.12);
  return Number(Math.max(1.2, Math.min(6.8, 2.4 + lonelyBonus + activity - popularityPenalty * 3)).toFixed(1));
}

function money(value) {
  return Math.round(value ?? 0);
}

function Login({ users, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState("");
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    const clean = username.trim();
    if (!clean) return setMessage("Digite um nome de jogador.");
    const existing = users.find((user) => user.username.toLowerCase() === clean.toLowerCase());
    if (mode === "login") {
      if (!existing) return setMessage("Jogador nao encontrado. Cadastre primeiro.");
      onLogin(existing);
      return;
    }
    if (existing) return setMessage("Esse jogador ja existe. Use Entrar.");
    onRegister({ username: clean, avatar: (avatar.trim() || clean.charAt(0)).slice(0, 2).toUpperCase() });
  }

  return (
    <main className="login-shell">
      <div className="arena-orb orb-a" />
      <div className="arena-orb orb-b" />
      <motion.section className="login-card" initial={false} animate={{ opacity: 1, y: 0 }}>
        <p className="eyebrow">Fictional social game / no real money / no payments</p>
        <h1>ENFE 2026</h1>
        <p className="login-copy">
          The Ultimate Competition Arena. Crie desafios, entre em torneios, use ENFECOINS ficticios e dispute o ranking
          com seus amigos.
        </p>
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => setMode("login")}>
            Entrar
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => setMode("register")}>
            Cadastrar
          </button>
        </div>
        <form className="login-form" onSubmit={submit}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nome do jogador" maxLength={18} />
          {mode === "register" ? (
            <input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="Avatar opcional" maxLength={2} />
          ) : null}
          {message ? <p className="form-message">{message}</p> : null}
          <button type="submit">{mode === "login" ? "Enter ENFE 2026" : "Criar jogador"}</button>
        </form>
      </motion.section>
    </main>
  );
}

function CompetitionCard({ competition, user, onBet, onResolve, onDelete }) {
  const [amount, setAmount] = useState(10);
  const existingBet = competition.bets.find((bet) => bet.userId === user.id);
  const pool = competition.bets.reduce((sum, bet) => sum + bet.amount, 0);
  const category = categories.find((item) => item.id === competition.category) ?? categories[0];

  return (
    <motion.article className={`competition-card ${category.color}`} whileHover={{ y: -4 }}>
      <div className="card-topline">
        <span>{category.label}</span>
        <strong>{competition.status === "active" ? "LIVE" : "RESOLVED"}</strong>
      </div>
      <h3>{competition.title}</h3>
      <p>{competition.description}</p>
      <div className="competition-meta">
        <span>{competition.participants}</span>
        <span>{competition.timer}</span>
        <span>Pool 🪙 {pool}</span>
        <span>{competition.bets.length} bets</span>
      </div>
      <div className="options-grid">
        {competition.options.map((option) => {
          const odds = calcOdds(competition, option.id);
          const votes = competition.bets.filter((bet) => bet.optionId === option.id).length;
          return (
            <div className="option-card" key={option.id}>
              <div className="option-head">
                <strong>{option.label}</strong>
                <span>x{odds}</span>
              </div>
              <p>{votes} predictions / reward 🪙 {money(amount * odds)}</p>
              <button
                type="button"
                disabled={Boolean(existingBet) || competition.status !== "active" || user.enfecoins < amount}
                onClick={() => onBet({ competitionId: competition.id, optionId: option.id, amount, odds })}
              >
                {existingBet ? "Locked" : "Predict"}
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
              Winner: {option.label}
            </button>
          ))}
          <button type="button" className="danger" onClick={() => onDelete(competition.id)}>
            Delete
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function CompetitionCreator({ onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [participants, setParticipants] = useState("");
  const [category, setCategory] = useState("active");
  const [options, setOptions] = useState("Team Alpha\nTeam Omega");

  function submit(event) {
    event.preventDefault();
    const parsed = options.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 6);
    if (!title.trim() || parsed.length < 2) return;
    onCreate({
      title: title.trim(),
      description: description.trim() || "Fictional arena challenge.",
      participants: participants.trim() || "Open lobby",
      category,
      timer: "LIVE",
      options: parsed.map((label, index) => ({ id: `option-${index + 1}`, label }))
    });
    setTitle("");
    setDescription("");
    setParticipants("");
    setOptions("Team Alpha\nTeam Omega");
  }

  return (
    <form className="creator-card" onSubmit={submit}>
      <div>
        <p className="eyebrow">Create competition</p>
        <h3>Launch a new arena</h3>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Competition title" />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
      <input value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Participants" />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        {categories.map((item) => (
          <option key={item.id} value={item.id}>{item.label}</option>
        ))}
      </select>
      <textarea value={options} onChange={(e) => setOptions(e.target.value)} placeholder="One prediction option per line" />
      <button type="submit">Create Arena</button>
    </form>
  );
}

function WhoBetWhat({ users, competitions }) {
  const bets = competitions.flatMap((competition) =>
    competition.bets.map((bet) => ({ ...bet, competitionTitle: competition.title }))
  );

  return (
    <section className="section-card">
      <p className="eyebrow">Realtime social predictions</p>
      <h2>WHO BET WHAT</h2>
      <div className="social-grid">
        {!bets.length ? <p className="empty-state">No predictions yet. The arena is waiting.</p> : null}
        {bets.slice(-12).reverse().map((bet) => {
          const user = users.find((item) => item.id === bet.userId);
          return (
            <article key={bet.id} className="social-card">
              <div className="avatar">{user?.avatar ?? bet.username.charAt(0)}</div>
              <div>
                <h3>{bet.username}</h3>
                <p>Competition: {bet.competitionTitle}</p>
                <p>Prediction: {bet.optionLabel}</p>
                <p>Bet: {bet.amount} ENFECOINS / Odds x{bet.odds}</p>
                <span>{rankFor(user ?? {})}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Dashboard({ state, setState, onLogout }) {
  const userProfile = state.users.find((user) => user.id === state.user?.id) ?? state.user;
  const activeCompetitions = state.competitions.filter((item) => item.status === "active");
  const topPlayer = [...state.users].sort((a, b) => (b.enfecoins ?? 0) - (a.enfecoins ?? 0))[0];
  const totalCoins = state.users.reduce((sum, user) => sum + (user.enfecoins ?? 0), 0);

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
      feed: [`${current.user.username} created ${competition.title}`, ...current.feed].slice(0, 20)
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
        optionLabel: option?.label ?? "Unknown",
        amount,
        odds,
        confidence: Math.floor(55 + Math.random() * 44),
        createdAt: new Date().toISOString()
      };
      return {
        ...current,
        user: { ...current.user, enfecoins: current.user.enfecoins - amount },
        users: current.users.map((user) => user.id === current.user.id ? { ...user, enfecoins: user.enfecoins - amount } : user),
        competitions: current.competitions.map((item) => item.id === competitionId ? { ...item, bets: [...item.bets, bet] } : item),
        volatility: clamp(current.volatility + 2),
        totalCoinFlow: current.totalCoinFlow + amount,
        feed: [`${current.user.username} placed ${amount} ENFECOINS on ${option?.label}`, ...current.feed].slice(0, 20)
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
        const reward = won ? Math.round(bet.amount * bet.odds) : 0;
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
        return { ...next, rank: rankFor(next) };
      });
      return {
        ...current,
        users,
        user: users.find((user) => user.id === current.user.id) ?? current.user,
        competitions: current.competitions.map((item) => item.id === competitionId ? { ...item, status: "resolved", winningOptionId } : item),
        feed: [`${competition.title} ended. Winner: ${winner?.label}`, ...current.feed].slice(0, 20)
      };
    });
  }

  function deleteCompetition(id) {
    setState((current) => ({
      ...current,
      competitions: current.competitions.filter((item) => item.id !== id),
      feed: [`${current.user.username} deleted a competition`, ...current.feed].slice(0, 20)
    }));
  }

  function sendChatMessage({ type, toId, text }) {
    const message = { id: makeId("chat"), type, toId, text, fromId: state.user.id, fromName: state.user.username, createdAt: new Date().toISOString() };
    setState((current) => ({ ...current, chatMessages: [...current.chatMessages, message].slice(-200) }));
  }

  return (
    <main className="app-shell">
      <nav className="topbar">
        <div className="brand-pill">ENFE 2026</div>
        <div className="nav-stats">
          <span>🪙 {money(userProfile.enfecoins)} ENFECOINS</span>
          <span>{rankFor(userProfile)}</span>
          <span>{backendMode}</span>
        </div>
        <button onClick={onLogout}>Logout</button>
      </nav>

      <section className="hero-section">
        <div className="hero-glow" />
        <p className="eyebrow">Fictional social arena / no real-world financial value</p>
        <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>ENFE 2026</motion.h1>
        <p>The Ultimate Competition Arena</p>
        <div className="hero-metrics">
          <MetricCard label="Players Online" value={state.users.filter((user) => user.active).length} detail="live" />
          <MetricCard label="Active Tournaments" value={state.competitions.filter((item) => item.category === "tournament" && item.status === "active").length} detail="brackets" />
          <MetricCard label="Live Competitions" value={activeCompetitions.length} detail="arenas" />
          <MetricCard label="Top Player" value={topPlayer?.username ?? "--"} detail="current" />
          <MetricCard label="Weekend Event" value={state.eventStatus} detail="status" />
          <MetricCard label="Coin Circulation" value={`🪙 ${totalCoins}`} detail="fictional" />
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="main-stack">
          <section className="section-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Live competitions</p>
                <h2>Arena Board</h2>
              </div>
              <span>{activeCompetitions.length} active</span>
            </div>
            <CompetitionCreator onCreate={createCompetition} />
            {!state.competitions.length ? (
              <div className="template-grid">
                {starterCompetitions.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="template-card"
                    onClick={() =>
                      createCompetition({
                        ...item,
                        options: item.options.map((label, index) => ({ id: `option-${index + 1}`, label }))
                      })
                    }
                  >
                    <span>{item.category}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </button>
                ))}
              </div>
            ) : null}
            <div className="competition-list">
              {state.competitions.map((competition) => (
                <CompetitionCard
                  key={competition.id}
                  competition={competition}
                  user={userProfile}
                  onBet={betCompetition}
                  onResolve={resolveCompetition}
                  onDelete={deleteCompetition}
                />
              ))}
            </div>
          </section>

          <section className="section-card">
            <p className="eyebrow">Weekend events</p>
            <h2>Weekend Arena</h2>
            <div className="weekend-grid">
              {weekendEvents.map((event) => (
                <article key={`${event.day}-${event.title}`} className="event-card">
                  <span>{event.day}</span>
                  <h3>{event.title}</h3>
                  <p>{event.description}</p>
                  <strong>{event.status}</strong>
                </article>
              ))}
            </div>
          </section>

          <WhoBetWhat users={state.users} competitions={state.competitions} />
          <ChatPanel user={state.user} users={state.users} messages={state.chatMessages} onSend={sendChatMessage} />
        </div>

        <aside className="side-stack">
          <section className="section-card player-profile">
            <p className="eyebrow">Player profile</p>
            <div className="profile-row">
              <div className="avatar large">{userProfile.avatar}</div>
              <div>
                <h2>{userProfile.username}</h2>
                <p>{rankFor(userProfile)}</p>
              </div>
            </div>
            <div className="profile-stats">
              <span>Coins 🪙 {money(userProfile.enfecoins)}</span>
              <span>Wins {userProfile.wins ?? 0}</span>
              <span>Losses {userProfile.losses ?? 0}</span>
              <span>Winstreak {userProfile.winstreak ?? 0}</span>
              <span>Best odds x{userProfile.bestOddsWon ?? 0}</span>
              <span>Favorite {userProfile.favoriteCompetition ?? "Open Arena"}</span>
            </div>
          </section>

          <section className="section-card">
            <p className="eyebrow">Live market dashboard</p>
            <h2>Market Pulse</h2>
            <Graph data={state.graph} />
            <div className="market-stats">
              <span>Volatility {state.volatility}%</span>
              <span>Coin flow 🪙 {state.totalCoinFlow}</span>
              <span>Trending {state.topEvent}</span>
            </div>
          </section>

          <LiveFeed feed={state.feed.length ? state.feed : ["Weekend Arena event is now live"]} />
          <Leaderboard users={state.users} />
        </aside>
      </div>
    </main>
  );
}

export default function App() {
  const [state, setState] = useState(() => loadState());
  const applyingRemote = useRef(false);
  const cloudReady = useRef(!supabase);
  const lastCloudSnapshot = useRef("");

  useEffect(() => {
    const mustReset = window.localStorage.getItem("enfe-force-state") !== "v1";
    if (mustReset) {
      resetCrybetStorage();
      window.localStorage.setItem("enfe-reset-marker", "enfe-2026-v1");
      window.localStorage.setItem("enfe-force-state", "v1");
      setState(emptyState());
    }
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    loadCloudState().then((cloudState) => {
      cloudReady.current = true;
      if (cancelled || !cloudState || Object.keys(cloudState).length === 0 || cloudState.platform !== "enfe-2026") return;
      lastCloudSnapshot.current = JSON.stringify(cloudState);
      applyingRemote.current = true;
      setState((current) => ({ ...current, ...cloudState, user: current.user }));
    });
    return subscribeCloudState((cloudState) => {
      if (cloudState.platform !== "enfe-2026") return;
      lastCloudSnapshot.current = JSON.stringify(cloudState);
      applyingRemote.current = true;
      setState((current) => ({ ...current, ...cloudState, user: current.user }));
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
    const activeProfile = { ...profile, active: true, rank: rankFor(profile) };
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
      favoriteCompetition: "Open Arena"
    }, "joined ENFE 2026");
  }

  function logout() {
    setState((current) => ({
      ...current,
      user: null,
      users: current.users.map((user) => user.id === current.user?.id ? { ...user, active: false } : user)
    }));
  }

  if (!state.user) return <Login users={state.users} onLogin={(user) => activateUser(user, "entered the arena")} onRegister={register} />;
  return <Dashboard state={state} setState={setState} onLogout={logout} />;
}
