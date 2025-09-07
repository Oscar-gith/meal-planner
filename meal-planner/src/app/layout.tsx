import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Meal Planner - Planificador de Comidas",
  description: "Planifica tus comidas semanales automáticamente con reglas personalizadas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <nav className="bg-white shadow-lg border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex items-center space-x-8">
                  <div className="flex-shrink-0">
                    <Link href="/" className="text-2xl font-bold text-indigo-600 hover:text-indigo-700">
                      🍽️ Meal Planner
                    </Link>
                  </div>
                  <nav className="hidden md:flex space-x-8">
                    <Link href="/alimentos" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                      Alimentos
                    </Link>
                    <Link href="/reglas" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                      Reglas
                    </Link>
                    <Link href="/planes" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                      Planes
                    </Link>
                  </nav>
                </div>
                <div className="flex items-center space-x-4">
                  <button className="text-gray-500 hover:text-gray-700">
                    Configuración
                  </button>
                  <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
                    Salir
                  </button>
                </div>
              </div>
            </div>
          </nav>
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
