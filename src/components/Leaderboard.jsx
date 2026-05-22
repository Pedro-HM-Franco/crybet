export function Leaderboard({ users }) {
  const sorted = [...users].sort((a, b) => (b.crycoins ?? 0) - (a.crycoins ?? 0));
  const bestOdds = [...users].sort((a, b) => (b.bestOddsWon ?? 0) - (a.bestOddsWon ?? 0))[0];
  const bestStreak = [...users].sort((a, b) => (b.winstreak ?? 0) - (a.winstreak ?? 0))[0];

  return (
    <section className="panel p-4 md:p-5">
      <div className="mb-4">
        <p className="mono-label">Riqueza, precisao e sequencia ficticia</p>
        <h2 className="section-title">Leaderboard</h2>
      </div>
      <div className="mb-4 grid gap-2 border-b border-white/25 pb-4 font-mono text-xs uppercase sm:grid-cols-3">
        <span>Mais rico: {sorted[0]?.username ?? "--"}</span>
        <span>Maior odd vencida: {bestOdds?.bestOddsWon ? `x${bestOdds.bestOddsWon}` : "--"}</span>
        <span>Maior winstreak: {bestStreak?.winstreak ?? 0}</span>
      </div>
      <div className="space-y-3">
        {!sorted.length ? (
          <div className="border border-white/30 p-4 font-mono text-xs uppercase text-white/60">
            Nenhum analista cadastrado ainda.
          </div>
        ) : null}
        {sorted.map((user, index) => {
          const total = user.correct + user.wrong;
          const accuracy = total ? Math.round((user.correct / total) * 100) : 0;
          return (
            <article key={user.id} className="leader-row">
              <span className="font-display text-3xl">{index + 1}</span>
              <div className="grid h-11 w-11 place-items-center border border-white font-display">{user.avatar}</div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl uppercase leading-none">{user.username}</h3>
                <p className="font-mono text-xs uppercase text-white/60">{user.title}</p>
              </div>
              <div className="text-right font-mono text-xs uppercase">
                <p>🪙 {user.crycoins ?? 0}</p>
                <p>{accuracy}% precisao</p>
                <p className="text-white/60">ganhou {user.totalWon ?? 0} / perdeu {user.totalLost ?? 0}</p>
              </div>
            </article>
          );
        })}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/25 pt-4 font-mono text-xs uppercase">
        <span>Usuarios mais ativos: {users.length}</span>
        <span className="text-right">Analistas online: {users.filter((user) => user.active).length}</span>
      </div>
    </section>
  );
}
