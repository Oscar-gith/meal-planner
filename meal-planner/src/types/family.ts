// Tipos para el sistema de Familia

export interface Family {
  id: string
  name: string
  invite_code: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface FamilyMember {
  member_id: string
  user_id: string
  user_email: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface FamilyInfo {
  family_id: string | null
  family_name: string | null
  invite_code: string | null
  user_role: 'admin' | 'member' | null
  member_count: number
  isLoading: boolean
  error: string | null
}

export interface CreateFamilyResponse {
  family_id: string
  invite_code: string
}

export interface JoinFamilyResponse {
  family_id: string
  family_name: string
}

export interface LeaveFamilyResponse {
  success: boolean
  family_deleted: boolean
}
