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

function deadlineInfo(stats, now) {
  const estimateMinutes = Math.max(1, Number(stats.estimateHours || 0) * 60);
  const workedMinutesValue = workedMilliseconds(stats, now) / 60000;
  const percent = Math.round((workedMinutesValue / estimateMinutes) * 100);
  const overdueMinutes = Math.max(0, workedMinutesValue - estimateMinutes);
  return {
    percent,
    width: Math.min(100, percent),
    overdue: overdueMinutes > 0,
    workedLabel: formatMinutes(workedMinutesValue),
    estimateLabel: formatMinutes(estimateMinutes),
    overdueLabel: formatMinutes(overdueMinutes)
  };
}

export function ProductivityPanel({ user, productivity, onUpdate, onStart, onPause, onResume, onExtend, onCancel, onComplete }) {
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
    revisionStatus: "Em produção"
  };

  const [draft, setDraft] = useState(current);
  const isStarted = Boolean(current.startedAt);
  const isPaused = Boolean(current.pausedAt);
  const [now, setNow] = useState(Date.now());
  const [extraHours, setExtraHours] = useState(0.5);
  const currentDeadline = isStarted ? deadlineInfo(current, now) : null;

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
          <p className="helper-copy">Atualize o que você está fazendo. Isso alimenta ranking, odds e feed ao vivo.</p>
        </div>
        <div className="timer-card">
          <span>{isPaused ? "Pausado" : "Cronômetro"}</span>
          <strong>{formatElapsed(current, now)}</strong>
        </div>
      </div>

      <div className="productivity-form">
        <label>
          Material atual
          <input value={draft.currentFile} onChange={(e) => update("currentFile", e.target.value)} placeholder="Ex: Banner Instagram, PDF final, apresentação" />
          <small>Qual material você está produzindo agora.</small>
        </label>
        <label>
          O que estou fazendo
          <input value={draft.currentTask} onChange={(e) => update("currentTask", e.target.value)} placeholder="Ex: diagramação, revisão, exportação, ajustes" />
          <small>O que você está fazendo dentro desse arquivo.</small>
        </label>
        <label>
          Falta quanto tempo? (horas)
          <input type="number" min="0.25" step="0.25" value={draft.estimateHours} onChange={(e) => update("estimateHours", Number(e.target.value))} />
          <small>Exemplo: 0.5 = meia hora, 2 = duas horas.</small>
        </label>
        <label>
          Quantos tópicos serão terminados?
          <input type="number" min="1" value={draft.targetTopics} onChange={(e) => update("targetTopics", Number(e.target.value) || 1)} />
          <small>Use para planejar a demanda atual.</small>
        </label>
        <div className="creator-wide">
          <span className="field-title">Status de revisão</span>
          <div className="choice-grid">
            {["Em produção", "Em revisão"].map((status) => (
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
        <button type="button" className="cancel-button" onClick={onCancel} disabled={!isStarted}>
          Cancelar demanda
        </button>
        {currentDeadline?.overdue ? (
          <div className="extend-deadline">
            <label>
              Adicionar prazo
              <input type="number" min="0.25" step="0.25" value={extraHours} onChange={(event) => setExtraHours(Number(event.target.value) || 0.25)} />
            </label>
            <button type="button" onClick={() => onExtend(extraHours)}>
              Adicionar {extraHours}h
            </button>
          </div>
        ) : null}
        {isPaused ? <small>Demanda pausada. O tempo parado não entra no cronômetro.</small> : null}
        {isStarted && !isPaused ? <small>Demanda em andamento desde que foi iniciada.</small> : null}
        {!isStarted ? <small>Preencha material e tarefa para iniciar.</small> : null}
      </div>
    </section>
  );
}

export function TeamProgress({ users, productivity }) {
  const [now, setNow] = useState(Date.now());
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

  useEffect(() => {
    const hasActiveDemand = users.some((user) => {
      const stats = productivity[user.id] ?? {};
      return stats.startedAt && !stats.pausedAt;
    });
    if (!hasActiveDemand) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [users, productivity]);

  return (
    <section className="section-card">
      <p className="eyebrow">Progresso coletivo ao vivo</p>
      <h2>Central de Produção</h2>
      <div className="team-totals">
        <span>Tópicos {totals.topics}</span>
        <span>Arquivos {totals.files}</span>
        <span>Assets {totals.assets}</span>
        <span>Água {totals.water}ml</span>
      </div>
      <div className="progress-grid">
        {!users.length ? <p className="empty-state">Nenhum produtor online ainda.</p> : null}
        {users.map((user) => {
          const stats = productivity[user.id] ?? {};
          const deadline = stats.startedAt ? deadlineInfo(stats, now) : null;
          return (
            <article key={user.id} className="progress-card">
              <div className="avatar">{user.avatar}</div>
              <div>
                <h3>{user.username}</h3>
                <p>{stats.currentFile || "Sem arquivo definido"}</p>
                <p>{stats.currentTask || "Aguardando tarefa"}</p>
                <span className="topic-target">
                  {stats.startedAt ? `${Number(stats.targetTopics) || 1} tópicos planejados` : "Sem tópicos planejados"}
                </span>
                {stats.startedAt ? <small>{stats.pausedAt ? "Pausado" : "Em andamento"}</small> : null}
              </div>
              <div className={deadline?.overdue ? "progress-bar deadline overdue" : "progress-bar deadline"}>
                <span style={{ width: `${deadline?.width ?? 0}%` }} />
              </div>
              <small className={deadline?.overdue ? "deadline-status overdue" : "deadline-status"}>
                {deadline
                  ? deadline.overdue
                    ? "Tempo ultrapassado"
                    : `${deadline.percent}% do prazo usado`
                  : `Sem demanda ativa / ${stats.revisionStatus ?? "Sem status"}`}
              </small>
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
      <p className="eyebrow">Histórico pessoal</p>
      <h2>Demandas Concluídas</h2>
      {!history.length ? (
        <p className="empty-state">Nenhuma demanda concluída ainda.</p>
      ) : (
        <div className="completed-list">
          {history.slice(0, 8).map((item) => (
            <article key={item.id} className="completed-item">
              <strong>{item.file || "Demanda sem nome"}</strong>
              <p>{item.task || "Tarefa não informada"}</p>
              <p>{item.topics ?? 1} tópicos planejados/concluídos</p>
              <span>{item.finishedAtLabel}</span>
              <em>Tempo gasto: {item.durationLabel}</em>
              {item.speedBonus ? (
                <div className="speed-bonus">
                  <span>Bônus de produção</span>
                  <strong>+{item.speedBonus} ENFECOINS</strong>
                  <small>
                    {item.savedMinutes > 0
                      ? `${formatMinutes(item.savedMinutes)} antes do combinado`
                      : "Prazo cumprido no tempo marcado"}
                  </small>
                </div>
              ) : (
                <small className="muted-note">Sem bônus: terminou depois do tempo marcado.</small>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
