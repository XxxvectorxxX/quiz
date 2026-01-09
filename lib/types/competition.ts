export interface Competition {
  id: string;
  name: string;
  type: '1vs1' | 'team';
  createdBy: string;
  teams: CompetitionTeam[];
  settings: CompetitionSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompetitionTeam {
  id: string;
  name: string;
  members: TeamMember[];
  ownerId: string;
  permissions: TeamPermissions;
}

export interface TeamMember {
  userId: string;
  name: string;
  role: 'owner' | 'member';
  joinedAt: Date;
}

export interface TeamPermissions {
  canDeleteTeam: boolean;
  canManageMembers: boolean;
  canChangeTeamSize: boolean;
}

export interface CompetitionSettings {
  maxTeamSize: number;
  allowMemberAddition: boolean; // false para 1vs1
}