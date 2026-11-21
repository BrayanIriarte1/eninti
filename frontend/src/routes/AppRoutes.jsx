import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, inicioPorRol } from '../shared/context/AuthContext.jsx';
import RutaProtegida from '../shared/components/RutaProtegida.jsx';
import Layout from '../shared/layouts/Layout.jsx';

import LoginPage from '../modules/auth/pages/LoginPage.jsx';
import SolicitarCuentaPage from '../modules/publico/pages/SolicitarCuentaPage.jsx';
import CotizadorPage from '../modules/publico/pages/CotizadorPage.jsx';
import PasarelaSimuladaPage from '../modules/publico/pages/PasarelaSimuladaPage.jsx';

// Administrador
import InicioAdminPage from '../modules/administrador/pages/InicioAdminPage.jsx';
import PlantasPage from '../modules/administrador/pages/PlantasPage.jsx';
import PlantaFormPage from '../modules/administrador/pages/PlantaFormPage.jsx';
import PlantaDetallePage from '../modules/administrador/pages/PlantaDetallePage.jsx';
import ClientesPage from '../modules/administrador/pages/ClientesPage.jsx';
import TrabajadoresPage from '../modules/administrador/pages/TrabajadoresPage.jsx';
import CalendarioPage from '../modules/administrador/pages/CalendarioPage.jsx';
import SolicitudesAdminPage from '../modules/administrador/pages/SolicitudesAdminPage.jsx';
import ImpagosPage from '../modules/administrador/pages/ImpagosPage.jsx';
import PagosMesPage from '../modules/administrador/pages/PagosMesPage.jsx';
import CatalogoPage from '../modules/administrador/pages/CatalogoPage.jsx';
import SolicitudesCuentaPage from '../modules/administrador/pages/SolicitudesCuentaPage.jsx';
import SolicitudesSuscripcionPage from '../modules/administrador/pages/SolicitudesSuscripcionPage.jsx';
import CambiosDatosPage from '../modules/administrador/pages/CambiosDatosPage.jsx';

// Trabajador
import AgendaPage from '../modules/trabajador/pages/AgendaPage.jsx';
import OrdenPage from '../modules/trabajador/pages/OrdenPage.jsx';

// Cliente
import CuentaPage from '../modules/cliente/pages/CuentaPage.jsx';
import MisPlantasPage from '../modules/cliente/pages/MisPlantasPage.jsx';
import PlantaClientePage from '../modules/cliente/pages/PlantaClientePage.jsx';
import MantencionesClientePage from '../modules/cliente/pages/MantencionesClientePage.jsx';
import SolicitudesClientePage from '../modules/cliente/pages/SolicitudesClientePage.jsx';
import MisDatosPage from '../modules/cliente/pages/MisDatosPage.jsx';

function Raiz() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <p className="cargando contenido-publico">Cargando…</p>;
  return <Navigate to={usuario ? inicioPorRol(usuario.rol) : '/login'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Raiz />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/solicitar-cuenta" element={<SolicitarCuentaPage />} />
      <Route path="/registro" element={<Navigate to="/solicitar-cuenta" replace />} />
      <Route path="/cotizador" element={<CotizadorPage />} />
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
          <Route path="cambios-datos" element={<CambiosDatosPage />} />
          <Route path="impagos" element={<ImpagosPage />} />
          <Route path="pagos" element={<PagosMesPage />} />
          <Route path="catalogo" element={<CatalogoPage />} />
        </Route>
      </Route>

      {/* Trabajador */}
      <Route element={<RutaProtegida roles={['trabajador']} />}>
        <Route path="/trabajador" element={<Layout />}>
          <Route index element={<Navigate to="agenda" replace />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="ordenes/:id" element={<OrdenPage />} />
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
  );
}
