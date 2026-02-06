'use client'

import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Planifica tus comidas automáticamente
        </h1>
        <p className="text-xl text-gray-700 max-w-3xl mx-auto">
          Crea programaciones semanales inteligentes basadas en tus alimentos favoritos y reglas personalizadas.
          Sin más estrés decidiendo qué cocinar cada día.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="text-3xl mb-4">🥗</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Ingredientes</h3>
          <p className="text-gray-700 mb-4">
            Crea tu biblioteca de ingredientes individuales como frutas, carbohidratos y bebidas.
          </p>
          <button
            onClick={() => router.push('/ingredientes')}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
            Ver Ingredientes
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="text-3xl mb-4">🗓️</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Planificar Semana</h3>
          <p className="text-gray-700 mb-4">
            Genera planes semanales automáticamente basados en patrones de comida predefinidos.
          </p>
          <button
            onClick={() => router.push('/planes')}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
            Generar Plan
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Resumen</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600">96</div>
            <div className="text-sm text-gray-700">Alimentos Registrados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">6</div>
            <div className="text-sm text-gray-700">Reglas Activas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-700">Planes Generados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">3</div>
            <div className="text-sm text-gray-700">Tipos de Comida</div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Placeholder */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Actividad Reciente</h2>
        <div className="text-gray-700 text-center py-8">
          <div className="text-4xl mb-2">📝</div>
          <p>Aún no hay planes generados. ¡Crea tu primer plan de comidas!</p>
        </div>
      </div>
    </div>
  );
}
