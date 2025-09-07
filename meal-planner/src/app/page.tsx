'use client'

export default function Home() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Planifica tus comidas automáticamente
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Crea programaciones semanales inteligentes basadas en tus alimentos favoritos y reglas personalizadas.
          Sin más estrés decidiendo qué cocinar cada día.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="text-3xl mb-4">🗓️</div>
          <h3 className="text-lg font-semibold mb-2">Generar Plan Semanal</h3>
          <p className="text-gray-600 mb-4">
            Crea automáticamente un plan de comidas para la semana aplicando tus reglas.
          </p>
          <button className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors">
            Generar Plan
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="text-3xl mb-4">🥘</div>
          <h3 className="text-lg font-semibold mb-2">Gestionar Alimentos</h3>
          <p className="text-gray-600 mb-4">
            Administra tu base de datos de alimentos por categorías y tipos.
          </p>
          <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors">
            Ver Alimentos
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
          <div className="text-3xl mb-4">📋</div>
          <h3 className="text-lg font-semibold mb-2">Configurar Reglas</h3>
          <p className="text-gray-600 mb-4">
            Define reglas en lenguaje natural para personalizar tus planes.
          </p>
          <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 transition-colors">
            Editar Reglas
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Resumen</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-indigo-600">96</div>
            <div className="text-sm text-gray-600">Alimentos Registrados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">6</div>
            <div className="text-sm text-gray-600">Reglas Activas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">0</div>
            <div className="text-sm text-gray-600">Planes Generados</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">3</div>
            <div className="text-sm text-gray-600">Tipos de Comida</div>
          </div>
        </div>
      </div>

      {/* Recent Activity - Placeholder */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Actividad Reciente</h2>
        <div className="text-gray-500 text-center py-8">
          <div className="text-4xl mb-2">📝</div>
          <p>Aún no hay planes generados. ¡Crea tu primer plan de comidas!</p>
        </div>
      </div>
    </div>
  );
}
