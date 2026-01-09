// lib/types/tournament.ts
export interface Tournament {
  id: string;
  name: string;
  description: string;
  organizationId?: string;
  inviteCode: string;
  format: 'single-elimination' | 'double-elimination' | 'round-robin';
  status: 'pending' | 'in-progress' | 'completed';
  startDate: Date;
  endDate?: Date;
  teams: TournamentTeam[];
  matches: TournamentMatch[];
  spectators: string[]; // IDs dos usuários assistindo
  timer: number; // Tempo em segundos para responder
  createdBy: string;
  createdAt: Date;
}

export interface TournamentTeam {
  id: string;
  name: string;
  members: string[];
  score: number;
}

export interface TournamentMatch {
  id: string;
  tournamentId: string;
  round: number;
  team1Id: string;
  team2Id: string;
  currentQuestion?: Question;
  status: 'waiting' | 'in-progress' | 'completed';
  winnerId?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  answeredBy?: string; // ID da equipe que respondeu primeiro
  answeredAt?: Date;
}