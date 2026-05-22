import { useState } from "react";

export function ProductivityPanel({ user, productivity, onUpdate, onQuickLog }) {
  const current = productivity[user.id] ?? {
    currentFile: "",
    currentTask: "",
    progress: 0,
    estimateHours: 1,
    completedTopics: 0,
    completedFiles: 0,
    deliveredAssets: 0,
    waterMl: 0,
    revisionStatus: "Em producao"
  };

  const [draft, setDraft] = useState(current);

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
        <button type="button" onClick={() => onUpdate(draft)}>
          Salvar status
        </button>
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
        <div className="creator-wide">
          <span className="field-title">Status de revisao</span>
          <div className="choice-grid">
            {["Em producao", "Em revisao", "Aguardando feedback", "Pronto para exportar", "Entregue"].map((status) => (
              <button className={draft.revisionStatus === status ? "choice active" : "choice"} type="button" key={status} onClick={() => update("revisionStatus", status)}>
                {status}
              </button>
            ))}
          </div>
        </div>
        <label>
          Progresso do arquivo: {draft.progress}%
          <input type="range" min="0" max="100" value={draft.progress} onChange={(e) => update("progress", Number(e.target.value))} />
          <small>Atualize conforme o arquivo avança.</small>
        </label>
      </div>

      <div className="quick-actions">
        <span className="field-title">Registrar progresso rapido</span>
        <button type="button" onClick={() => onQuickLog("topic")}>+ Topico concluido</button>
        <button type="button" onClick={() => onQuickLog("file")}>+ Arquivo finalizado</button>
        <button type="button" onClick={() => onQuickLog("asset")}>+ Asset entregue</button>
        <button type="button" onClick={() => onQuickLog("water")}>+ 250ml agua</button>
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
