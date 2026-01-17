'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FoodIngredient, IngredientType, CreateIngredientForm } from '@/types/v2'
import { Plus, Pencil, Trash2, X, Search } from 'lucide-react'
import Toast, { ToastType } from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'

interface ToastMessage {
  message: string
  type: ToastType
}

export default function IngredientesPage() {
  const [ingredients, setIngredients] = useState<FoodIngredient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIngredient, setEditingIngredient] = useState<FoodIngredient | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<FoodIngredient | null>(null)
  const [formData, setFormData] = useState<CreateIngredientForm>({
    name: '',
    type: '' as IngredientType,
    description: '',
    tags: []
  })

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ message, type })
  }

  const supabase = createClient()
  const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000000'

  const [ingredientTypes, setIngredientTypes] = useState<string[]>([
    'Fruta',
    'Carb',
    'Bebida',
    'Proteina',
    'Verdura',
    'Lacteo',
    'Huevos',
    'Granos',
    'Otro'
  ])
  const [customType, setCustomType] = useState('')
  const [showCustomType, setShowCustomType] = useState(false)

  useEffect(() => {
    loadIngredients()
  }, [])

  async function loadIngredients() {
    try {
      const { data, error} = await supabase
        .from('food_ingredients')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading ingredients:', error)
        showToast('Error cargando ingredientes', 'error')
      } else {
        setIngredients(data || [])

        // Extract unique types from existing ingredients and sort alphabetically
        const uniqueTypes = Array.from(new Set(data?.map(i => i.type) || []))
        const allTypes = Array.from(new Set([...ingredientTypes, ...uniqueTypes]))
        setIngredientTypes(allTypes.sort())
      }
    } catch (error) {
      console.error('Error:', error)
      showToast('Error inesperado al cargar ingredientes', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!formData.name.trim()) {
      showToast('El nombre es requerido', 'error')
      return
    }

    // Use custom type if provided
    let finalType = formData.type
    if (showCustomType && customType.trim()) {
      finalType = customType.trim() as IngredientType
    }

    // Validate type is selected
    if (!finalType || finalType.trim() === '') {
      showToast('Debes seleccionar un tipo de ingrediente', 'error')
      return
    }

    try {
      if (editingIngredient) {
        // Update existing ingredient (no multiple mode when editing)
        const { error } = await supabase
          .from('food_ingredients')
          .update({
            name: formData.name,
            type: finalType,
            description: formData.description,
            tags: formData.tags
          })
          .eq('id', editingIngredient.id)

        if (error) throw error
        showToast('Ingrediente actualizado correctamente')
      } else {
        // Check if name contains "|" for multiple ingredients
        const names = formData.name.split('|').map(n => n.trim()).filter(n => n.length > 0)

        if (names.length > 1) {
          // Create multiple ingredients
          const ingredientsToInsert = names.map(name => ({
            name,
            type: finalType,
            description: formData.description,
            tags: formData.tags,
            user_id: DEFAULT_USER_ID
          }))

          const { error } = await supabase
            .from('food_ingredients')
            .insert(ingredientsToInsert)

          if (error) throw error
          showToast(`${names.length} ingredientes creados correctamente`)
        } else {
          // Create single ingredient
          const { error } = await supabase
            .from('food_ingredients')
            .insert({
              name: formData.name,
              type: finalType,
              description: formData.description,
              tags: formData.tags,
              user_id: DEFAULT_USER_ID
            })

          if (error) throw error
          showToast('Ingrediente creado correctamente')
        }
      }

      // Reset form and reload
      setIsModalOpen(false)
      setEditingIngredient(null)
      setShowCustomType(false)
      setCustomType('')
      resetForm()
      loadIngredients()
    } catch (error: any) {
      console.error('Error saving ingredient:', error)
      showToast(error.message || 'Error al guardar ingrediente', 'error')
    }
  }

  function confirmDelete(ingredient: FoodIngredient) {
    setDeleteConfirm(ingredient)
  }

  async function handleDelete() {
    if (!deleteConfirm) return

    try {
      const { error } = await supabase
        .from('food_ingredients')
        .delete()
        .eq('id', deleteConfirm.id)

      if (error) throw error
      showToast('Ingrediente eliminado')
      setDeleteConfirm(null)
      loadIngredients()
    } catch (error: any) {
      console.error('Error deleting ingredient:', error)
      showToast(error.message || 'Error al eliminar ingrediente', 'error')
      setDeleteConfirm(null)
    }
  }

  function openCreateModal() {
    resetForm()
    setEditingIngredient(null)
    setIsModalOpen(true)
  }

  function openEditModal(ingredient: FoodIngredient) {
    setFormData({
      name: ingredient.name,
      type: ingredient.type,
      description: ingredient.description || '',
      tags: ingredient.tags || []
    })
    setEditingIngredient(ingredient)
    setIsModalOpen(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      type: '' as IngredientType,
      description: '',
      tags: []
    })
  }

  // Toggle type filter
  function toggleTypeFilter(type: string) {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    )
  }

  // Clear all filters
  function clearTypeFilters() {
    setSelectedTypes([])
  }

  // Filter ingredients
  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(ing.type)
    return matchesSearch && matchesType
  })

  // Group by type
  const groupedIngredients = filteredIngredients.reduce((acc, ing) => {
    if (!acc[ing.type]) {
      acc[ing.type] = []
    }
    acc[ing.type].push(ing)
    return acc
  }, {} as Record<string, FoodIngredient[]>)

  const uniqueTypes = [...new Set(ingredients.map(i => i.type))].sort()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Cargando ingredientes...</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Ingredientes
          </h1>
          <p className="text-gray-600">
            Gestiona tu biblioteca de ingredientes individuales
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus size={20} />
          Agregar Ingrediente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar ingredientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Type filters - Multi-select checkboxes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Filtrar por tipo:
            </label>
            {selectedTypes.length > 0 && (
              <button
                onClick={clearTypeFilters}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueTypes.map(type => {
              const count = ingredients.filter(i => i.type === type).length
              const isSelected = selectedTypes.includes(type)
              return (
                <button
                  key={type}
                  onClick={() => toggleTypeFilter(type)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type} ({count})
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Mostrando {filteredIngredients.length} de {ingredients.length} ingredientes
          {selectedTypes.length > 0 && (
            <span className="text-indigo-600 font-medium"> • {selectedTypes.length} tipo(s) seleccionado(s)</span>
          )}
        </div>
      </div>

      {/* Ingredients Grid */}
      {filteredIngredients.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-4xl mb-4">🥗</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron ingredientes
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedTypes.length > 0
              ? 'Intenta ajustar los filtros'
              : 'Agrega tu primer ingrediente para comenzar'
            }
          </p>
          {!searchTerm && selectedTypes.length === 0 && (
            <button
              onClick={openCreateModal}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 inline-flex items-center gap-2"
            >
              <Plus size={20} />
              Agregar Ingrediente
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6">
          {Object.entries(groupedIngredients).map(([type, items]) => (
            <div key={type} className="bg-white rounded-lg shadow-md">
              <div className="bg-gray-50 px-6 py-3 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  {type} <span className="text-sm text-gray-500 font-normal">({items.length})</span>
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map(ingredient => (
                    <div
                      key={ingredient.id}
                      className="bg-gray-50 rounded-md px-4 py-3 hover:bg-gray-100 transition-colors group relative"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{ingredient.name}</div>
                          {ingredient.description && (
                            <div className="text-xs text-gray-500 mt-1">{ingredient.description}</div>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(ingredient)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => confirmDelete(ingredient)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingIngredient ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}
              </h2>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingIngredient(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre * {!editingIngredient && <span className="text-xs text-gray-500 font-normal">(usa | para crear varios a la vez)</span>}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={editingIngredient ? "Nombre del ingrediente" : "Ej: Manzana|Mandarina|Naranja"}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                {!editingIngredient && formData.name.includes('|') && (
                  <p className="text-xs text-blue-600 mt-1">
                    Se crearán {formData.name.split('|').filter(n => n.trim()).length} ingredientes
                  </p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                {!showCustomType ? (
                  <div className="flex gap-2">
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as IngredientType })}
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="" disabled>Selecciona un tipo</option>
                      {ingredientTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCustomType(true)}
                      className="px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      + Nuevo
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      placeholder="Ej: Condimento, Salsa"
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomType(false)
                        setCustomType('')
                      }}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción (opcional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Agrega notas o detalles adicionales"
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingIngredient(null)
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editingIngredient ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title="Eliminar ingrediente"
          message={`¿Estás seguro de eliminar "${deleteConfirm.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          type="danger"
        />
      )}

      {/* Toast Notification */}
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
