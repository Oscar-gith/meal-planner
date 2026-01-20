'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  FamilyInfo,
  FamilyMember,
  CreateFamilyResponse,
  JoinFamilyResponse,
  LeaveFamilyResponse
} from '@/types/family'

interface UseFamilyReturn extends FamilyInfo {
  members: FamilyMember[]
  loadingMembers: boolean
  refresh: () => Promise<void>
  createFamily: (name: string) => Promise<CreateFamilyResponse>
  joinFamily: (inviteCode: string) => Promise<JoinFamilyResponse>
  leaveFamily: () => Promise<LeaveFamilyResponse>
  regenerateInviteCode: () => Promise<string>
  removeMember: (userId: string) => Promise<boolean>
  transferAdmin: (userId: string) => Promise<boolean>
  loadMembers: () => Promise<void>
}

export function useFamily(): UseFamilyReturn {
  const [info, setInfo] = useState<FamilyInfo>({
    family_id: null,
    family_name: null,
    invite_code: null,
    user_role: null,
    member_count: 0,
    isLoading: true,
    error: null
  })
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  const supabase = createClient()

  const loadFamily = useCallback(async () => {
    setInfo(prev => ({ ...prev, isLoading: true, error: null }))

    const { data, error } = await supabase.rpc('get_user_family')

    if (error) {
      setInfo(prev => ({
        ...prev,
        isLoading: false,
        error: error.message
      }))
      return
    }

    if (!data || data.length === 0) {
      setInfo({
        family_id: null,
        family_name: null,
        invite_code: null,
        user_role: null,
        member_count: 0,
        isLoading: false,
        error: null
      })
      return
    }

    const family = data[0]
    setInfo({
      family_id: family.family_id,
      family_name: family.family_name,
      invite_code: family.invite_code,
      user_role: family.user_role as 'admin' | 'member',
      member_count: Number(family.member_count),
      isLoading: false,
      error: null
    })
  }, [supabase])

  const loadMembers = useCallback(async () => {
    if (!info.family_id) {
      setMembers([])
      return
    }

    setLoadingMembers(true)
    const { data, error } = await supabase.rpc('get_family_members')

    if (error) {
      console.error('Error loading family members:', error)
      setLoadingMembers(false)
      return
    }

    setMembers(data || [])
    setLoadingMembers(false)
  }, [supabase, info.family_id])

  useEffect(() => {
    loadFamily()
  }, [loadFamily])

  const createFamily = async (name: string): Promise<CreateFamilyResponse> => {
    const { data, error } = await supabase.rpc('create_family', {
      family_name: name
    })

    if (error) {
      throw new Error(error.message)
    }

    await loadFamily()
    return data as CreateFamilyResponse
  }

  const joinFamily = async (inviteCode: string): Promise<JoinFamilyResponse> => {
    const { data, error } = await supabase.rpc('join_family', {
      p_invite_code: inviteCode
    })

    if (error) {
      throw new Error(error.message)
    }

    await loadFamily()
    return data as JoinFamilyResponse
  }

  const leaveFamily = async (): Promise<LeaveFamilyResponse> => {
    const { data, error } = await supabase.rpc('leave_family')

    if (error) {
      throw new Error(error.message)
    }

    setMembers([])
    await loadFamily()
    return data as LeaveFamilyResponse
  }

  const regenerateInviteCode = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('regenerate_invite_code')

    if (error) {
      throw new Error(error.message)
    }

    await loadFamily()
    return data as string
  }

  const removeMember = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('remove_family_member', {
      target_user_id: userId
    })

    if (error) {
      throw new Error(error.message)
    }

    await loadMembers()
    await loadFamily()
    return data as boolean
  }

  const transferAdmin = async (userId: string): Promise<boolean> => {
    const { data, error } = await supabase.rpc('transfer_admin_role', {
      new_admin_user_id: userId
    })

    if (error) {
      throw new Error(error.message)
    }

    await loadMembers()
    await loadFamily()
    return data as boolean
  }

  return {
    ...info,
    members,
    loadingMembers,
    refresh: loadFamily,
    createFamily,
    joinFamily,
    leaveFamily,
    regenerateInviteCode,
    removeMember,
    transferAdmin,
    loadMembers
  }
}
