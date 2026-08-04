// Core Types for YCKF Incident Management Dashboard

export type UserRole = 'admin' | 'investigator' | 'volunteer' | 'user'
export type UserStatus = 'active' | 'inactive' | 'suspended'
export type UserPlatform = 'mobile' | 'web'

export interface User {
  id: number | string
  email: string
  name: string
  role: UserRole
  avatar?: string
  status: UserStatus
  platform?: UserPlatform
  createdAt: Date | string
  lastLogin?: Date | string | null
}

export type IncidentType =
  | 'malware'
  | 'phishing'
  | 'data_breach'
  | 'ddos'
  | 'ransomware'
  | 'insider_threat'
  | 'other'

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low'
export type IncidentPriority = 'critical' | 'high' | 'medium' | 'low'

export type IncidentStatus =
  | 'open'
  | 'investigating'
  | 'pending'
  | 'resolved'
  | 'closed'

export interface InvestigationNote {
  id: string
  incidentId: string
  authorId: string
  authorName: string
  content: string
  createdAt: Date
}

export interface IncidentTimelineEntry {
  id: string
  title: string
  detail: string
  createdAt: Date
}

export interface IncidentAssignmentEntry {
  id: string
  assignedTo: string
  assignedToName: string
  assignedAt: Date
  note?: string
}

export interface Incident {
  id: string
  reportId?: string
  title: string
  description: string
  type: IncidentType
  category?: string
  severity: IncidentSeverity
  priority?: IncidentPriority
  status: IncidentStatus
  assignedTo?: string
  assignedToName?: string
  reportedBy: string
  reportedByName: string
  createdAt: Date
  updatedAt: Date
  resolvedAt?: Date
  notes: InvestigationNote[]
  timeline?: IncidentTimelineEntry[]
  assignmentHistory?: IncidentAssignmentEntry[]
}

export interface AuditEntry {
  id: string
  action: string
  performedBy: string
  performedByName: string
  timestamp: Date
  details?: string
}

export interface Evidence {
  id: string
  incidentId: string
  incidentTitle: string
  filename: string
  fileType: string
  fileSize: number
  hash: string
  uploadedBy: string
  uploadedByName: string
  uploadedAt: Date
  description?: string
  chainOfCustody: AuditEntry[]
}

export type NotificationType = 'alert' | 'broadcast' | 'notice' | 'awareness'
export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  createdAt: Date
  read: boolean
  targetRoles?: UserRole[]
}

export interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalIncidents: number
  openIncidents: number
  investigatingIncidents: number
  pendingIncidents: number
  resolvedIncidents: number
  criticalIncidents: number
  avgResponseTimeHours: number
}

export interface IncidentTrend {
  date: string
  incidents: number
  resolved: number
}

export interface SeverityDistribution {
  severity: IncidentSeverity
  count: number
}

export interface VolunteerPerformance {
  name: string
  resolved: number
  investigating: number
}

export type InvestigatorPerformance = VolunteerPerformance

export interface RecentActivity {
  id: string
  action: string
  description: string
  user: string
  timestamp: Date
  type: 'incident' | 'evidence' | 'user' | 'notification'
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthUser {
  id: number | string
  email: string
  name: string
  role: UserRole
}
