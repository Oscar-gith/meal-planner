'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, X, Crown, Users } from 'lucide-react'

interface Collaborator {
  id: string
  user_id: string
  role: 'owner' | 'collaborator'
  user_email?: string
}

interface CollaboratorsManagerProps {
  planId: string
  currentUserId: string
  isOwner: boolean
  onClose: () => void
}

export default function CollaboratorsManager({
  planId,
  currentUserId,
  isOwner,
  onClose
}: CollaboratorsManagerProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadCollaborators()
  }, [planId])

  const loadCollaborators = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('plan_collaborators')
        .select(`
          id,
          user_id,
          role,
          user:user_id (
            email
          )
        `)
        .eq('plan_id', planId)
        .order('role', { ascending: true }) // owners first

      if (error) throw error

      // Transform data to include user email
      const collaboratorsWithEmail = (data || []).map(c => ({
        id: c.id,
        user_id: c.user_id,
        role: c.role as 'owner' | 'collaborator',
        user_email: (c.user as any)?.email || 'Usuario desconocido'
      }))

      setCollaborators(collaboratorsWithEmail)
    } catch (err: any) {
      console.error('Error loading collaborators:', err)
      setError('Error cargando colaboradores')
    } finally {
      setLoading(false)
    }
  }

  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail.trim()) {
      setError('Por favor ingresa un email')
      return
    }

    if (!isOwner) {
      setError('Solo el dueño puede agregar colaboradores')
      return
    }

    setAdding(true)
    setError(null)

    try {
      // Search for user by email using secure RPC function
      const { data: userData, error: userError } = await supabase
        .rpc('find_user_by_email', {
          search_email: newCollaboratorEmail.trim()
        })

      if (userError) {
        console.error('Error searching user:', userError)
        setError('Error buscando usuario')
        setAdding(false)
        return
      }

      if (!userData || userData.length === 0) {
        setError('No se encontró un usuario con ese email')
        setAdding(false)
        return
      }

      const foundUser = userData[0]

      // Check if already a collaborator
      const existingCollaborator = collaborators.find(c => c.user_id === foundUser.user_id)
      if (existingCollaborator) {
        setError('Este usuario ya es colaborador de este plan')
        setAdding(false)
        return
      }

      // Add collaborator
      const { error: insertError } = await supabase
        .from('plan_collaborators')
        .insert({
          plan_id: planId,
          user_id: foundUser.user_id,
          role: 'collaborator',
          invited_by: currentUserId
        })

      if (insertError) throw insertError

      // Reload collaborators
      await loadCollaborators()
      setNewCollaboratorEmail('')
    } catch (err: any) {
      console.error('Error adding collaborator:', err)
      setError(err.message || 'Error al agregar colaborador')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveCollaborator = async (collaboratorId: string, collaboratorUserId: string) => {
    if (!isOwner) {
      setError('Solo el dueño puede eliminar colaboradores')
      return
    }

    if (collaboratorUserId === currentUserId) {
      setError('No puedes eliminarte a ti mismo')
      return
    }

    try {
      const { error } = await supabase
        .from('plan_collaborators')
        .delete()
        .eq('id', collaboratorId)

      if (error) throw error

      // Reload collaborators
      await loadCollaborators()
    } catch (err: any) {
      console.error('Error removing collaborator:', err)
      setError('Error al eliminar colaborador')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Colaboradores</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Add Collaborator (only for owners) */}
          {isOwner && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agregar colaborador
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newCollaboratorEmail}
                  onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={adding}
                />
                <button
                  onClick={handleAddCollaborator}
                  disabled={adding}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="h-4 w-4" />
                  {adding ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </div>
          )}

          {/* Collaborators List */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Personas con acceso ({collaborators.length})
            </h3>

            {loading ? (
              <div className="text-center py-4 text-gray-500">Cargando...</div>
            ) : collaborators.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No hay colaboradores
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {collaborator.role === 'owner' ? (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Users className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {collaborator.user_email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {collaborator.role === 'owner' ? 'Dueño' : 'Colaborador'}
                        </p>
                      </div>
                    </div>

                    {/* Remove button (only for owners, and not for self) */}
                    {isOwner && collaborator.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.id, collaborator.user_id)}
                        className="text-red-600 hover:text-red-700"
                        title="Eliminar colaborador"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info message for non-owners */}
          {!isOwner && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
              Solo el dueño del plan puede agregar o eliminar colaboradores.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
