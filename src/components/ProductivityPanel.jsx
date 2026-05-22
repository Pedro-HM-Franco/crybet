import { useState } from "react";

export function ProductivityPanel({ user, productivity, onUpdate, onQuickLog }) {
  const current = productivity[user.id] ?? {
    currentFile: "",
    currentTask: "",
    progress: 0,
    estimate: "",
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
          <p className="eyebrow">Controle de producao criativa</p>
          <h2>Meu Progresso Editorial</h2>
        </div>
        <button type="button" onClick={() => onUpdate(draft)}>
          Salvar status
        </button>
      </div>

      <div className="productivity-form">
        <input value={draft.currentFile} onChange={(e) => update("currentFile", e.target.value)} placeholder="Arquivo atual: Banner, PDF, Apresentacao..." />
        <input value={draft.currentTask} onChange={(e) => update("currentTask", e.target.value)} placeholder="Tarefa atual: revisao, layout, exportacao..." />
        <input value={draft.estimate} onChange={(e) => update("estimate", e.target.value)} placeholder="Estimativa: 23:30, +40min..." />
        <select value={draft.revisionStatus} onChange={(e) => update("revisionStatus", e.target.value)}>
          <option>Em producao</option>
          <option>Em revisao</option>
          <option>Aguardando feedback</option>
          <option>Pronto para exportar</option>
          <option>Entregue</option>
        </select>
        <label>
          Progresso do arquivo: {draft.progress}%
          <input type="range" min="0" max="100" value={draft.progress} onChange={(e) => update("progress", Number(e.target.value))} />
        </label>
      </div>

      <div className="quick-actions">
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
