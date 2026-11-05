import { createContext, useContext, useEffect, useState } from 'react';
import { leerToken } from '../utils/api.js';
import { login as apiLogin, registro as apiRegistro, perfil, cerrarSesion as limpiar, iniciarSesionLocal } from '../../modules/auth/services/authService.js';

const AuthContext = createContext(null);

// Estado de sesión compartido. El token vive en localStorage; al cargar la app,
// si hay token se valida contra /auth/me para recuperar el perfil (y detectar expiración).
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!leerToken()) {
      setCargando(false);
      return;
    }
    perfil()
      .then(setUsuario)
      .catch(() => limpiar())
      .finally(() => setCargando(false));
  }, []);

  async function login(email, password) {
    const { token, usuario } = await apiLogin(email, password);
    iniciarSesionLocal(token);
    setUsuario(usuario);
    return usuario;
  }

  async function registro(datos) {
    const { token, usuario } = await apiRegistro(datos);
    iniciarSesionLocal(token);
    setUsuario(usuario);
    return usuario;
  }

  function cerrarSesion() {
    limpiar();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, registro, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Ruta de inicio según el rol tras iniciar sesión
export const inicioPorRol = (rol) =>
  ({ administrador: '/admin', trabajador: '/trabajador/agenda', cliente: '/cliente/cuenta' }[rol] ?? '/login');
