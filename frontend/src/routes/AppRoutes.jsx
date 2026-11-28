// MAPA DE NAVEGACIÓN: URL → pantalla y qué rol puede entrar (RutaProtegida).
// Pantalla nueva = 1) importarla aquí 2) agregar <Route> 3) si va en el menú, agregarla en MENU de shared/layouts/Layout.jsx.
// OJO: esto es comodidad; la seguridad real la aplica el backend (permitirRoles en cada *.routes.js).
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, inicioPorRol } from '../shared/context/sesion.js';
import RutaProtegida from '../shared/components/RutaProtegida.jsx';
import Layout from '../shared/layouts/Layout.jsx';

import LoginPage from '../modules/auth/pages/LoginPage.jsx';
import RecuperarPage from '../modules/auth/pages/RecuperarPage.jsx';
import RestablecerPage from '../modules/auth/pages/RestablecerPage.jsx';
const SeguridadPage = lazy(() => import('../shared/components/SeguridadPage.jsx'));
import SolicitarCuentaPage from '../modules/publico/pages/SolicitarCuentaPage.jsx';
import CotizadorPage from '../modules/publico/pages/CotizadorPage.jsx';
import ContactoPage from '../modules/publico/pages/ContactoPage.jsx';
import PasarelaSimuladaPage from '../modules/publico/pages/PasarelaSimuladaPage.jsx';

// Páginas de los paneles: se descargan solo al entrar a cada perfil (carga inicial más liviana, RNF-05)
// Administrador
const InicioAdminPage = lazy(() => import('../modules/administrador/pages/InicioAdminPage.jsx'));
const PlantasPage = lazy(() => import('../modules/administrador/pages/PlantasPage.jsx'));
const PlantaFormPage = lazy(() => import('../modules/administrador/pages/PlantaFormPage.jsx'));
const PlantaDetallePage = lazy(() => import('../modules/administrador/pages/PlantaDetallePage.jsx'));
const ClientesPage = lazy(() => import('../modules/administrador/pages/ClientesPage.jsx'));
const TrabajadoresPage = lazy(() => import('../modules/administrador/pages/TrabajadoresPage.jsx'));
const CalendarioPage = lazy(() => import('../modules/administrador/pages/CalendarioPage.jsx'));
const SolicitudesAdminPage = lazy(() => import('../modules/administrador/pages/SolicitudesAdminPage.jsx'));
const ImpagosPage = lazy(() => import('../modules/administrador/pages/ImpagosPage.jsx'));
const PagosMesPage = lazy(() => import('../modules/administrador/pages/PagosMesPage.jsx'));
const CatalogoPage = lazy(() => import('../modules/administrador/pages/CatalogoPage.jsx'));
const SolicitudesCuentaPage = lazy(() => import('../modules/administrador/pages/SolicitudesCuentaPage.jsx'));
const SolicitudesSuscripcionPage = lazy(() => import('../modules/administrador/pages/SolicitudesSuscripcionPage.jsx'));
const CorreosPage = lazy(() => import('../modules/administrador/pages/CorreosPage.jsx'));
const SolicitudesPlantaPage = lazy(() => import('../modules/administrador/pages/SolicitudesPlantaPage.jsx'));
const CambiosDatosPage = lazy(() => import('../modules/administrador/pages/CambiosDatosPage.jsx'));

// Trabajador
const AgendaPage = lazy(() => import('../modules/trabajador/pages/AgendaPage.jsx'));
const OrdenPage = lazy(() => import('../modules/trabajador/pages/OrdenPage.jsx'));

// Cliente
const CuentaPage = lazy(() => import('../modules/cliente/pages/CuentaPage.jsx'));
const MisPlantasPage = lazy(() => import('../modules/cliente/pages/MisPlantasPage.jsx'));
const PlantaClientePage = lazy(() => import('../modules/cliente/pages/PlantaClientePage.jsx'));
const MantencionesClientePage = lazy(() => import('../modules/cliente/pages/MantencionesClientePage.jsx'));
const SolicitudesClientePage = lazy(() => import('../modules/cliente/pages/SolicitudesClientePage.jsx'));
const MisDatosPage = lazy(() => import('../modules/cliente/pages/MisDatosPage.jsx'));

function Raiz() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <p className="cargando contenido-publico">Cargando…</p>;
  return <Navigate to={usuario ? inicioPorRol(usuario.rol) : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<p className="cargando contenido-publico">Cargando…</p>}>
    <Routes>
      <Route path="/" element={<Raiz />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recuperar" element={<RecuperarPage />} />
      <Route path="/restablecer" element={<RestablecerPage />} />
      <Route path="/solicitar-cuenta" element={<SolicitarCuentaPage />} />
      <Route path="/registro" element={<Navigate to="/solicitar-cuenta" replace />} />
      <Route path="/cotizador" element={<CotizadorPage />} />
      <Route path="/contacto" element={<ContactoPage />} />
      <Route path="/pasarela-simulada" element={<PasarelaSimuladaPage />} />

      {/* Administrador */}
      <Route element={<RutaProtegida roles={['administrador']} />}>
        <Route path="/admin" element={<Layout />}>
          <Route index element={<InicioAdminPage />} />
          <Route path="plantas" element={<PlantasPage />} />
          <Route path="plantas/nueva" element={<PlantaFormPage />} />
          <Route path="plantas/:id" element={<PlantaDetallePage />} />
          <Route path="plantas/:id/editar" element={<PlantaFormPage />} />
          <Route path="clientes" element={<ClientesPage />} />
          <Route path="trabajadores" element={<TrabajadoresPage />} />
          <Route path="calendario" element={<CalendarioPage />} />
          <Route path="solicitudes" element={<SolicitudesAdminPage />} />
          <Route path="solicitudes-cuenta" element={<SolicitudesCuentaPage />} />
          <Route path="solicitudes-suscripcion" element={<SolicitudesSuscripcionPage />} />
          <Route path="solicitudes-planta" element={<SolicitudesPlantaPage />} />
          <Route path="cambios-datos" element={<CambiosDatosPage />} />
          <Route path="impagos" element={<ImpagosPage />} />
          <Route path="pagos" element={<PagosMesPage />} />
          <Route path="catalogo" element={<CatalogoPage />} />
          <Route path="correos" element={<CorreosPage />} />
          <Route path="seguridad" element={<SeguridadPage />} />
        </Route>
      </Route>

      {/* Trabajador */}
      <Route element={<RutaProtegida roles={['trabajador']} />}>
        <Route path="/trabajador" element={<Layout />}>
          <Route index element={<Navigate to="agenda" replace />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="ordenes/:id" element={<OrdenPage />} />
          <Route path="seguridad" element={<SeguridadPage />} />
        </Route>
      </Route>

      {/* Cliente */}
      <Route element={<RutaProtegida roles={['cliente']} />}>
        <Route path="/cliente" element={<Layout />}>
          <Route index element={<Navigate to="cuenta" replace />} />
          <Route path="cuenta" element={<CuentaPage />} />
          <Route path="plantas" element={<MisPlantasPage />} />
          <Route path="plantas/:id" element={<PlantaClientePage />} />
          <Route path="mantenciones" element={<MantencionesClientePage />} />
          <Route path="solicitudes" element={<SolicitudesClientePage />} />
          <Route path="datos" element={<MisDatosPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Raiz />} />
    </Routes>
    </Suspense>
  );
}
