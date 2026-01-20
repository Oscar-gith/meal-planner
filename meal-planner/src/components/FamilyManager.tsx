'use client'

import { useState, useEffect } from 'react'
import { useFamily } from '@/lib/hooks/useFamily'
import {
  Users,
  Crown,
  Copy,
  RefreshCw,
  LogOut,
  UserPlus,
  X,
  Check,
  ArrowRightLeft
} from 'lucide-react'

interface FamilyManagerProps {
  onClose?: () => void
  isModal?: boolean
}

export default function FamilyManager({ onClose, isModal = false }: FamilyManagerProps) {
  const {
    family_id,
    family_name,
    invite_code,
    user_role,
    member_count,
    isLoading,
    error: familyError,
    members,
    loadingMembers,
    createFamily,
    joinFamily,
    leaveFamily,
    regenerateInviteCode,
    removeMember,
    transferAdmin,
    loadMembers
  } = useFamily()

  const [mode, setMode] = useState<'view' | 'create' | 'join'>('view')
  const [newFamilyName, setNewFamilyName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [memberToPromote, setMemberToPromote] = useState<string | null>(null)

  const isAdmin = user_role === 'admin'

  // Load members when family changes
  useEffect(() => {
    if (family_id) {
      loadMembers()
    }
  }, [family_id, loadMembers])

  const handleCreateFamily = async () => {
    if (!newFamilyName.trim()) {
      setError('Por favor ingresa un nombre para la familia')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      await createFamily(newFamilyName.trim())
      setSuccess('Familia creada exitosamente')
      setNewFamilyName('')
      setMode('view')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la familia')
    } finally {
      setProcessing(false)
    }
  }

  const handleJoinFamily = async () => {
    if (!joinCode.trim()) {
      setError('Por favor ingresa el codigo de invitacion')
      return
    }

    setProcessing(true)
    setError(null)

    try {
      const result = await joinFamily(joinCode.trim())
      setSuccess(`Te has unido a la familia "${result.family_name}"`)
      setJoinCode('')
      setMode('view')
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('Invalid invite code')) {
        setError('Codigo de invitacion invalido')
      } else if (message.includes('maximum members')) {
        setError('La familia ha alcanzado el limite de 6 miembros')
      } else if (message.includes('already in a family')) {
        setError('Ya perteneces a una familia')
      } else {
        setError(message || 'Error al unirse a la familia')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleLeaveFamily = async () => {
    setProcessing(true)
    setError(null)

    try {
      const result = await leaveFamily()
      if (result.family_deleted) {
        setSuccess('Has salido y la familia fue eliminada (eras el unico miembro)')
      } else {
        setSuccess('Has salido de la familia')
      }
      setShowLeaveConfirm(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('only admin')) {
        setError('No puedes salir siendo el unico admin. Transfiere el rol primero.')
      } else {
        setError(message || 'Error al salir de la familia')
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleRegenerateCode = async () => {
    setProcessing(true)
    setError(null)

    try {
      await regenerateInviteCode()
      setSuccess('Codigo de invitacion regenerado')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al regenerar el codigo')
    } finally {
      setProcessing(false)
    }
  }

  const handleCopyCode = async () => {
    if (!invite_code) return

    try {
      await navigator.clipboard.writeText(invite_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar el codigo')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setProcessing(true)
    setError(null)

    try {
      await removeMember(userId)
      setSuccess('Miembro eliminado')
      setMemberToRemove(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar miembro')
    } finally {
      setProcessing(false)
    }
  }

  const handleTransferAdmin = async (userId: string) => {
    setProcessing(true)
    setError(null)

    try {
      await transferAdmin(userId)
      setSuccess('Rol de admin transferido')
      setMemberToPromote(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al transferir rol')
    } finally {
      setProcessing(false)
    }
  }

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null)
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  const content = (
    <div className={isModal ? '' : 'max-w-2xl mx-auto'}>
      {/* Messages */}
      {(error || familyError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error || familyError}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Cargando...</div>
      ) : !family_id ? (
        // No family - show create/join options
        <div className="space-y-6">
          {mode === 'view' && (
            <>
              <div className="text-center py-4">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No perteneces a ninguna familia
                </h3>
                <p className="text-gray-500 text-sm mb-6">
                  Crea una familia para compartir ingredientes y planes con otros,
                  o unete a una familia existente con un codigo de invitacion.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('create')}
                  className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
                >
                  <UserPlus className="h-8 w-8 text-indigo-600 mb-2" />
                  <span className="font-medium text-gray-900">Crear Familia</span>
                  <span className="text-sm text-gray-500">Invita hasta 5 personas</span>
                </button>

                <button
                  onClick={() => setMode('join')}
                  className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <Users className="h-8 w-8 text-green-600 mb-2" />
                  <span className="font-medium text-gray-900">Unirse a Familia</span>
                  <span className="text-sm text-gray-500">Con codigo de invitacion</span>
                </button>
              </div>
            </>
          )}

          {mode === 'create' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('view')}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
              >
                ← Volver
              </button>

              <h3 className="text-lg font-medium text-gray-900">Crear nueva familia</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la familia
                </label>
                <input
                  type="text"
                  value={newFamilyName}
                  onChange={(e) => setNewFamilyName(e.target.value)}
                  placeholder="Ej: Familia Garcia"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={processing}
                />
              </div>

              <button
                onClick={handleCreateFamily}
                disabled={processing}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Creando...' : 'Crear Familia'}
              </button>
            </div>
          )}

          {mode === 'join' && (
            <div className="space-y-4">
              <button
                onClick={() => setMode('view')}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
              >
                ← Volver
              </button>

              <h3 className="text-lg font-medium text-gray-900">Unirse a una familia</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Codigo de invitacion
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 font-mono text-center text-lg tracking-wider"
                  disabled={processing}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pide el codigo de 8 caracteres al admin de la familia
                </p>
              </div>

              <button
                onClick={handleJoinFamily}
                disabled={processing}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Uniendo...' : 'Unirse a Familia'}
              </button>
            </div>
          )}
        </div>
      ) : (
        // Has family - show family info
        <div className="space-y-6">
          {/* Family Info Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{family_name}</h3>
                  <p className="text-sm text-gray-500">
                    {member_count} {member_count === 1 ? 'miembro' : 'miembros'}
                    {' • '}
                    {isAdmin ? 'Eres admin' : 'Eres miembro'}
                  </p>
                </div>
              </div>
              {isAdmin && (
                <Crown className="h-6 w-6 text-yellow-500" />
              )}
            </div>

            {/* Invite Code (only for admins) */}
            {isAdmin && invite_code && (
              <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Codigo de invitacion</span>
                  <button
                    onClick={handleRegenerateCode}
                    disabled={processing}
                    className="text-indigo-600 hover:text-indigo-700 text-sm flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${processing ? 'animate-spin' : ''}`} />
                    Regenerar
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 px-4 py-2 rounded font-mono text-lg tracking-wider text-center">
                    {invite_code}
                  </code>
                  <button
                    onClick={handleCopyCode}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    title="Copiar codigo"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Comparte este codigo para que otros se unan (max 6 miembros)
                </p>
              </div>
            )}
          </div>

          {/* Members List */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Miembros de la familia</h4>

            {loadingMembers ? (
              <div className="text-center py-4 text-gray-500">Cargando miembros...</div>
            ) : members.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-sm">
                No hay miembros
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.member_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {member.role === 'admin' ? (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <Users className="h-5 w-5 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {member.user_email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {member.role === 'admin' ? 'Admin' : 'Miembro'}
                        </p>
                      </div>
                    </div>

                    {/* Actions for admin */}
                    {isAdmin && member.role !== 'admin' && (
                      <div className="flex items-center gap-2">
                        {/* Transfer admin */}
                        {memberToPromote === member.user_id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">Confirmar?</span>
                            <button
                              onClick={() => handleTransferAdmin(member.user_id)}
                              className="text-green-600 hover:text-green-700 p-1"
                              title="Confirmar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setMemberToPromote(null)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setMemberToPromote(member.user_id)}
                            className="text-indigo-600 hover:text-indigo-700 p-1"
                            title="Hacer admin"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </button>
                        )}

                        {/* Remove member */}
                        {memberToRemove === member.user_id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="text-red-600 hover:text-red-700 p-1"
                              title="Confirmar eliminar"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setMemberToRemove(null)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Cancelar"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setMemberToRemove(member.user_id)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Eliminar miembro"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Family */}
          <div className="border-t pt-4">
            {showLeaveConfirm ? (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700 mb-3">
                  {isAdmin && member_count > 1
                    ? 'Eres el admin. Para salir, primero transfiere el rol de admin a otro miembro.'
                    : 'Al salir, tus ingredientes y planes quedaran solo para ti. Esta accion no se puede deshacer.'}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleLeaveFamily}
                    disabled={processing || (isAdmin && member_count > 1)}
                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? 'Saliendo...' : 'Confirmar salida'}
                  </button>
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="w-full flex items-center justify-center gap-2 text-red-600 hover:text-red-700 py-2"
              >
                <LogOut className="h-4 w-4" />
                Salir de la familia
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Mi Familia</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            {content}
          </div>

          {/* Footer */}
          {onClose && (
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={onClose}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return content
}
