export type UserRole = 'admin' | 'employee';

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  role: UserRole;
  office_id: string | null;
  created_at: string;
  offices?: {
    name: string;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  officeId: string | null;
  role: UserRole;
  isActive: boolean;
}
