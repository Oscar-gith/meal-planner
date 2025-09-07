'use client'

export default function TestPage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: '#4f46e5' }}>🍽️ Meal Planner - Test Page</h1>
      <p>Si ves esta página, Next.js está funcionando correctamente.</p>
      <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
        <h2>Información del Sistema:</h2>
        <ul>
          <li>Fecha: {new Date().toLocaleString('es-ES')}</li>
          <li>Puerto: 3004</li>
          <li>Estado: ✅ Funcionando</li>
        </ul>
      </div>
      <div style={{ marginTop: '2rem' }}>
        <button onClick={() => window.location.href = '/'} style={{ color: '#4f46e5', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Volver al inicio
        </button>
      </div>
    </div>
  )
}