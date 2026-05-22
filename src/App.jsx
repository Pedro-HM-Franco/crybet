import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { analystTitles, periods } from "./data/periods";
import { backendMode } from "./lib/supabaseClient";
import { clamp, emptyState, loadState, makeId, nowLabel, resetCrybetStorage, saveState } from "./lib/storage";
import { calculateOdds, settlePredictions } from "./lib/market";
import { loadCloudState, saveCloudState, subscribeCloudState, toCloudState } from "./lib/cloudState";
import { supabase } from "./lib/supabaseClient";
import { Graph } from "./components/Graph";
import { IncidentArchive } from "./components/IncidentArchive";
import { Leaderboard } from "./components/Leaderboard";
import { LiveFeed } from "./components/LiveFeed";
import { MarketAnalysis } from "./components/MarketAnalysis";
import { Login } from "./components/Login";
import { MetricCard } from "./components/MetricCard";
import { PredictionBoard } from "./components/PredictionBoard";
import { PredictionCards } from "./components/PredictionCards";
import { Triggers } from "./components/Triggers";
import { WarningPanel } from "./components/WarningPanel";
import { ChatPanel } from "./components/ChatPanel";

function periodLabel(id) {
  return periods.find((period) => period.id === id)?.label ?? "Desconhecido";
}

