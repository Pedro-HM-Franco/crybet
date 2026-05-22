import { periods } from "../data/periods";

const baseOdds = {
  "friday-night": 2.3,
  "saturday-dawn": 5.4,
  "saturday-morning": 3.1,
  "saturday-afternoon": 1.8,
  "saturday-night": 3.8,
  "sunday-dawn": 5.8,
  "sunday-morning": 3.3,
  "sunday-afternoon": 2.2
};

export function calculateOdds({ predictions, probability, volatility, activeTriggerCount = 0, incidents = [] }) {
  const totalVotes = Math.max(predictions.length, 1);
  const instability = probability / 100 + volatility / 180 + activeTriggerCount * 0.08 + incidents.length * 0.03;

  return periods.reduce((odds, period) => {
    const votes = predictions.filter((prediction) => prediction.period === period.id).length;
    const popularityPenalty = votes / totalVotes;
    const lonelyBonus = votes === 0 ? 1.1 : 0;
    const raw = baseOdds[period.id] + instability + lonelyBonus - popularityPenalty * 3;
    odds[period.id] = Number(Math.max(1.2, Math.min(7.5, raw)).toFixed(1));
    return odds;
  }, {});
}

export function periodRisk({ periodId, probability, odds }) {
  const odd = odds[periodId] ?? 1;
  if (probability > 82 || odd >= 5) return "EXTREMO";
  if (probability > 68 || odd >= 3.5) return "ALTO";
  if (probability > 50 || odd >= 2.3) return "MEDIO";
  return "BAIXO";
}

export function settlePredictions({ users, predictions, incidentPeriod }) {
  const userMap = new Map(users.map((user) => [user.id, { ...user }]));

  predictions.forEach((prediction) => {
    const user = userMap.get(prediction.userId);
    if (!user || prediction.settled) return;

    const won = prediction.period === incidentPeriod;
    const reward = won ? Math.round(prediction.amount * prediction.odds) : 0;

    user.crycoins = won ? user.crycoins + reward : user.crycoins;
    user.totalWon = (user.totalWon ?? 0) + reward;
    user.totalLost = (user.totalLost ?? 0) + (won ? 0 : prediction.amount);
    user.correct = (user.correct ?? 0) + (won ? 1 : 0);
    user.wrong = (user.wrong ?? 0) + (won ? 0 : 1);
    user.bestOddsWon = won ? Math.max(user.bestOddsWon ?? 0, prediction.odds) : user.bestOddsWon ?? 0;
    user.winstreak = won ? (user.winstreak ?? 0) + 1 : 0;
    user.score = (user.crycoins ?? 0) + (user.totalWon ?? 0) + (user.correct ?? 0) * 25;
    userMap.set(user.id, user);
  });

  return Array.from(userMap.values());
}
