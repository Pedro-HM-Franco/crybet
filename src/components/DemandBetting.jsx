import { useEffect, useMemo, useState } from "react";

const finishWindows = [
  { id: "under-1h", label: "Menos de 1h", helper: "Entrega relampago" },
  { id: "1-2h", label: "1h a 2h", helper: "Ritmo forte" },
  { id: "2-4h", label: "2h a 4h", helper: "Sprint normal" },
  { id: "over-4h", label: "Mais de 4h", helper: "Modo sobrevivencia" }
];

function customWindowId(minutes) {
  return `custom-${Math.max(1, Number(minutes) || 1)}m`;
}

function customLabel(minutes) {
  const value = Math.max(1, Number(minutes) || 1);
  const hours = Math.floor(value / 60);
  const mins = value % 60;
  if (hours && mins) return `${hours}h ${mins}min`;
  if (hours) return `${hours}h`;
  return `${mins}min`;
}

function windowOdds({ windowId, bets, targetProgress }) {
  if (windowId.startsWith("custom-")) return 4.8;
  const total = Math.max(bets.length, 1);
  const votes = bets.filter((bet) => bet.windowId === windowId && bet.status === "active").length;
  const popularityPenalty = (votes / total) * 2.4;
  const base = windowId === "under-1h" ? 3.8 : windowId === "1-2h" ? 2.6 : windowId === "2-4h" ? 2.1 : 4.2;
  const progressEffect = targetProgress > 75 && windowId === "under-1h" ? -0.8 : targetProgress < 35 && windowId === "over-4h" ? -0.6 : 0;
  const lonelyBonus = votes === 0 ? 0.9 : 0;
  return Number(Math.max(1.2, Math.min(6.5, base + lonelyBonus + progressEffect - popularityPenalty)).toFixed(1));
}

