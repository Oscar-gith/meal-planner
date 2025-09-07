'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FoodItem } from '@/types'

export default function AlimentosPage() {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMealType, setSelectedMealType] = useState<string>('all')
  const [selectedSubtype, setSelectedSubtype] = useState<string>('all')

  const supabase = createClient()

  useEffect(() => {
    loadFoodItems()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadFoodItems() {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .order('meal_type', { ascending: true })
        .order('subtype', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading food items:', error)
      } else {
        setFoodItems(data || [])
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = foodItems.filter(item => {
    if (selectedMealType !== 'all' && item.meal_type !== selectedMealType) return false
    if (selectedSubtype !== 'all' && item.subtype !== selectedSubtype) return false
    return true
  })

  const mealTypes = [...new Set(foodItems.map(item => item.meal_type))]
  const subtypes = [...new Set(
    foodItems
      .filter(item => selectedMealType === 'all' || item.meal_type === selectedMealType)
      .map(item => item.subtype)
  )]

  const groupedItems = filteredItems.reduce((acc, item) => {
    const key = `${item.meal_type}-${item.subtype}`
    if (!acc[key]) {
      acc[key] = {
        meal_type: item.meal_type,
        subtype: item.subtype,
        items: []
      }
    }
    acc[key].items.push(item)
    return acc
  }, {} as Record<string, { meal_type: string; subtype: string; items: FoodItem[] }>)

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando alimentos...</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Gestión de Alimentos
        </h1>
        <p className="text-gray-600">
          Administra tu base de datos de alimentos organizados por tipo y subtipo.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Comida
            </label>
            <select
              value={selectedMealType}
              onChange={(e) => {
                setSelectedMealType(e.target.value)
                setSelectedSubtype('all')
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Todos los tipos</option>
              {mealTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subtipo
            </label>
            <select
              value={selectedSubtype}
              onChange={(e) => setSelectedSubtype(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">Todos los subtipos</option>
              {subtypes.map(subtype => (
                <option key={subtype} value={subtype}>{subtype}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Mostrando {filteredItems.length} de {foodItems.length} alimentos
        </div>
      </div>

      {/* Food Items Grid */}
      <div className="grid gap-6">
        {Object.values(groupedItems).map(group => (
          <div key={`${group.meal_type}-${group.subtype}`} className="bg-white rounded-lg shadow-md">
            <div className="bg-gray-50 px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {group.meal_type} - {group.subtype}
              </h2>
              <p className="text-sm text-gray-600">
                {group.items.length} elemento{group.items.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {group.items.map(item => (
                  <div
                    key={item.id}
                    className="bg-gray-50 rounded-md px-4 py-3 text-sm hover:bg-gray-100 transition-colors"
                  >
                    {item.name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">🍽️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron alimentos
          </h3>
          <p className="text-gray-600">
            Intenta ajustar los filtros para ver más resultados.
          </p>
        </div>
      )}
    </div>
  )
}