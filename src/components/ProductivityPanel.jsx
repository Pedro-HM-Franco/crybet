import { useEffect, useState } from "react";

function workedMilliseconds(stats, now) {
  if (!stats.startedAt) return 0;
  const start = new Date(stats.startedAt).getTime();
  const pausedNow = stats.pausedAt ? Math.max(0, now - new Date(stats.pausedAt).getTime()) : 0;
  const pausedTotal = Number(stats.pausedMs ?? 0) + pausedNow;
  return Math.max(0, now - start - pausedTotal);
}

function formatElapsed(stats, now) {
  const totalSeconds = Math.max(0, Math.floor(workedMilliseconds(stats, now) / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatMinutes(totalMinutes = 0) {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export function ProductivityPanel({ user, productivity, onUpdate, onStart, onPause, onResume, onComplete }) {
  const current = productivity[user.id] ?? {
    currentFile: "",
    currentTask: "",
    progress: 0,
    estimateHours: 1,
    targetTopics: 1,
    completedTopics: 0,
    completedFiles: 0,
    deliveredAssets: 0,
    waterMl: 0,
    revisionStatus: "Em producao"
  };

  const [draft, setDraft] = useState(current);
  const isStarted = Boolean(current.startedAt);
  const isPaused = Boolean(current.pausedAt);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isStarted || isPaused) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isStarted, isPaused]);

  useEffect(() => {
    setDraft(current);
  }, [
    current.currentFile,
    current.currentTask,
    current.progress,
    current.estimateHours,
    current.targetTopics,
    current.revisionStatus
  ]);

  function update(field, value) {
    setDraft((state) => ({ ...state, [field]: value }));
  }

  return (
    <section className="section-card productivity-panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Comece por aqui</p>
          <h2>Meu Trabalho Agora</h2>
          <p className="helper-copy">Atualize o que voce esta fazendo. Isso alimenta ranking, odds e feed ao vivo.</p>
        </div>
        <div className="timer-card">
          <span>{isPaused ? "Pausado" : "Cronometro"}</span>
          <strong>{formatElapsed(current, now)}</strong>
        </div>
      </div>

      <div className="productivity-form">
        <label>
          Material atual
          <input value={draft.currentFile} onChange={(e) => update("currentFile", e.target.value)} placeholder="Ex: Banner Instagram, PDF final, apresentacao" />
          <small>Qual material voce esta produzindo agora.</small>
        </label>
        <label>
          O que estou fazendo
          <input value={draft.currentTask} onChange={(e) => update("currentTask", e.target.value)} placeholder="Ex: diagramação, revisao, exportacao, ajustes" />
          <small>O que voce esta fazendo dentro desse arquivo.</small>
        </label>
        <label>
          Falta quanto tempo? (horas)
          <input type="number" min="0.25" step="0.25" value={draft.estimateHours} onChange={(e) => update("estimateHours", Number(e.target.value))} />
          <small>Exemplo: 0.5 = meia hora, 2 = duas horas.</small>
        </label>
        <label>
          Quantos topicos serao terminados?
          <input type="number" min="1" value={draft.targetTopics} onChange={(e) => update("targetTopics", Number(e.target.value) || 1)} />
          <small>Use para planejar a demanda atual.</small>
        </label>
        <div className="creator-wide">
          <span className="field-title">Status de revisao</span>
          <div className="choice-grid">
            {["Em producao", "Em revisao"].map((status) => (
              <button className={draft.revisionStatus === status ? "choice active" : "choice"} type="button" key={status} onClick={() => update("revisionStatus", status)}>
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <span className="field-title">Controle da demanda</span>
        <button type="button" onClick={() => onStart(draft)} disabled={isStarted || !draft.currentFile || !draft.currentTask}>
          Iniciar demanda
        </button>
        {isStarted && !isPaused ? (
          <button type="button" className="pause-button" onClick={onPause}>
            Pausar
          </button>
        ) : null}
        {isStarted && isPaused ? (
          <button type="button" className="resume-button" onClick={onResume}>
            Retomar
          </button>
        ) : null}
        <button type="button" className="complete-button" onClick={onComplete} disabled={!isStarted}>
          Finalizar demanda
        </button>
        {isPaused ? <small>Demanda pausada. O tempo parado nao entra no cronometro.</small> : null}
        {isStarted && !isPaused ? <small>Demanda em andamento desde que foi iniciada.</small> : null}
        {!isStarted ? <small>Preencha material e tarefa para iniciar.</small> : null}
      </div>

    </section>
  );
}

export function TeamProgress({ users, productivity }) {
  const totals = users.reduce(
    (acc, user) => {
      const stats = productivity[user.id] ?? {};
      acc.topics += stats.completedTopics ?? 0;
      acc.files += stats.completedFiles ?? 0;
      acc.assets += stats.deliveredAssets ?? 0;
      acc.water += stats.waterMl ?? 0;
      return acc;
    },
    { topics: 0, files: 0, assets: 0, water: 0 }
  );

  return (
    <section className="section-card">
      <p className="eyebrow">Progresso coletivo ao vivo</p>
      <h2>Central de Producao</h2>
      <div className="team-totals">
        <span>Topicos {totals.topics}</span>
        <span>Arquivos {totals.files}</span>
        <span>Assets {totals.assets}</span>
        <span>Agua {totals.water}ml</span>
      </div>
      <div className="progress-grid">
        {!users.length ? <p className="empty-state">Nenhum produtor online ainda.</p> : null}
        {users.map((user) => {
          const stats = productivity[user.id] ?? {};
          return (
            <article key={user.id} className="progress-card">
              <div className="avatar">{user.avatar}</div>
              <div>
                <h3>{user.username}</h3>
                <p>{stats.currentFile || "Sem arquivo definido"}</p>
                <p>{stats.currentTask || "Aguardando tarefa"}</p>
                {stats.startedAt ? <small>{stats.pausedAt ? "Pausado" : "Em andamento"}</small> : null}
              </div>
              <div className="progress-bar">
                <span style={{ width: `${stats.progress ?? 0}%` }} />
              </div>
              <small>{stats.progress ?? 0}% / {stats.revisionStatus ?? "Sem status"}</small>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function CompletedDemands({ user, productivity }) {
  const history = productivity[user.id]?.completedHistory ?? [];

  return (
    <section className="section-card completed-demands">
      <p className="eyebrow">Historico pessoal</p>
      <h2>Demandas Concluidas</h2>
      {!history.length ? (
        <p className="empty-state">Nenhuma demanda concluida ainda.</p>
      ) : (
        <div className="completed-list">
          {history.slice(0, 8).map((item) => (
            <article key={item.id} className="completed-item">
              <strong>{item.file || "Demanda sem nome"}</strong>
              <p>{item.task || "Tarefa nao informada"}</p>
              <p>{item.topics ?? 1} topicos planejados/concluidos</p>
              <span>{item.finishedAtLabel}</span>
              <em>Tempo gasto: {item.durationLabel}</em>
              {item.speedBonus ? (
                <div className="speed-bonus">
                  <span>Bonus de velocidade</span>
                  <strong>+{item.speedBonus} ENFECOINS</strong>
                  <small>{formatMinutes(item.savedMinutes)} antes do combinado</small>
                </div>
              ) : (
                <small className="muted-note">Sem bonus: terminou no tempo marcado ou depois.</small>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
