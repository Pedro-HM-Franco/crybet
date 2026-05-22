export function WarningPanel({ probability, riskLevel }) {
  return (
    <aside className="panel border-white bg-white p-4 text-black md:p-5">
      <p className="font-mono text-xs uppercase">Alerta dramatico da IA emocional</p>
      <h2 className="mt-2 font-display text-4xl uppercase leading-none md:text-5xl">Cachinhos em zona instavel</h2>
      <p className="mt-4 font-mono text-sm uppercase">
        O modelo atual aponta {probability}% de probabilidade da Cachinhos chorar. Nivel de risco: {riskLevel}. Isto e satira e nao tem valor financeiro.
      </p>
      <div className="mt-5 grid grid-cols-12 gap-1">
        {Array.from({ length: 36 }).map((_, index) => (
          <span
            key={index}
            className="h-6 bg-black"
            style={{ opacity: index < probability / 3 ? 1 : 0.18, animationDelay: `${index * 40}ms` }}
          />
        ))}
      </div>
    </aside>
  );
}
