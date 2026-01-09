
export interface Organization {
  id: string;
  name: string;
  type: 'church' | 'group';
  description?: string;
  adminIds: string[];
  memberIds: string[];
  inviteCode: string;
  createdAt: Date;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  organizationId?: string;
  organizationRole?: 'admin' | 'member';
}