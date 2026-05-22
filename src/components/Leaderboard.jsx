import { rankFor } from "../data/enfe";

export function Leaderboard({ users }) {
  const richest = [...users].sort((a, b) => (b.enfecoins ?? 0) - (a.enfecoins ?? 0));
  const bestPredictors = [...users].sort((a, b) => {
    const aTotal = (a.wins ?? 0) + (a.losses ?? 0);
    const bTotal = (b.wins ?? 0) + (b.losses ?? 0);
    const aAccuracy = aTotal ? (a.wins ?? 0) / aTotal : 0;
    const bAccuracy = bTotal ? (b.wins ?? 0) / bTotal : 0;
    return bAccuracy - aAccuracy;
  });
  const bestStreak = [...users].sort((a, b) => (b.winstreak ?? 0) - (a.winstreak ?? 0));

  const boards = [
    { title: "Mais Ricos", users: richest, metric: (user) => `🪙 ${user.enfecoins ?? 0}` },
    {
      title: "Melhores Palpiteiros",
      users: bestPredictors,
      metric: (user) => {
        const total = (user.wins ?? 0) + (user.losses ?? 0);
        return `${total ? Math.round(((user.wins ?? 0) / total) * 100) : 0}%`;
      }
    },
    { title: "Maior Sequencia", users: bestStreak, metric: (user) => `${user.winstreak ?? 0} vitorias` }
  ];

  return (
    <section className="section-card leaderboard-spotlight">
      <div className="ranking-hero">
        <p className="eyebrow">Ranking competitivo da arena</p>
        <h2>Ranking ENFE</h2>
        <span>{users.length} jogadores</span>
      </div>
      <div className="leaderboards">
        {boards.map((board) => (
          <div className="leaderboard-panel" key={board.title}>
            <h3>{board.title}</h3>
            {!board.users.length ? <p className="empty-state">Nenhum jogador ainda.</p> : null}
            {board.users.slice(0, 5).map((user, index) => (
              <article className="leader-row" key={`${board.title}-${user.id}`}>
                <span>{index + 1}</span>
                <div className="avatar">{user.avatar}</div>
                <div>
                  <strong>{user.username}</strong>
                  <p>{rankFor(user)}</p>
                </div>
                <em>{board.metric(user)}</em>
              </article>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
