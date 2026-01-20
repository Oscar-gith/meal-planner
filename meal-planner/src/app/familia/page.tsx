'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import FamilyManager from '@/components/FamilyManager'
import { Users } from 'lucide-react'

export default function FamiliaPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setIsAuthenticated(true)
      setLoading(false)
    }

    checkAuth()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Mi Familia</h1>
          </div>
          <p className="text-gray-600">
            Gestiona tu familia para compartir ingredientes y planes de comida con otros miembros.
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-1">Ingredientes Compartidos</h3>
            <p className="text-sm text-gray-500">
              Todos los miembros pueden ver y editar los mismos ingredientes.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-1">Planes Compartidos</h3>
            <p className="text-sm text-gray-500">
              Los planes semanales son visibles y editables por toda la familia.
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-1">Hasta 6 Miembros</h3>
            <p className="text-sm text-gray-500">
              Invita hasta 5 personas adicionales a tu familia.
            </p>
          </div>
        </div>

        {/* Family Manager */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <FamilyManager isModal={false} />
        </div>
      </div>
    </div>
  )
}
