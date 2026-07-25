export type UserRole = 'ADMIN' | 'INVESTIGATOR' | 'USER';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string | Date;
  lastLogin?: string | Date | null;
  twoFactorEnabled?: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
  twoFactorToken?: string;
  backupCode?: string;
  rememberDeviceToken?: string;
  rememberDevice?: boolean;
}

export interface LoginResponse {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: UserRole;
    isActive: boolean;
  };
  accessToken: string;
  refreshToken: string;
  rememberDeviceToken?: string;
  requiresTwoFactor?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface RegisterResponse {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string | Date;
}

export type IncidentType =
  | 'malware'
  | 'phishing'
  | 'data_breach'
  | 'ddos'
  | 'ransomware'
  | 'insider_threat'
  | 'other';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentPriority = 'critical' | 'high' | 'medium' | 'low';

export type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'pending'
  | 'pending_evidence'
  | 'resolved'
  | 'closed';

export type CaseStatus =
  | 'received'
  | 'under_review'
  | 'investigating'
  | 'pending_evidence'
  | 'resolved'
  | 'closed';

export interface Report {
  id: number;
  userId: number;
  title: string;
  description: string;
  incidentType: string;
  priority: string;
  status: string;
  location: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  user?: {
    id: number;
    email: string;
    fullName: string;
  };
}

export interface Case {
  id: number;
  reportId: number;
  assignedInvestigatorId?: number | null;
  status: string;
  resolutionNotes?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  report?: Report;
  assignedInvestigator?: {
    id: number;
    fullName: string;
  } | null;
  notes?: InvestigationNote[];
  history?: CaseHistory[];
}

export interface InvestigationNote {
  id: number;
  caseId: number;
  authorId: number;
  note: string;
  createdAt: string | Date;
  author?: {
    id: number;
    fullName: string;
  };
}

export interface CaseHistory {
  id: number;
  caseId: number;
  oldStatus: string;
  newStatus: string;
  changedById: number;
  changedAt: string | Date;
  changedBy?: {
    id: number;
    fullName: string;
  };
}

export interface Evidence {
  id: number;
  reportId: number;
  fileUrl: string;
  fileHash: string;
  fileType: string;
  metadata?: Record<string, unknown>;
  uploadedById: number;
  uploadedAt: string | Date;
  uploadedBy?: {
    id: number;
    email: string;
    fullName: string;
  };
}

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  recipientId?: number | null;
  senderId?: number | null;
  caseId?: number | null;
  isRead: boolean;
  createdAt: string | Date;
}

export interface DashboardStats {
  active_cases: number;
  pending_cases: number;
  resolved_cases: number;
  total_users: number;
  avg_response_time_seconds: number;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}
