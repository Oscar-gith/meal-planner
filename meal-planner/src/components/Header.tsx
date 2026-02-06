'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Users } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import MobileSidebar from './MobileSidebar'

export default function Header() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <MobileSidebar
        user={user}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onSignOut={handleSignOut}
      />
      <nav className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <div className="flex-shrink-0">
                <Link href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700">
                  🍽️ Meal Planner
                </Link>
              </div>
              {user && (
                <nav className="hidden md:flex space-x-8">
                  <Link
                    href="/ingredientes"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Ingredientes
                  </Link>
                  <Link
                    href="/reglas"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Reglas
                  </Link>
                  <Link
                    href="/planes"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Planes
                  </Link>
                  <Link
                    href="/familia"
                    className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"
                  >
                    <Users className="h-4 w-4" />
                    Mi Familia
                  </Link>
                </nav>
              )}
            </div>

            {!loading && (
              <div className="flex items-center space-x-4">
                {user ? (
                  <>
                    {/* User Info */}
                    <div className="hidden sm:flex items-center text-sm text-gray-700">
                      <span className="max-w-[150px] truncate">
                        {user.user_metadata?.full_name?.split(' ')[0] ||
                         user.user_metadata?.name?.split(' ')[0] ||
                         user.email?.split('@')[0]}
                      </span>
                    </div>

                    {/* Sign Out Button */}
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden sm:inline">Cerrar sesión</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
