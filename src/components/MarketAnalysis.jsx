import { periods } from "../data/periods";

export function MarketAnalysis({ users, predictions, probability, stability, odds }) {
  const total = Math.max(predictions.length, 1);
  const counts = periods.map((period) => ({
    ...period,
    votes: predictions.filter((prediction) => prediction.period === period.id).length
  }));
  const mostVoted = counts.reduce((winner, period) => (period.votes > winner.votes ? period : winner), counts[0]);
  const hasVotes = predictions.length > 0;

  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4">
        <p className="mono-label">Analise falsa do mercado emocional</p>
        <h2 className="section-title">IA da Cachinhos</h2>
      </div>

      <div className="grid gap-3 border-b border-white/25 pb-4 font-mono text-xs uppercase">
        <div className="flex justify-between">
          <span>Usuarios online</span>
          <strong>{users.filter((user) => user.active).length}</strong>
        </div>
        <div className="flex justify-between">
          <span>Periodo mais votado hoje</span>
          <strong>
            {hasVotes ? `${mostVoted.label} ${mostVoted.icon}` : "aguardando votos"}
          </strong>
        </div>
        <div className="flex justify-between">
          <span>Risco emocional atual</span>
          <strong>{probability}%</strong>
        </div>
        <div className="flex justify-between">
          <span>Estabilidade ao vivo</span>
          <strong>{stability}%</strong>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {counts.map((period) => {
          const percent = Math.round((period.votes / total) * 100);
          return (
            <div key={period.id}>
              <div className="mb-1 flex justify-between font-mono text-xs uppercase">
                <span>
                  {period.icon} {period.label}
                </span>
                <span>
                  {period.votes} votos / {percent}% / x{odds[period.id]}
                </span>
              </div>
              <div className="h-2 border border-white/50">
                <div className="h-full bg-white transition-all duration-500" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
