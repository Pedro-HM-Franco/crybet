import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChatPanel } from "./components/ChatPanel";
import { Graph } from "./components/Graph";
import { Leaderboard } from "./components/Leaderboard";
import { LiveFeed } from "./components/LiveFeed";
import { MetricCard } from "./components/MetricCard";
import { ProductivityPanel, TeamProgress } from "./components/ProductivityPanel";
import { categories, challengeTypes, rankFor, starterCompetitions, weekendEvents } from "./data/enfe";
import { loadCloudState, saveCloudState, subscribeCloudState, toCloudState } from "./lib/cloudState";
import { clamp, emptyState, loadState, makeId, resetCrybetStorage, saveState } from "./lib/storage";
import { backendMode, supabase } from "./lib/supabaseClient";

function money(value) {
  return Math.round(value ?? 0);
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
      if (!existing) return setMessage("Produtor nao encontrado. Cadastre primeiro.");
      onLogin(existing);
      return;
    }
    if (existing) return setMessage("Esse produtor ja existe. Use Entrar.");
    onRegister({ username: clean, avatar: (avatar.trim() || clean.charAt(0)).slice(0, 2).toUpperCase() });
  }

  return (
    <main className="login-shell">
      <div className="arena-orb orb-a" />
      <div className="arena-orb orb-b" />
      <motion.section className="login-card" initial={false} animate={{ opacity: 1 }}>
        <p className="eyebrow">Workspace criativo ficticio / ENFECOINS sem valor real</p>
        <h1>ENFE 2026</h1>
        <p className="login-copy">
          A arena editorial onde a equipe transforma arquivos, revisoes, entregas e desafios criativos em um jogo social.
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
  const [category, setCategory] = useState("active");
  const [challengeType, setChallengeType] = useState("productivity");
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [durationHours, setDurationHours] = useState(2);
  const [reward, setReward] = useState(20);
  const [entryAmount, setEntryAmount] = useState(5);
  const [endTime, setEndTime] = useState("");
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
      category,
      challengeType,
      timer: `${durationHours || 1}h`,
      reward: Number(reward) || 0,
      entryAmount: Number(entryAmount) || 0,
      endTime: endTime.trim(),
      options: parsed.map((label, index) => ({ id: `option-${index + 1}`, label }))
    });
    setTitle("");
    setDescription("");
    setSelectedParticipants([]);
    setDurationHours(2);
    setReward(20);
    setEntryAmount(5);
    setEndTime("");
    setOptions("");
  }

  return (
    <form className="creator-card" onSubmit={submit}>
      <div>
        <p className="eyebrow">Criar desafio personalizado</p>
        <h3>Lancar competicao criativa</h3>
      </div>
      <label>
        Nome do desafio
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Quem termina o arquivo primeiro?" />
        <small>Use um nome curto e facil de entender.</small>
      </label>
      <label>
        Descricao
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: vale arquivo exportado e aprovado" />
        <small>Explique a regra principal do desafio.</small>
      </label>

      <div className="creator-wide">
        <span className="field-title">Participantes cadastrados</span>
        <small>Selecione quem participa. As opcoes podem ser geradas automaticamente com esses nomes.</small>
        <div className="choice-grid">
          {!users.length ? <p className="empty-state">Nenhum usuario cadastrado ainda.</p> : null}
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
          Gerar opcoes com participantes
        </button>
      </div>

      <div className="creator-wide">
        <span className="field-title">Tipo do desafio</span>
        <div className="choice-grid">
          {challengeTypes.map((item) => (
            <button className={challengeType === item.id ? "choice active" : "choice"} type="button" key={item.id} onClick={() => setChallengeType(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="creator-wide">
        <span className="field-title">Categoria visual</span>
        <div className="choice-grid">
          {categories.map((item) => (
            <button className={category === item.id ? "choice active" : "choice"} type="button" key={item.id} onClick={() => setCategory(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <label>
        Duracao estimada em horas
        <input type="number" min="1" max="48" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
        <small>Exemplo: 2 = desafio dura duas horas.</small>
      </label>
      <label>
        Recompensa em ENFECOINS
        <input type="number" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="20" />
        <small>Bonus ficticio pago ao vencedor.</small>
      </label>
      <label>
        Entrada sugerida em ENFECOINS
        <input type="number" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} placeholder="5" />
        <small>Valor sugerido para cada palpite.</small>
      </label>
      <label>
        Horario de encerramento
        <input value={endTime} onChange={(e) => setEndTime(e.target.value)} placeholder="Ex: hoje 23h, domingo 18h" />
        <small>Texto livre para todo mundo entender o prazo.</small>
      </label>
      <label className="creator-wide">
        Opcoes de palpite
        <textarea value={options} onChange={(e) => setOptions(e.target.value)} placeholder="Uma opcao por linha. Ex: Pedro vence o desafio" />
        <small>Essas sao as opcoes em que as pessoas podem apostar.</small>
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
        <span>Premio {pool + (competition.reward ?? 0)} ENFECOINS</span>
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
        {!bets.length ? <p className="empty-state">Nenhum palpite ainda. O sprint esta esperando.</p> : null}
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

function Dashboard({ state, setState, onLogout }) {
  const userProfile = state.users.find((user) => user.id === state.user?.id) ?? state.user;
  const activeCompetitions = state.competitions.filter((item) => item.status === "active");
  const productivity = state.productivity ?? {};
  const totalCoins = state.users.reduce((sum, user) => sum + (user.enfecoins ?? 0), 0);
  const totalTopics = state.users.reduce((sum, user) => sum + (productivity[user.id]?.completedTopics ?? 0), 0);
  const totalFiles = state.users.reduce((sum, user) => sum + (productivity[user.id]?.completedFiles ?? 0), 0);
  const totalAssets = state.users.reduce((sum, user) => sum + (productivity[user.id]?.deliveredAssets ?? 0), 0);
  const topProducer = [...state.users].sort((a, b) => (productivity[b.id]?.completedTopics ?? 0) - (productivity[a.id]?.completedTopics ?? 0))[0];

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
        optionLabel: option?.label ?? "Opcao",
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
        return { ...next, rank: rankFor(next) };
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
        [current.user.id]: { ...(current.productivity?.[current.user.id] ?? {}), ...draft, updatedAt: new Date().toISOString() }
      },
      feed: [`${current.user.username} atualizou: ${draft.currentTask || "producao em andamento"}`, ...current.feed].slice(0, 20)
    }));
  }

  function quickLog(type) {
    const labels = {
      topic: "concluiu 1 topico",
      file: "finalizou 1 arquivo",
      asset: "entregou 1 asset",
      water: "bebeu 250ml de agua"
    };
    setState((current) => {
      const stats = current.productivity?.[current.user.id] ?? {};
      const nextStats = {
        ...stats,
        completedTopics: (stats.completedTopics ?? 0) + (type === "topic" ? 1 : 0),
        completedFiles: (stats.completedFiles ?? 0) + (type === "file" ? 1 : 0),
        deliveredAssets: (stats.deliveredAssets ?? 0) + (type === "asset" ? 1 : 0),
        waterMl: (stats.waterMl ?? 0) + (type === "water" ? 250 : 0),
        updatedAt: new Date().toISOString()
      };
      return {
        ...current,
        productivity: { ...(current.productivity ?? {}), [current.user.id]: nextStats },
        marketHeat: clamp(current.marketHeat + 2),
        graph: [...current.graph.slice(1), clamp((current.marketHeat ?? 0) + 8)],
        feed: [`${current.user.username} ${labels[type]}`, ...current.feed].slice(0, 20)
      };
    });
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
          <span>{money(userProfile.enfecoins)} ENFECOINS</span>
          <span>{rankFor(userProfile)}</span>
          <span>{backendMode}</span>
        </div>
        <button onClick={onLogout}>Sair</button>
      </nav>

      <section className="hero-section">
        <div className="hero-glow" />
        <p className="eyebrow">Arena editorial colaborativa / competicao ficticia / sem dinheiro real</p>
        <motion.h1 initial={false} animate={{ opacity: 1 }}>ENFE 2026</motion.h1>
        <p>Workspace criativo gamificado para arquivos, layouts, apresentacoes e sprints de equipe.</p>
        <div className="hero-metrics">
          <MetricCard label="Produtores Online" value={state.users.filter((user) => user.active).length} detail="ao vivo" />
          <MetricCard label="Topicos Concluidos" value={totalTopics} detail="equipe" />
          <MetricCard label="Arquivos Finalizados" value={totalFiles} detail="entregas" />
          <MetricCard label="Assets Entregues" value={totalAssets} detail="criativos" />
          <MetricCard label="Top Produtor" value={topProducer?.username ?? "--"} detail="ranking" />
          <MetricCard label="ENFECOINS" value={totalCoins} detail="ficticios" />
        </div>
      </section>

      <div className="dashboard-grid">
        <div className="main-stack">
          <section className="section-card">
            <div className="section-head">
              <div>
                <p className="eyebrow">Desafios criativos ao vivo</p>
                <h2>Painel de Producao</h2>
              </div>
              <span>{activeCompetitions.length} ativos</span>
            </div>
            <CompetitionCreator users={state.users} onCreate={createCompetition} />
            {!state.competitions.length ? (
              <div className="template-grid">
                {starterCompetitions.map((item) => (
                  <button
                    key={item.title}
                    type="button"
                    className="template-card"
                    onClick={() => createCompetition({ ...item, options: item.options.map((label, index) => ({ id: `option-${index + 1}`, label })) })}
                  >
                    <span>{item.challengeType}</span>
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
                  users={state.users}
                  productivity={productivity}
                  onBet={betCompetition}
                  onResolve={resolveCompetition}
                  onDelete={deleteCompetition}
                />
              ))}
            </div>
          </section>

          <TeamProgress users={state.users} productivity={productivity} />
          <ProductivityPanel user={state.user} productivity={productivity} onUpdate={updateProductivity} onQuickLog={quickLog} />

          <section className="section-card">
            <p className="eyebrow">Eventos editoriais de fim de semana</p>
            <h2>Sprints Criativos</h2>
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
            <p className="eyebrow">Perfil criativo</p>
            <div className="profile-row">
              <div className="avatar large">{userProfile.avatar}</div>
              <div>
                <h2>{userProfile.username}</h2>
                <p>{rankFor(userProfile)}</p>
              </div>
            </div>
            <div className="profile-stats">
              <span>{money(userProfile.enfecoins)} ENFECOINS</span>
              <span>Vitorias {userProfile.wins ?? 0}</span>
              <span>Derrotas {userProfile.losses ?? 0}</span>
              <span>Winstreak {userProfile.winstreak ?? 0}</span>
              <span>Melhor odd x{userProfile.bestOddsWon ?? 0}</span>
              <span>Favorito {userProfile.favoriteCompetition ?? "Sprint Editorial"}</span>
            </div>
          </section>

          <section className="section-card">
            <p className="eyebrow">Pulso produtivo ao vivo</p>
            <h2>Mercado Criativo</h2>
            <Graph data={state.graph} />
            <div className="market-stats">
              <span>Volatilidade {state.volatility}%</span>
              <span>Fluxo {state.totalCoinFlow} ENFECOINS</span>
              <span>Em alta {state.topEvent}</span>
            </div>
          </section>

          <LiveFeed feed={state.feed.length ? state.feed : ["Sprint editorial esta ao vivo"]} />
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
    const mustReset = window.localStorage.getItem("enfe-force-state") !== "editorial-v1";
    if (mustReset) {
      resetCrybetStorage();
      window.localStorage.setItem("enfe-reset-marker", "enfe-editorial-v1");
      window.localStorage.setItem("enfe-force-state", "editorial-v1");
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
      favoriteCompetition: "Sprint Editorial"
    }, "entrou no sprint editorial");
  }

  function logout() {
    setState((current) => ({
      ...current,
      user: null,
      users: current.users.map((user) => user.id === current.user?.id ? { ...user, active: false } : user)
    }));
  }

  if (!state.user) return <Login users={state.users} onLogin={(user) => activateUser(user, "entrou no workspace")} onRegister={register} />;
  return <Dashboard state={state} setState={setState} onLogout={logout} />;
}
