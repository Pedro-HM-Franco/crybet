export const ranks = [
  "Novato",
  "Desafiante",
  "Jogador Elite",
  "Mestre da Arena",
  "Campeao Nexus",
  "Lenda ENFE"
];

export const categories = [
  { id: "active", label: "Ativa", color: "blue" },
  { id: "tournament", label: "Torneio", color: "purple" },
  { id: "challenge", label: "Desafio", color: "green" },
  { id: "volatile", label: "Alta Volatilidade", color: "orange" },
  { id: "finals", label: "Final", color: "red" }
];

export const weekendEvents = [
  {
    day: "Sexta",
    title: "Arena de Sexta a Noite",
    description: "Batalhas noturnas, palpites rapidos e energia caotica de amizade.",
    status: "Em espera"
  },
  {
    day: "Sabado",
    title: "Desafios de Sabado de Manha",
    description: "Jogos de habilidade, testes de reacao, duelos de meme e aquecimento.",
    status: "Aberto"
  },
  {
    day: "Sabado",
    title: "Torneios de Sabado a Noite",
    description: "A arena principal para FIFA, basquete e batalhas em equipe.",
    status: "Destaque"
  },
  {
    day: "Domingo",
    title: "Finais de Domingo",
    description: "Decisoes finais, rivalidades encerradas e viradas dramaticas de ENFECOINS.",
    status: "Finais"
  }
];

export const starterCompetitions = [
  {
    title: "Final de Basquete",
    description: "Quem leva a final da quadra?",
    category: "active",
    participants: "Time Alpha vs Time Omega",
    timer: "LIVE",
    options: ["Time Alpha", "Time Omega"]
  },
  {
    title: "Torneio de FIFA",
    description: "Campeonato relampago do fim de semana.",
    category: "tournament",
    participants: "Chave aberta",
    timer: "SAT 21:00",
    options: ["Jogador 1", "Jogador 2", "Azarao"]
  },
  {
    title: "Concurso de Meme",
    description: "Quem manda o meme mais absurdo?",
    category: "challenge",
    participants: "Todos",
    timer: "SUN 16:00",
    options: ["Pedro", "Maria", "Joao"]
  }
];

export function rankFor(user) {
  const wins = user.wins ?? user.correct ?? 0;
  const coins = user.enfecoins ?? user.crycoins ?? 0;
  if (coins >= 500 || wins >= 12) return "Lenda ENFE";
  if (coins >= 300 || wins >= 8) return "Campeao Nexus";
  if (coins >= 200 || wins >= 5) return "Mestre da Arena";
  if (coins >= 120 || wins >= 3) return "Jogador Elite";
  if (wins >= 1) return "Desafiante";
  return "Novato";
}