function Dashboard({ state, setState, onLogout }) {
  const [activeTriggers, setActiveTriggers] = useState([]);
  const userPrediction = state.predictions.find((prediction) => prediction.userId === state.user?.id);
  const odds = useMemo(
    () =>
      calculateOdds({
        predictions: state.predictions,
        probability: state.probability,
        volatility: state.volatility,
        activeTriggerCount: state.activeTriggerCount,
        incidents: state.incidents
      }),
    [state.predictions, state.probability, state.volatility, state.activeTriggerCount, state.incidents]
  );

  const userProfile = useMemo(() => {
    return state.users.find((user) => user.id === state.user?.id);
  }, [state.user?.id, state.users]);

  function pushFeed(message) {
    setState((current) => ({
      ...current,
      feed: [message, ...current.feed].slice(0, 12)
    }));
  }

  function placePrediction({ period, amount, odds: selectedOdds }) {
    if (!state.user) return;
    if (userPrediction) {
      pushFeed(`${state.user.username} tentou uma segunda previsao diaria. O mercado rejeitou.`);
      return;
    }
    if ((userProfile?.crycoins ?? 0) < amount) {
      pushFeed(`${state.user.username} tentou apostar CRYCOINS demais. Mercado negou.`);
      return;
    }
    const confidence = Math.floor(55 + Math.random() * 44);
    const newPrediction = {
      id: makeId("prediction"),
      userId: state.user.id,
      username: state.user.username,
      avatar: state.user.avatar,
      period,
      amount,
      odds: selectedOdds,
      confidence,
      placedAt: nowLabel(),
      rank: userProfile?.title ?? analystTitles[0],
      previouslyCorrect: Boolean(userProfile?.correct),
      settled: false
    };

    setState((current) => ({
      ...current,
      user: { ...current.user, crycoins: current.user.crycoins - amount },
      users: current.users.map((user) =>
        user.id === current.user.id ? { ...user, crycoins: user.crycoins - amount } : user
      ),
      predictions: [
        newPrediction,
        ...current.predictions.filter((prediction) => prediction.userId !== current.user.id)
      ],
      dangerousPeriod: periodLabel(period),
      probability: clamp(current.probability + 3),
      graph: [...current.graph.slice(1), clamp(current.probability + 8)],
      feed: [
        `${current.user.username} colocou ${amount} CRYCOINS em ${periodLabel(period)} x${selectedOdds}`,
        ...current.feed
      ].slice(0, 12)
    }));
  }

  function activateTrigger(trigger) {
    setActiveTriggers((current) => [trigger, ...current.filter((item) => item !== trigger)].slice(0, 5));
    setState((current) => {
      const probability = clamp(current.probability + 7);
      const stability = clamp(current.stability - 6);
      const volatility = clamp(current.volatility + 5);
      return {
        ...current,
        probability,
        stability,
        volatility,
        activeTriggerCount: current.activeTriggerCount + 1,
        riskLevel: probability > 82 ? "CRITICO" : probability > 66 ? "ALTO" : "ELEVADO",
        graph: [...current.graph.slice(1), probability],
        feed: [`${current.user.username} detectou instabilidade emocional`, "ALERTA: risco emocional aumentando", `GATILHO ARMADO: ${trigger}`, ...current.feed].slice(0, 12)
      };
    });
  }

  function registerIncident(form) {
    const incidentPeriod = form.period;
    const incident = {
      id: makeId("incident"),
      cause: form.cause.trim(),
      time: form.time || nowLabel(),
      duration: form.duration || "Duracao desconhecida",
      severity: form.severity,
      period: incidentPeriod,
      createdAt: `RELATORIO CLASSIFICADO ${String(state.incidents.length + 1).padStart(3, "0")}`
    };

    setState((current) => {
      const settledUsers = settlePredictions({
        users: current.users,
        predictions: current.predictions,
        incidentPeriod
      });

      return {
        ...current,
        users: settledUsers,
        user: settledUsers.find((user) => user.id === current.user.id) ?? current.user,
        predictions: current.predictions.map((prediction) => ({ ...prediction, settled: true })),
        incidents: [incident, ...current.incidents],
        probability: clamp(current.probability + 11),
        stability: clamp(current.stability - 10),
        volatility: clamp(current.volatility + 9),
        lastCryHours: 0,
        riskLevel: "CRITICO",
        graph: [...current.graph.slice(1), clamp(current.probability + 11)],
        feed: [
          `${periodLabel(incidentPeriod)} foi o periodo vencedor do evento emocional`,
          `${current.user.username} registrou evento emocional da Cachinhos`,
          "Evento emocional com alta probabilidade detectado",
          ...current.feed
        ].slice(0, 12)
      };
    });
  }

  function sendChatMessage({ type, toId, text }) {
    const message = {
      id: makeId("chat"),
      type,
      text,
      fromId: state.user.id,
      fromName: state.user.username,
      toId,
      createdAt: new Date().toISOString()
    };

    setState((current) => ({
      ...current,
      chatMessages: [...(current.chatMessages ?? []), message].slice(-200),
      feed:
        type === "global"
          ? [`${current.user.username} enviou mensagem no chat geral`, ...current.feed].slice(0, 12)
          : current.feed
    }));
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="noise" />
      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
        <nav className="mb-5 flex flex-col gap-3 border border-white/30 bg-black/80 p-3 font-mono text-xs uppercase sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-3">
            <span className="border border-white/30 px-3 py-2">CRYBET LIVE</span>
            <span className="border border-white/30 px-3 py-2">🪙 {userProfile?.crycoins ?? 0} CRYCOINS</span>
            <span className="border border-white/30 px-3 py-2">Online: {state.users.filter((user) => user.active).length}</span>
          </div>
          <button
            className="border border-white px-4 py-2 transition hover:bg-white hover:text-black"
            type="button"
            onClick={onLogout}
          >
            Sair
          </button>
        </nav>

        <header className="mb-8 grid gap-5 border-b border-white/25 pb-8 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <p className="mono-label">Evento de fim de semana: prever quando Cachinhos vai chorar / sem dinheiro / sem apostas reais</p>
            <motion.h1
              className="glitch mt-3 font-display text-7xl leading-none tracking-normal md:text-9xl"
              initial={false}
              animate={{ opacity: 1, y: 0 }}
            >
              CRYBET
            </motion.h1>
            <p className="mt-3 max-w-2xl font-mono text-sm uppercase text-white/70 md:text-base">
              O mercado emocional ficticio onde amigos tentam prever a janela exata do fim de semana.
            </p>
          </div>
          <div className="panel p-4 font-mono text-xs uppercase">
            <p className="mono-label">Perfil do analista</p>
            <h2 className="mt-2 font-display text-3xl uppercase">{state.user.username}</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <span>Saldo: 🪙 {userProfile?.crycoins ?? 0}</span>
              <span>Ganhou: {userProfile?.totalWon ?? 0}</span>
              <span>Perdeu: {userProfile?.totalLost ?? 0}</span>
              <span>Melhor odd: x{userProfile?.bestOddsWon ?? 0}</span>
              <span>Modo: {backendMode}</span>
              <span>Previsao: {userPrediction ? "travada" : "disponivel"}</span>
            </div>
          </div>
        </header>

        <p className="mono-label mb-3">1. Hero Section / status emocional</p>
        <section className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Probabilidade da Cachinhos Chorar" value={`${state.probability}%`} detail="estimativa IA" intense />
          <MetricCard label="Medidor Emocional ao Vivo" value={`${state.stability}%`} detail="estabilidade" />
          <MetricCard label="Risco Emocional Atual" value={state.riskLevel} detail="ficticio" intense={state.riskLevel === "CRITICO"} />
          <MetricCard label="Horas Desde o Ultimo Choro" value={state.lastCryHours} detail="volatil" />
          <MetricCard label="Periodo Emocional Mais Perigoso" value={state.dangerousPeriod} detail="janela do mercado" />
          <MetricCard label="Indice de Volatilidade Emocional" value={state.volatility} detail="IVE" />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.38fr_.62fr]">
          <div className="space-y-6">
            <p className="mono-label">2. Prediction / Betting Section</p>
            <PredictionCards
              predictions={state.predictions}
              selected={userPrediction?.period}
              onSelect={placePrediction}
              locked={Boolean(userPrediction)}
              odds={odds}
              balance={userProfile?.crycoins ?? 0}
              probability={state.probability}
            />
            <p className="mono-label">3. Live Market Section</p>
            <Graph data={state.graph} />
            <p className="mono-label">4. Social Section</p>
            <PredictionBoard users={state.users} predictions={state.predictions} />
            <ChatPanel
              user={state.user}
              users={state.users}
              messages={state.chatMessages ?? []}
              onSend={sendChatMessage}
            />
            <p className="mono-label">5. Incidents + Triggers Section</p>
            <IncidentArchive incidents={state.incidents} onRegister={registerIncident} />
          </div>
          <div className="space-y-6">
            <p className="mono-label">Market Alerts + Profile Rankings</p>
            <WarningPanel probability={state.probability} riskLevel={state.riskLevel} />
            <MarketAnalysis
              users={state.users}
              predictions={state.predictions}
              probability={state.probability}
              stability={state.stability}
              odds={odds}
            />
            <Triggers activeTriggers={activeTriggers} onTrigger={activateTrigger} />
            <LiveFeed feed={state.feed} />
            <Leaderboard users={state.users} />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const [state, setState] = useState(() => loadState());
  const applyingRemote = useRef(false);
  const lastCloudSnapshot = useRef("");
  const cloudReady = useRef(!supabase);

  useEffect(() => {
    const mustHardReset = window.localStorage.getItem("crybet-force-empty-now") !== "weekend-v1";
    if (mustHardReset) {
      resetCrybetStorage();
      window.localStorage.setItem("crybet-reset-marker", "weekend-market-v1");
      window.localStorage.setItem("crybet-force-empty-now", "weekend-v1");
      setState(emptyState());
    }
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;

    loadCloudState().then((cloudState) => {
      cloudReady.current = true;
      if (cancelled || !cloudState || Object.keys(cloudState).length === 0) return;
      lastCloudSnapshot.current = JSON.stringify(cloudState);
      applyingRemote.current = true;
      setState((current) => ({ ...current, ...cloudState, user: current.user }));
    });

    return subscribeCloudState((cloudState) => {
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

    const cloudSnapshot = JSON.stringify(toCloudState(state));
    if (cloudSnapshot === lastCloudSnapshot.current) return;
    lastCloudSnapshot.current = cloudSnapshot;
    saveCloudState(state);
  }, [state]);

  function activateUser(profile, actionLabel) {
    const activeProfile = { ...profile, active: true };
    setState((current) => ({
      ...current,
      user: activeProfile,
      users: [activeProfile, ...current.users.filter((item) => item.id !== activeProfile.id)].map((item) =>
        item.id === activeProfile.id ? { ...item, active: true } : item
      ),
      feed: [`${activeProfile.username} ${actionLabel}`, ...current.feed].slice(0, 12)
    }));
  }

  function register(user) {
    const profile = {
      id: makeId("user"),
      username: user.username,
      avatar: user.avatar,
      correct: 0,
      wrong: 0,
      crycoins: 50,
      totalWon: 0,
      totalLost: 0,
      bestOddsWon: 0,
      winstreak: 0,
      favoritePeriod: "Indefinido",
      score: 100,
      title: analystTitles[Math.floor(Math.random() * analystTitles.length)],
      active: true
    };

    activateUser(profile, "se cadastrou no mercado emocional");
  }

  function login(profile) {
    activateUser(profile, "entrou no mercado emocional");
  }

  function logout() {
    setState((current) => ({
      ...current,
      user: null,
      users: current.users.map((user) =>
        user.id === current.user?.id ? { ...user, active: false } : user
      ),
      feed: current.user
        ? [`${current.user.username} saiu do mercado emocional`, ...current.feed].slice(0, 12)
        : current.feed
    }));
  }

  if (!state.user) {
    return <Login users={state.users} onLogin={login} onRegister={register} />;
  }

  return <Dashboard state={state} setState={setState} onLogout={logout} />;
}
