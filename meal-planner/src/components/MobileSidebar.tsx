'use client'

import { Fragment } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Home, UtensilsCrossed, BookOpen, Calendar, Users, LogOut } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface MobileSidebarProps {
  user: User | null
  isOpen: boolean
  onToggle: () => void
  onSignOut: () => void
}

export default function MobileSidebar({ user, isOpen, onToggle, onSignOut }: MobileSidebarProps) {
  const pathname = usePathname()

  const navigation = [
    { name: 'Inicio', href: '/', icon: Home },
    { name: 'Ingredientes', href: '/ingredientes', icon: UtensilsCrossed },
    { name: 'Reglas', href: '/reglas', icon: BookOpen },
    { name: 'Planes', href: '/planes', icon: Calendar },
    { name: 'Mi Familia', href: '/familia', icon: Users },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={onToggle}
        className="md:hidden p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
        aria-label="Abrir menú"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Overlay - Closes sidebar when clicked */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <Link href="/" className="text-xl font-bold text-indigo-600" onClick={onToggle}>
            🍽️ Meal Planner
          </Link>
          <button
            onClick={onToggle}
            className="p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div className="px-4 py-3 border-b bg-indigo-50">
            <div className="text-sm font-medium text-gray-900">
              {user.user_metadata?.full_name?.split(' ')[0] ||
               user.user_metadata?.name?.split(' ')[0] ||
               user.email?.split('@')[0]}
            </div>
            <div className="text-xs text-gray-600 truncate">{user.email}</div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {user ? (
            <>
              {navigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onToggle}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </>
          ) : (
            <Link
              href="/login"
              onClick={onToggle}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              <Home className="h-5 w-5" />
              Iniciar sesión
            </Link>
          )}
        </nav>

        {/* Sign Out Button - Bottom */}
        {user && (
          <div className="p-4 border-t">
            <button
              onClick={() => {
                onSignOut()
                onToggle()
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </>
  )
}
