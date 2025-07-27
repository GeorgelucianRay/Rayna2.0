// src/components/DashboardPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function DashboardPage() {
  return (
    <div className="container-center">
      <div className="card text-center max-w-2xl">
        <h1 className="text-5xl font-extrabold text-green-700 mb-8">¡Bienvenido a Rayna!</h1>
        <p className="text-xl text-gray-800 mb-6 text-center">
          Estás en el panel de control de tu aplicación de transporte Rayna. Aquí podrás gestionar clientes, depósitos, y anuncios para tus conductores.
        </p>

        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {/* Sección para Gestión de Depósitos */}
          <div className="bg-gray-100 p-6 rounded-lg shadow-md border border-gray-200 w-full max-w-xs text-center">
            <h3 className="text-2xl font-bold text-blue-600 mb-4">Gestión de Depósitos</h3>
            <p className="text-gray-700 mb-4">
              Administra la entrada y salida de mercancías, el inventario y la ubicación de los productos.
            </p>
            <Link to="/depot" className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
              Ir a Depósito
            </Link>
          </div>

          {/* Sección para Anuncios */}
          <div className="bg-gray-100 p-6 rounded-lg shadow-md border border-gray-200 w-full max-w-xs text-center">
            <h3 className="text-2xl font-bold text-purple-600 mb-4">Anuncios y Comunicados</h3>
            <p className="text-gray-700 mb-4">
              Publica comunicados importantes y notificaciones para tus conductores y personal.
            </p>
            <Link to="/announcements" className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
              Ver Anuncios
            </Link>
          </div>

          {/* Sección para Clientes (Google Sheets) */}
          <div className="bg-gray-100 p-6 rounded-lg shadow-md border border-gray-200 w-full max-w-xs text-center">
            <h3 className="text-2xl font-bold text-green-600 mb-4">Gestión de Clientes</h3>
            <p className="text-gray-700 mb-4">
              Accede y gestiona la lista de tus clientes directamente desde Google Sheets.
            </p>
            <Link to="/clients" className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200">
              Ver Clientes
            </Link>
          </div>
        </div>

        {/* Botón para cerrar sesión */}
        <div className="flex space-x-4">
          <Link to="/login" className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-md transition duration-200 text-lg">
            Cerrar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
