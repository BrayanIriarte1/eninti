import { createContext, useContext } from 'react';

// Contexto de la sesión: lo llena AuthProvider (AuthContext.jsx) y lo lee useAuth()
export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Ruta de inicio según el rol tras iniciar sesión
export const inicioPorRol = (rol) =>
  ({ administrador: '/admin', trabajador: '/trabajador/agenda', cliente: '/cliente/cuenta' }[rol] ?? '/login');