export function classifyFinishWindow(startedAt, finishedAt = new Date().toISOString()) {
  const start = startedAt ? new Date(startedAt).getTime() : new Date(finishedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const hours = Math.max(0, (end - start) / 36e5);
  if (hours < 1) return "under-1h";
  if (hours < 2) return "1-2h";
  if (hours < 4) return "2-4h";
  return "over-4h";
}

export function didFinishBetWin(bet, startedAt, finishedAt) {
  const start = startedAt ? new Date(startedAt).getTime() : new Date(finishedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const minutes = Math.max(0, Math.round((end - start) / 60000));

  if (bet.windowId?.startsWith("custom-")) {
    const guessed = Number(bet.windowId.replace("custom-", "").replace("m", ""));
    return Math.abs(minutes - guessed) <= 15;
  }

  return bet.windowId === classifyFinishWindow(startedAt, finishedAt);
}

export function DemandBetting({ user, users, productivity, finishBets, onBet }) {
  const productiveUsers = users.filter(
    (item) => item.id !== user.id && productivity[item.id]?.startedAt
  );
  const [targetId, setTargetId] = useState(productiveUsers[0]?.id ?? "");
  const [amount, setAmount] = useState(5);
  const [customHours, setCustomHours] = useState(1);
  const [customMinutes, setCustomMinutes] = useState(0);

  useEffect(() => {
    const targetStillExists = productiveUsers.some((item) => item.id === targetId);
    if (!targetStillExists) {
      setTargetId(productiveUsers[0]?.id ?? "");
    }
  }, [productiveUsers, targetId]);

  const target = users.find((item) => item.id === targetId);
  const targetStats = productivity[targetId] ?? {};
  const activeBets = finishBets.filter((bet) => bet.targetUserId === targetId && bet.status === "active");
  const existingBet = finishBets.find(
    (bet) => bet.targetUserId === targetId && bet.bettorId === user.id && bet.status === "active"
  );
  const customTotalMinutes = Number(customHours || 0) * 60 + Number(customMinutes || 0);
  const balance = user.enfecoins ?? 0;
  const customId = customWindowId(customTotalMinutes);
  const customOdds = windowOdds({ windowId: customId, bets: activeBets, targetProgress: targetStats.progress ?? 0 });

  const odds = useMemo(() => {
    return finishWindows.reduce((acc, item) => {
      acc[item.id] = windowOdds({ windowId: item.id, bets: activeBets, targetProgress: targetStats.progress ?? 0 });
      return acc;
    }, {});
  }, [activeBets, targetStats.progress]);

  return (
    <section className="section-card demand-betting">
      <div className="section-head">
        <div>
          <p className="eyebrow">Desafio fixo da demanda atual</p>
          <h2>Quando termina?</h2>
          <p className="helper-copy">Escolha uma pessoa e aposte em quanto tempo ela termina a demanda que está fazendo agora.</p>
        </div>
        <span>{activeBets.length} palpites ativos</span>
      </div>

      {!productiveUsers.length ? (
        <p className="empty-state">Nenhuma outra pessoa iniciou uma demanda ainda. Assim que alguem iniciar, os palpites aparecem aqui.</p>
      ) : (
        <>
          <div className="demand-controls">
            <label>
              Pessoa
              <select value={targetId} onChange={(event) => setTargetId(event.target.value)}>
                {productiveUsers.map((item) => (
                  <option key={item.id} value={item.id}>{item.username}</option>
                ))}
              </select>
            </label>
            <label>
              ENFECOINS
              <input type="number" min="1" max={balance} value={amount} onChange={(event) => setAmount(Number(event.target.value) || 1)} />
            </label>
          </div>

          {target ? (
            <div className="target-summary">
              <div className="avatar">{target.avatar}</div>
              <div>
                <strong>{target.username}</strong>
                <p>{targetStats.currentFile || "Sem arquivo definido"} / {targetStats.currentTask || "Sem tarefa definida"}</p>
                <div className="progress-bar"><span style={{ width: `${targetStats.progress ?? 0}%` }} /></div>
              </div>
            </div>
          ) : null}

          {existingBet ? (
            <div className="locked-bet">
              <span>Palpite travado</span>
              <strong>{existingBet.targetName}</strong>
              <p>{existingBet.windowLabel || finishWindows.find((item) => item.id === existingBet.windowId)?.label}</p>
              <em>{existingBet.amount} ENFECOINS / x{existingBet.odds}</em>
            </div>
          ) : (
            <>
              <div className="finish-window-grid">
                {finishWindows.map((item) => (
                  <button
                    className="finish-window-card"
                    type="button"
                    key={item.id}
                    disabled={!targetId || balance < amount}
                    onClick={() => onBet({ targetUserId: targetId, windowId: item.id, windowLabel: item.label, amount, odds: odds[item.id] })}
                  >
                    <span>{item.helper}</span>
                    <strong>{item.label}</strong>
                    <em>x{odds[item.id]}</em>
                    <small>Clique para travar / retorno {Math.round(amount * odds[item.id])} ENFECOINS</small>
                  </button>
                ))}
              </div>
              <div className="custom-bet-card">
                <div>
                  <span className="field-title">Palpite personalizado</span>
                  <p>Escolha um tempo exato. Ganha se ficar dentro de 15 minutos do tempo real.</p>
                </div>
                <label>
                  Horas
                  <input type="number" min="0" max="24" value={customHours} onChange={(event) => setCustomHours(Number(event.target.value) || 0)} />
                </label>
                <label>
                  Minutos
                  <input type="number" min="0" max="59" value={customMinutes} onChange={(event) => setCustomMinutes(Number(event.target.value) || 0)} />
                </label>
                <button
                  type="button"
                  disabled={!targetId || balance < amount || customTotalMinutes <= 0}
                  onClick={() =>
                    onBet({
                      targetUserId: targetId,
                      windowId: customId,
                      windowLabel: customLabel(customTotalMinutes),
                      amount,
                      odds: customOdds
                    })
                  }
                >
                  Travar {customLabel(customTotalMinutes)} / x{customOdds}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
