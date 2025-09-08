'use client'

import { useState } from 'react'

export default function PlanesPage() {
  const [generating, setGenerating] = useState(false)

  const handleGeneratePlan = async () => {
    setGenerating(true)
    // TODO: Implement meal planning algorithm
    setTimeout(() => {
      setGenerating(false)
      alert('¡Plan generado! (Función en desarrollo)')
    }, 2000)
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Planes de Comidas
        </h1>
        <p className="text-gray-600">
          Genera y gestiona tus planes semanales de comidas automáticamente.
        </p>
      </div>

      {/* Generate new plan section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Generar Nuevo Plan
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Días de la semana
            </label>
            <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="5">Lunes a Viernes (5 días)</option>
              <option value="7">Lunes a Domingo (7 días)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de inicio
            </label>
            <input 
              type="date" 
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="flex items-center">
            <input type="checkbox" className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="ml-2 text-sm text-gray-700">Incluir meriendas de tarde</span>
          </label>
        </div>

        <button
          onClick={handleGeneratePlan}
          disabled={generating}
          className="w-full bg-indigo-600 text-white py-3 px-6 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {generating ? '🔄 Generando plan...' : '🗓️ Generar Plan Semanal'}
        </button>
      </div>

      {/* Existing plans section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Planes Anteriores
        </h2>
        
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📅</div>
          <h3 className="text-lg font-medium mb-2">No hay planes generados</h3>
          <p>Genera tu primer plan de comidas para comenzar.</p>
        </div>
      </div>
    </div>
  )
}