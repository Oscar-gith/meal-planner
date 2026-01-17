'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  FoodIngredient,
  FoodDish,
  FoodDishWithIngredients,
  DishPattern,
  CreateDishForm,
  DISH_PATTERN_INFO
} from '@/types/v3'
import { Plus, Pencil, Trash2, X, Search, ChevronDown, ChevronRight } from 'lucide-react'
import Toast, { ToastType } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ToastMessage {
  message: string
  type: ToastType
}

export default function PlatosPage() {
  const [dishes, setDishes] = useState<FoodDishWithIngredients[]>([])
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPattern, setSelectedPattern] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDish, setEditingDish] = useState<FoodDishWithIngredients | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<FoodDishWithIngredients | null>(null)
  const [showIngredientModal, setShowIngredientModal] = useState(false)
  const [ingredientFilter, setIngredientFilter] = useState('')
  const [ingredientTypeFilter, setIngredientTypeFilter] = useState('all')
  const [expandedDishes, setExpandedDishes] = useState<Set<string>>(new Set())

  const [formData, setFormData] = useState<CreateDishForm>({
    name: '',
    dish_pattern: 'simple',
    ingredient_ids: [],
    description: '',
    tags: []
  })

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type })
  }

  const supabase = createClient()
  const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'

  // Load dishes from database
  useEffect(() => {
    loadDishes()
    loadIngredients()
  }, [])

  async function loadDishes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('food_dishes')
      .select('*')
      .eq('user_id', DEFAULT_USER_ID)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading dishes:', error)
      showToast('Error al cargar platos', 'error')
      setLoading(false)
      return
    }

    // Load ingredients for each dish
    const dishesWithIngredients: FoodDishWithIngredients[] = await Promise.all(
      (data || []).map(async (dish) => {
        const { data: ingredientsData } = await supabase
          .from('food_ingredients')
          .select('*')
          .in('id', dish.ingredient_ids)

        return {
          ...dish,
          ingredients: ingredientsData || []
        }
      })
    )

    setDishes(dishesWithIngredients)
    setLoading(false)
  }

  async function loadIngredients() {
    const { data, error } = await supabase
      .from('food_ingredients')
      .select('*')
      .eq('user_id', DEFAULT_USER_ID)
      .order('name')

    if (error) {
      console.error('Error loading ingredients:', error)
      return
    }

    setIngredients(data || [])
  }

  function generateAutoName(): string {
    if (formData.ingredient_ids.length === 0) return ''

    const selectedIngredients = formData.ingredient_ids
      .map(id => ingredients.find(ing => ing.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3)

    return selectedIngredients.join(' + ')
  }

  function resetForm() {
    setFormData({
      name: '',
      dish_pattern: 'simple',
      ingredient_ids: [],
      description: '',
      tags: []
    })
    setEditingDish(null)
  }

  function openCreateModal() {
    resetForm()
    setIsModalOpen(true)
  }

  function openEditModal(dish: FoodDishWithIngredients) {
    setEditingDish(dish)
    setFormData({
      name: dish.name,
      dish_pattern: dish.dish_pattern,
      ingredient_ids: dish.ingredient_ids,
      description: dish.description || '',
      tags: dish.tags || []
    })
    setIsModalOpen(true)
  }

  function closeModal() {
    setIsModalOpen(false)
    resetForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation
    if (formData.ingredient_ids.length === 0) {
      showToast('Debes seleccionar al menos un ingrediente', 'error')
      return
    }

    // Auto-generate name if empty
    const finalName = formData.name.trim() || generateAutoName()
    if (!finalName) {
      showToast('El nombre no puede estar vacío', 'error')
      return
    }

    try {
      if (editingDish) {
        // Update existing dish
        const { error } = await supabase
          .from('food_dishes')
          .update({
            name: finalName,
            dish_pattern: formData.dish_pattern,
            ingredient_ids: formData.ingredient_ids,
            description: formData.description || null,
            tags: formData.tags || []
          })
          .eq('id', editingDish.id)

        if (error) throw error
        showToast('Plato actualizado correctamente')
      } else {
        // Create new dish
        const { error } = await supabase
          .from('food_dishes')
          .insert({
            name: finalName,
            dish_pattern: formData.dish_pattern,
            ingredient_ids: formData.ingredient_ids,
            description: formData.description || null,
            tags: formData.tags || [],
            user_id: DEFAULT_USER_ID
          })

        if (error) throw error
        showToast('Plato creado correctamente')
      }

      closeModal()
      loadDishes()
    } catch (error) {
      console.error('Error saving dish:', error)
      showToast('Error al guardar plato', 'error')
    }
  }

  function confirmDelete(dish: FoodDishWithIngredients) {
    setDeleteConfirm(dish)
  }

  async function handleDelete() {
    if (!deleteConfirm) return

    try {
      const { error } = await supabase
        .from('food_dishes')
        .delete()
        .eq('id', deleteConfirm.id)

      if (error) throw error

      showToast('Plato eliminado correctamente')
      setDeleteConfirm(null)
      loadDishes()
    } catch (error) {
      console.error('Error deleting dish:', error)
      showToast('Error al eliminar plato', 'error')
    }
  }

  function toggleIngredient(ingredientId: string) {
    setFormData(prev => ({
      ...prev,
      ingredient_ids: prev.ingredient_ids.includes(ingredientId)
        ? prev.ingredient_ids.filter(id => id !== ingredientId)
        : [...prev.ingredient_ids, ingredientId]
    }))
  }

  function openIngredientSelector() {
    setIngredientFilter('')
    setIngredientTypeFilter('all')
    setShowIngredientModal(true)
  }

  function toggleDishExpanded(dishId: string) {
    setExpandedDishes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(dishId)) {
        newSet.delete(dishId)
      } else {
        newSet.add(dishId)
      }
      return newSet
    })
  }

  // Filtering
  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPattern = selectedPattern === 'all' || dish.dish_pattern === selectedPattern
    return matchesSearch && matchesPattern
  })

  const filteredIngredientsForSelection = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(ingredientFilter.toLowerCase())
    const matchesType = ingredientTypeFilter === 'all' || ing.type === ingredientTypeFilter
    return matchesSearch && matchesType
  })

  // Group dishes by pattern
  const groupedDishes = filteredDishes.reduce((acc, dish) => {
    const pattern = dish.dish_pattern
    if (!acc[pattern]) {
      acc[pattern] = []
    }
    acc[pattern].push(dish)
    return acc
  }, {} as Record<DishPattern, FoodDishWithIngredients[]>)

  // Get ingredient type counts for filter dropdown
  const ingredientTypeCounts = ingredients.reduce((acc, ing) => {
    acc[ing.type] = (acc[ing.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando platos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Platos</h1>
              <p className="text-gray-600 mt-1">
                Crea platos combinando ingredientes
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
            >
              <Plus size={20} />
              Nuevo Plato
            </button>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar platos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <select
              value={selectedPattern}
              onChange={(e) => setSelectedPattern(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="all">Todos los patrones ({dishes.length})</option>
              <option value="simple">Simple ({dishes.filter(d => d.dish_pattern === 'simple').length})</option>
              <option value="compound">Compuesto ({dishes.filter(d => d.dish_pattern === 'compound').length})</option>
              <option value="complete">Completo ({dishes.filter(d => d.dish_pattern === 'complete').length})</option>
            </select>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Mostrando {filteredDishes.length} de {dishes.length} platos
          </div>
        </div>

        {/* Dishes List */}
        {filteredDishes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-500">
            {dishes.length === 0 ? (
              <>
                <p className="text-lg mb-2">No hay platos creados</p>
                <p className="text-sm">Crea tu primer plato combinando ingredientes</p>
              </>
            ) : (
              <p>No se encontraron platos con los filtros aplicados</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedDishes).map(([pattern, dishesInPattern]) => (
              <div key={pattern} className="bg-white rounded-lg shadow-md">
                <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-2xl">{DISH_PATTERN_INFO[pattern as DishPattern].icon}</span>
                    {DISH_PATTERN_INFO[pattern as DishPattern].label}
                    <span className="text-sm text-gray-500 font-normal">
                      ({dishesInPattern.length})
                    </span>
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {DISH_PATTERN_INFO[pattern as DishPattern].description}
                  </p>
                </div>

                <div className="divide-y divide-gray-200">
                  {dishesInPattern.map((dish) => {
                    const isExpanded = expandedDishes.has(dish.id)

                    return (
                      <div key={dish.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleDishExpanded(dish.id)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                              >
                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </button>
                              <h3 className="font-medium text-gray-800">{dish.name}</h3>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                {dish.ingredients.length} ingrediente{dish.ingredients.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {dish.description && (
                              <p className="text-sm text-gray-600 mt-1 ml-7">{dish.description}</p>
                            )}

                            {isExpanded && (
                              <div className="mt-3 ml-7 p-3 bg-gray-50 rounded-md">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Ingredientes:</p>
                                <div className="flex flex-wrap gap-2">
                                  {dish.ingredients.map((ing) => (
                                    <span
                                      key={ing.id}
                                      className="text-sm px-2 py-1 bg-white border border-gray-200 rounded-md"
                                    >
                                      {ing.name}
                                      <span className="text-xs text-gray-500 ml-1">({ing.type})</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => openEditModal(dish)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Editar"
                            >
                              <Pencil size={18} />
                            </button>
                            <button
                              onClick={() => confirmDelete(dish)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingDish ? 'Editar Plato' : 'Nuevo Plato'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Dish Pattern */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patrón del Plato *
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.values(DISH_PATTERN_INFO).map((info) => (
                      <button
                        key={info.pattern}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, dish_pattern: info.pattern }))}
                        className={`p-3 border-2 rounded-md text-left transition-colors ${
                          formData.dish_pattern === info.pattern
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{info.icon}</div>
                        <div className="font-medium text-sm">{info.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{info.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ingredients Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ingredientes *
                    <span className="ml-2 text-blue-600 font-normal">
                      ({formData.ingredient_ids.length} seleccionado{formData.ingredient_ids.length !== 1 ? 's' : ''})
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={openIngredientSelector}
                    className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    {formData.ingredient_ids.length === 0
                      ? 'Seleccionar ingredientes'
                      : 'Modificar ingredientes seleccionados'}
                  </button>

                  {formData.ingredient_ids.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {formData.ingredient_ids.map(id => {
                        const ing = ingredients.find(i => i.id === id)
                        if (!ing) return null
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm"
                          >
                            {ing.name}
                            <button
                              type="button"
                              onClick={() => toggleIngredient(id)}
                              className="hover:text-red-600"
                            >
                              <X size={14} />
                            </button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Name (optional - auto-generated) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={generateAutoName() || 'Se generará automáticamente'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {!formData.name && formData.ingredient_ids.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Vista previa: {generateAutoName()}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="Notas adicionales sobre este plato..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    {editingDish ? 'Actualizar' : 'Crear'} Plato
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Ingredient Selection Modal */}
      {showIngredientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-800">Seleccionar Ingredientes</h3>
                <button
                  onClick={() => setShowIngredientModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Filter Controls */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Buscar ingredientes..."
                    value={ingredientFilter}
                    onChange={(e) => setIngredientFilter(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <select
                  value={ingredientTypeFilter}
                  onChange={(e) => setIngredientTypeFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">Todos los tipos ({ingredients.length})</option>
                  {Array.from(new Set(ingredients.map(i => i.type))).sort().map(type => (
                    <option key={type} value={type}>
                      {type} ({ingredientTypeCounts[type]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 text-xs text-gray-600 flex justify-between">
                <span>Mostrando {filteredIngredientsForSelection.length} de {ingredients.length}</span>
                <span className="text-blue-600 font-medium">
                  {formData.ingredient_ids.length} seleccionado{formData.ingredient_ids.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1">
                {filteredIngredientsForSelection.map((ing) => {
                  const isSelected = formData.ingredient_ids.includes(ing.id)
                  return (
                    <label
                      key={ing.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                        isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleIngredient(ing.id)}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{ing.name}</div>
                        <div className="text-xs text-gray-500">{ing.type}</div>
                      </div>
                    </label>
                  )
                })}
              </div>

              {filteredIngredientsForSelection.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No se encontraron ingredientes
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowIngredientModal(false)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Confirmar ({formData.ingredient_ids.length} seleccionado{formData.ingredient_ids.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Eliminar Plato"
          message={`¿Estás seguro de que quieres eliminar "${deleteConfirm.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          type="danger"
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
