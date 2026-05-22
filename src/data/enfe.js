export const ranks = [
  "Rookie",
  "Challenger",
  "Elite Player",
  "Arena Master",
  "Nexus Champion",
  "ENFE Legend"
];

export const categories = [
  { id: "active", label: "Active", color: "blue" },
  { id: "tournament", label: "Tournament", color: "purple" },
  { id: "challenge", label: "Challenge", color: "green" },
  { id: "volatile", label: "High Volatility", color: "orange" },
  { id: "finals", label: "Finals", color: "red" }
];

export const weekendEvents = [
  {
    day: "Friday",
    title: "Friday Night Arena",
    description: "Late-night battles, fast bets, and chaotic friendship energy.",
    status: "Standby"
  },
  {
    day: "Saturday",
    title: "Saturday Morning Challenges",
    description: "Skill games, reaction tests, meme duels, and warm-up events.",
    status: "Open"
  },
  {
    day: "Saturday",
    title: "Saturday Night Tournaments",
    description: "The prime-time arena for FIFA, basketball, and team battles.",
    status: "Featured"
  },
  {
    day: "Sunday",
    title: "Sunday Finals",
    description: "Final calls, rivalry closures, and dramatic ENFECOIN swings.",
    status: "Finals"
  }
];

export const starterCompetitions = [
  {
    title: "Basketball Finals",
    description: "Quem leva a final da quadra?",
    category: "active",
    participants: "Team Alpha vs Team Omega",
    timer: "LIVE",
    options: ["Team Alpha", "Team Omega"]
  },
  {
    title: "FIFA Tournament",
    description: "Campeonato relampago do fim de semana.",
    category: "tournament",
    participants: "Open bracket",
    timer: "SAT 21:00",
    options: ["Player 1", "Player 2", "Dark Horse"]
  },
  {
    title: "Meme Contest",
    description: "Quem manda o meme mais absurdo?",
    category: "challenge",
    participants: "Everyone",
    timer: "SUN 16:00",
    options: ["Pedro", "Maria", "Joao"]
  }
];

export function rankFor(user) {
  const wins = user.wins ?? user.correct ?? 0;
  const coins = user.enfecoins ?? user.crycoins ?? 0;
  if (coins >= 500 || wins >= 12) return "ENFE Legend";
  if (coins >= 300 || wins >= 8) return "Nexus Champion";
  if (coins >= 200 || wins >= 5) return "Arena Master";
  if (coins >= 120 || wins >= 3) return "Elite Player";
  if (wins >= 1) return "Challenger";
  return "Rookie";
}
