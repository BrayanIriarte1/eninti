// Especificación OpenAPI 3.0 de la API de ENINTI. Se sirve como Swagger UI en /api/docs.
// Los campos, códigos de error y reglas salen de los servicios del backend; al cambiar un
// endpoint hay que actualizar también su entrada aquí.

const ref = (nombre) => ({ $ref: `#/components/schemas/${nombre}` });
const json = (schema, example) => ({ 'application/json': { schema, ...(example !== undefined && { example }) } });
const ok = (description, schema) => ({ description, content: json(schema) });
const lista = (nombre) => ({ type: 'array', items: ref(nombre) });
const idPath = (description = 'Identificador del recurso', example = 1) => ({
  name: 'id', in: 'path', required: true, description, example, schema: { type: 'integer', minimum: 1 },
});
const query = (name, description, schema = { type: 'string' }, extra = {}) => ({
  name, in: 'query', required: false, description, schema, ...extra,
});
const cuerpo = (schema, example) => ({ required: true, content: json(schema, example) });
const protegido = [{ bearerAuth: [] }];

const r401 = { $ref: '#/components/responses/NoAutenticado' };
const r403 = { $ref: '#/components/responses/Prohibido' };
const r404 = { $ref: '#/components/responses/NoEncontrado' };
const r400 = { $ref: '#/components/responses/Invalido' };
const r409 = { $ref: '#/components/responses/Conflicto' };

// Respuestas comunes de un endpoint protegido por rol
const comunes = { 401: r401, 403: r403 };

const entero = { type: 'integer' };
const texto = { type: 'string' };
const fecha = { type: 'string', format: 'date', example: '2026-11-20' };
const fechaHora = { type: 'string', format: 'date-time' };

export default {
  openapi: '3.0.3',
  info: {
    title: 'API ENINTI',
    version: '1.0.0',
    description: `
API REST de la plataforma de suscripciones y mantención de sistemas solares fotovoltaicos de ENINTI.
Tres perfiles (**cliente**, **trabajador** y **administrador**) sobre una sola base de datos.

## Cómo probar los endpoints protegidos

1. Abre **Autenticación → POST /auth/login**, pulsa **Try it out** y ejecuta con una de las credenciales de abajo.
2. Copia el valor de \`token\` de la respuesta.
3. Pulsa el botón **Authorize** (candado, arriba a la derecha), pega el token y confirma.
4. Ya puedes ejecutar los endpoints del rol correspondiente. Un token de un rol recibe **403** en los endpoints de otro rol.

El token dura **8 horas**. Tras **5 contraseñas incorrectas** con el mismo correo, el acceso se bloquea **15 minutos** (error 429).

## Credenciales de prueba (datos ficticios)

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador | \`admin@eninti.test\` | \`Admin.2026\` |
| Trabajador | \`pedro.ramirez@eninti.test\` | \`Trabajador.2026\` |
| Cliente | \`maria.gonzalez@ejemplo.cl\` | \`Cliente.2026\` |
| Cliente | \`luis.perez@ejemplo.cl\` | \`Cliente.2026\` |

## Convenciones

- Montos en **pesos chilenos enteros** (sin decimales). Fechas \`YYYY-MM-DD\`; marcas de tiempo en ISO 8601.
- Los errores devuelven \`{ "error": "mensaje", "detalles": [...] }\`; \`detalles\` solo aparece en errores de validación.
- Las referencias **HU-xx** corresponden a las historias de usuario del informe de formulación.
`,
  },
  servers: [{ url: '/api', description: 'Servidor actual' }],
  tags: [
    { name: 'Sistema', description: 'Estado del servicio' },
    { name: 'Autenticación', description: 'Inicio de sesión, cambio y recuperación de contraseña (HU-07). No hay autorregistro: la cuenta del cliente la crea el administrador' },
    { name: 'Público', description: 'Sin sesión: cotizador, solicitud de cuenta y retorno de la pasarela simulada' },
    { name: 'Cliente', description: 'Perfil **cliente**: cuenta, plantas, mantenciones y solicitudes (HU-08 a HU-13)' },
    { name: 'Trabajador', description: 'Perfil **trabajador**: agenda y órdenes de trabajo (HU-05, HU-14, HU-16)' },
    { name: 'Admin · Clientes', description: 'Ficha administrativa de clientes (HU-03)' },
    { name: 'Admin · Solicitudes de cuenta', description: 'Solicitudes enviadas desde el login; al aprobar se crea el cliente y su cuenta (HU-07)' },
    { name: 'Admin · Plantas', description: 'Plantas, ficha técnica y suscripciones (HU-03)' },
    { name: 'Admin · Trabajadores', description: 'Cuentas de trabajadores (HU-15)' },
    { name: 'Admin · Mantenciones', description: 'Calendario por comuna, programación y asignación (HU-04, HU-17)' },
    { name: 'Admin · Solicitudes', description: 'Bandeja de solicitudes de los clientes (HU-11)' },
    { name: 'Admin · Finanzas', description: 'Impagos, pagos, cuotas y cobro recurrente (HU-01, HU-02, HU-06)' },
    { name: 'Admin · Catálogo', description: 'Planes y servicios como datos (RNF-07)' },
  ],

  paths: {
    '/health': {
      get: {
        tags: ['Sistema'], summary: 'Estado del servicio', security: [],
        responses: { 200: { description: 'El servicio está vivo', content: json({ type: 'object', properties: { ok: { type: 'boolean' } } }, { ok: true }) } },
      },
    },

    // ───────────── Autenticación ─────────────
    '/auth/login': {
      post: {
        tags: ['Autenticación'], summary: 'Iniciar sesión', security: [],
        description: 'Devuelve un JWT de 8 horas. El mensaje de error no revela si falló el correo o la contraseña. 5 fallos seguidos bloquean el correo 15 minutos.',
        requestBody: cuerpo(ref('LoginPeticion'), { email: 'admin@eninti.test', password: 'Admin.2026' }),
        responses: {
          200: ok('Sesión iniciada', ref('LoginRespuesta')),
          400: r400,
          401: { description: 'Credenciales incorrectas o cuenta inactiva', content: json(ref('Error'), { error: 'Credenciales incorrectas o cuenta inactiva' }) },
          429: { description: 'Demasiados intentos fallidos', content: json(ref('Error')) },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autenticación'], summary: 'Perfil del usuario autenticado', security: protegido,
        responses: { 200: ok('Perfil', ref('Perfil')), 401: r401 },
      },
    },
    '/auth/cambiar-contrasena': {
      post: {
        tags: ['Autenticación'], summary: 'Cambiar la contraseña (cualquier rol)', security: protegido,
        description: 'Exige la contraseña actual. La nueva debe tener 8 a 128 caracteres y combinar letras y números. Devuelve un token nuevo: esta sesión sigue abierta y las demás se cierran. Avisa por correo.',
        requestBody: cuerpo({ type: 'object', required: ['actual', 'nueva'], properties: { actual: { type: 'string' }, nueva: { type: 'string' } } }, { actual: 'Admin.2026', nueva: 'NuevaClave2026' }),
        responses: {
          200: ok('Contraseña actualizada', { type: 'object', properties: { mensaje: { type: 'string' }, token: { type: 'string' } } }),
          400: r400, 401: r401,
        },
      },
    },
    '/auth/recuperar': {
      post: {
        tags: ['Autenticación'], summary: 'Pedir un enlace para restablecer la contraseña', security: [],
        description: 'Responde siempre lo mismo, exista o no el correo. Si hay una cuenta activa, envía un enlace de un solo uso que vence en 1 hora. Máximo 5 pedidos cada 15 minutos por IP.',
        requestBody: cuerpo({ type: 'object', required: ['email'], properties: { email: { type: 'string', format: 'email' } } }, { email: 'maria.gonzalez@ejemplo.cl' }),
        responses: { 200: ok('Pedido recibido', { type: 'object', properties: { mensaje: { type: 'string' } } }), 400: r400, 429: { description: 'Demasiados pedidos', content: json(ref('Error')) } },
      },
    },
    '/auth/restablecer/verificar': {
      post: {
        tags: ['Autenticación'], summary: 'Revisar si un enlace de recuperación sigue vigente', security: [],
        requestBody: cuerpo({ type: 'object', required: ['token'], properties: { token: { type: 'string' } } }),
        responses: { 200: ok('Resultado', { type: 'object', properties: { valido: { type: 'boolean' }, email: { type: 'string', description: 'Correo parcialmente oculto' } } }) },
      },
    },
    '/auth/restablecer': {
      post: {
        tags: ['Autenticación'], summary: 'Crear la contraseña nueva con el enlace', security: [],
        description: 'Marca el enlace como usado, cierra las sesiones abiertas, levanta el bloqueo por intentos fallidos y avisa por correo.',
        requestBody: cuerpo({ type: 'object', required: ['token', 'nueva'], properties: { token: { type: 'string' }, nueva: { type: 'string' } } }),
        responses: { 200: ok('Contraseña restablecida', { type: 'object', properties: { mensaje: { type: 'string' } } }), 400: r400 },
      },
    },

    // ───────────── Público ─────────────
    '/publico/catalogo': {
      get: {
        tags: ['Público'], summary: 'Cotizador: planes y servicios activos', security: [],
        responses: { 200: ok('Catálogo público', lista('CatalogoPublico')) },
      },
    },
    '/publico/comunas': {
      get: {
        tags: ['Público'], summary: 'Comunas donde opera ENINTI', security: [],
        responses: { 200: ok('Comunas', lista('Comuna')) },
      },
    },
    '/publico/solicitudes-cuenta': {
      post: {
        tags: ['Público'], summary: 'Contactar al administrador para obtener una cuenta (HU-07)', security: [],
        description: 'El cliente sin cuenta envía sus datos y los de su planta. **No crea ninguna cuenta**: queda una solicitud `pendiente` que el administrador aprueba o rechaza. Solo se admite una solicitud pendiente por RUT.',
        requestBody: cuerpo(ref('SolicitudCuentaPeticion'), { nombre: 'Ana Torres Díaz', rut: '55555555-5', email: 'ana.torres@ejemplo.cl', telefono: '+56955555555', direccion_planta: 'Calle Sol 100', id_comuna: 2, potencia_kw: 4.5, tiene_baterias: false, mensaje: 'Quiero contratar el plan de mantención.' }),
        responses: {
          201: ok('Solicitud registrada', { type: 'object', properties: { id_solicitud_cuenta: entero, estado: texto, fecha_solicitud: fechaHora } }),
          400: r400,
          409: { description: 'El RUT ya tiene cuenta o ya tiene una solicitud pendiente', content: json(ref('Error')) },
        },
      },
    },
    '/pagos/simulada/confirmar': {
      post: {
        tags: ['Público'], summary: 'Retorno de la pasarela simulada (HU-13)', security: [],
        description: 'Confirma la inscripción de tarjeta en la pasarela **simulada** (`FLOW_MODE=simulado`). Autoriza el `token` emitido por *POST /cliente/suscripciones/{id}/inscripcion* (dura 30 min). Es **idempotente**: una notificación repetida devuelve el mismo medio de pago. Los últimos dígitos `0000` fuerzan un rechazo al cobrar.',
        requestBody: cuerpo(ref('ConfirmarPasarelaPeticion'), { token: 'eyJhbGciOi…', resultado: 'aprobada', marca: 'Visa', ultimos_4: '4242' }),
        responses: { 200: ok('Medio de pago registrado', ref('MedioPago')), 400: r400, 401: { description: 'Token de inscripción inválido o expirado', content: json(ref('Error')) } },
      },
    },

    // ───────────── Cliente ─────────────
    '/cliente/plantas': {
      get: {
        tags: ['Cliente'], summary: 'Mis plantas (HU-10)', security: protegido,
        responses: { 200: ok('Plantas del cliente con su suscripción vigente', lista('PlantaCliente')), ...comunes, 404: r404 },
      },
    },
    '/cliente/plantas/{id}': {
      get: {
        tags: ['Cliente'], summary: 'Ficha técnica de una planta propia (HU-10)', security: protegido,
        description: 'Una planta ajena responde **404**, no 403, para no revelar su existencia.',
        parameters: [idPath('Id de la planta (usa uno de GET /cliente/plantas)', 2)],
        responses: { 200: ok('Ficha técnica', ref('PlantaCliente')), ...comunes, 404: r404 },
      },
    },
    '/cliente/cuenta': {
      get: {
        tags: ['Cliente'], summary: 'Mi cuenta: deuda, pagos y medio de pago (HU-08)', security: protegido,
        responses: { 200: ok('Estado de cuenta', ref('Cuenta')), ...comunes, 404: r404 },
      },
    },
    '/cliente/mantenciones': {
      get: {
        tags: ['Cliente'], summary: 'Última y próxima mantención por planta (HU-09)', security: protegido,
        responses: { 200: ok('Mantenciones por planta', lista('MantencionesPlanta')), ...comunes },
      },
    },
    '/cliente/solicitudes': {
      get: {
        tags: ['Cliente'], summary: 'Mis solicitudes de mantención (HU-11)', security: protegido,
        responses: { 200: ok('Solicitudes', lista('SolicitudCliente')), ...comunes },
      },
      post: {
        tags: ['Cliente'], summary: 'Solicitar una mantención (HU-11)', security: protegido,
        description: 'Queda en estado `pendiente` y visible para el administrador. La planta debe ser del cliente autenticado (consulta sus ids en *GET /cliente/plantas*); con una ajena responde 404.',
        requestBody: cuerpo(ref('SolicitudPeticion'), { id_planta: 2, motivo: 'El inversor muestra una alarma de aislamiento' }),
        responses: { 201: ok('Solicitud creada', ref('Solicitud')), 400: r400, ...comunes, 404: r404 },
      },
    },
    '/cliente/suscripciones/{id}/cancelar': {
      post: {
        tags: ['Cliente'], summary: 'Cancelar mi suscripción (HU-12)', security: protegido,
        description: 'Es **definitiva** y registra la fecha de cancelación.',
        parameters: [idPath('Id de la suscripción (la de tu cuenta, ver GET /cliente/cuenta)', 2)],
        responses: { 200: ok('Suscripción cancelada', ref('Suscripcion')), ...comunes, 404: { description: 'No existe, no es del cliente o ya estaba cancelada', content: json(ref('Error')) } },
      },
    },
    '/cliente/suscripciones/{id}/inscripcion': {
      post: {
        tags: ['Cliente'], summary: 'Aceptar condiciones e inscribir medio de pago (HU-13)', security: protegido,
        description: 'Registra la aceptación de condiciones con fecha e IP y devuelve la URL de la pasarela a la que hay que redirigir al cliente. **Nunca se almacena el número de tarjeta**, solo token y últimos 4 dígitos.',
        parameters: [idPath('Id de la suscripción (la de tu cuenta, ver GET /cliente/cuenta)', 2)],
        requestBody: cuerpo(ref('InscripcionPeticion'), { acepta_condiciones: true, version_condiciones: '1.0' }),
        responses: { 200: ok('URL de la pasarela', ref('InscripcionRespuesta')), 400: r400, ...comunes, 404: r404 },
      },
    },

    // ───────────── Trabajador ─────────────
    '/trabajador/agenda': {
      get: {
        tags: ['Trabajador'], summary: 'Mi agenda de visitas (HU-14)', security: protegido,
        description: 'Solo las órdenes asignadas al trabajador autenticado. Por defecto las abiertas (`pendiente` y `en_curso`) por fecha ascendente.',
        parameters: [query('historicas', 'Si es `true`, devuelve las cerradas (`finalizada` y `cancelada`) por fecha descendente', { type: 'boolean', default: false })],
        responses: { 200: ok('Órdenes', lista('Orden')), ...comunes },
      },
    },
    '/trabajador/ordenes/{id}': {
      get: {
        tags: ['Trabajador'], summary: 'Detalle de una orden con ficha técnica e historial (HU-16)', security: protegido,
        description: 'Una orden de otro trabajador responde **404**.',
        parameters: [idPath('Id de la mantención')],
        responses: { 200: ok('Orden con historial de estados', ref('OrdenDetalle')), ...comunes, 404: r404 },
      },
    },
    '/trabajador/ordenes/{id}/estado': {
      post: {
        tags: ['Trabajador'], summary: 'Cambiar el estado de la orden (HU-05, HU-16)', security: protegido,
        description: 'Transiciones del técnico: `pendiente → en_curso → por_confirmar`. **Para terminar exige `actividades` y al menos una foto** (hasta 4, JPG/PNG/WebP de 2 MB como máximo, en base64). La orden queda `por_confirmar` hasta que el cliente la confirma (`finalizada`) o la reabre (`en_curso`); el técnico no puede cambiar una orden por confirmar (409). Cada cambio queda en el historial con fecha, hora y responsable.',
        parameters: [idPath('Id de la mantención')],
        requestBody: cuerpo(ref('CambioEstadoPeticion'), { estado: 'por_confirmar', actividades: 'Limpieza de paneles y reapriete de conexiones', observaciones: 'Sin novedades', fotos: ['data:image/jpeg;base64,/9j/4AAQ...'] }),
        responses: { 200: ok('Orden actualizada', ref('OrdenDetalle')), 400: r400, ...comunes, 404: r404, 409: { description: 'Transición de estado no permitida', content: json(ref('Error'), { error: 'No se puede pasar de pendiente a por_confirmar' }) } },
      },
    },

    // ───────────── Admin · Clientes ─────────────
    '/admin/clientes': {
      get: {
        tags: ['Admin · Clientes'], summary: 'Listar clientes (HU-03)', security: protegido,
        responses: { 200: ok('Clientes con cantidad de plantas y si tienen cuenta web', lista('ClienteAdmin')), ...comunes },
      },
      post: {
        tags: ['Admin · Clientes'], summary: 'Crear ficha de cliente (HU-03)', security: protegido,
        description: 'Crea solo la ficha administrativa. La cuenta web la crea el administrador con *POST /admin/clientes/{id}/cuenta* o al aprobar una solicitud de cuenta.',
        requestBody: cuerpo(ref('ClientePeticion'), { rut: '44444444-4', nombre: 'Ana Torres Díaz', telefono: '+56944444444', direccion: 'Calle Sol 100', id_comuna: 2 }),
        responses: { 201: ok('Cliente creado', ref('Cliente')), 400: r400, ...comunes, 409: r409 },
      },
    },
    '/admin/clientes/{id}': {
      put: {
        tags: ['Admin · Clientes'], summary: 'Editar cliente (HU-03)', security: protegido,
        parameters: [idPath('Id del cliente')],
        requestBody: cuerpo(ref('ClienteEdicion'), { telefono: '+56955555555' }),
        responses: { 200: ok('Cliente actualizado', ref('Cliente')), 400: r400, ...comunes, 404: r404, 409: r409 },
      },
    },
    '/admin/clientes/{id}/cuenta': {
      post: {
        tags: ['Admin · Clientes'], summary: 'Crear la cuenta web de un cliente (HU-07)', security: protegido,
        description: 'Crea el usuario con rol cliente y lo enlaza a la ficha. La contraseña inicial la define el administrador y se la comunica al cliente.',
        parameters: [idPath('Id del cliente')],
        requestBody: cuerpo(ref('CuentaClientePeticion'), { email: 'carmen.soto@ejemplo.cl', password: 'Inicial.2026' }),
        responses: { 201: ok('Cuenta creada', ref('UsuarioCreado')), 400: r400, ...comunes, 404: r404, 409: { description: 'El cliente ya tiene cuenta o el correo está en uso', content: json(ref('Error')) } },
      },
    },
    '/admin/solicitudes-cuenta': {
      get: {
        tags: ['Admin · Solicitudes de cuenta'], summary: 'Listar solicitudes de cuenta (HU-07)', security: protegido,
        parameters: [query('estado', 'Filtra por estado', { type: 'string', enum: ['pendiente', 'aprobada', 'rechazada'] })],
        responses: { 200: ok('Solicitudes, primero las pendientes', lista('SolicitudCuenta')), 400: r400, ...comunes },
      },
    },
    '/admin/solicitudes-cuenta/{id}/aprobar': {
      post: {
        tags: ['Admin · Solicitudes de cuenta'], summary: 'Aprobar: crear cliente y cuenta web (HU-07)', security: protegido,
        description: 'En una transacción crea la ficha del cliente (o reutiliza la existente con el mismo RUT), crea su cuenta web con la contraseña inicial indicada y marca la solicitud como aprobada. Después se registra la planta con *POST /admin/plantas*.',
        parameters: [idPath('Id de la solicitud de cuenta')],
        requestBody: cuerpo(ref('CuentaClientePeticion'), { email: 'jorge.castillo@ejemplo.cl', password: 'Inicial.2026' }),
        responses: { 201: ok('Cliente y cuenta creados', { type: 'object', properties: { solicitud: ref('SolicitudCuenta'), cliente: ref('Cliente'), usuario: ref('UsuarioCreado') } }), 400: r400, ...comunes, 404: r404, 409: r409 },
      },
    },
    '/admin/solicitudes-cuenta/{id}/rechazar': {
      post: {
        tags: ['Admin · Solicitudes de cuenta'], summary: 'Rechazar una solicitud de cuenta', security: protegido,
        parameters: [idPath('Id de la solicitud de cuenta')],
        responses: { 200: ok('Solicitud rechazada', ref('SolicitudCuenta')), ...comunes, 404: r404, 409: r409 },
      },
    },
    '/admin/comunas': {
      get: {
        tags: ['Admin · Clientes'], summary: 'Listar comunas', security: protegido,
        responses: { 200: ok('Comunas donde opera ENINTI', lista('Comuna')), ...comunes },
      },
    },

    // ───────────── Admin · Plantas ─────────────
    '/admin/plantas': {
      get: {
        tags: ['Admin · Plantas'], summary: 'Listar plantas (HU-03)', security: protegido,
        parameters: [query('id_cliente', 'Filtrar por cliente', entero), query('id_comuna', 'Filtrar por comuna', entero)],
        responses: { 200: ok('Plantas con cliente y suscripción vigente', lista('PlantaAdmin')), 400: r400, ...comunes },
      },
      post: {
        tags: ['Admin · Plantas'], summary: 'Crear planta con su ficha técnica (HU-03)', security: protegido,
        requestBody: cuerpo(ref('PlantaPeticion'), { id_cliente: 1, id_comuna: 2, direccion: 'Av. Granaderos 999', potencia_kw: 3.3, inversor: 'Huawei SUN2000-3KTL', paneles: '6 × JA Solar 550 W', baterias: null, fecha_instalacion: '2026-10-01' }),
        responses: { 201: ok('Planta creada', ref('PlantaAdmin')), 400: r400, ...comunes },
      },
    },
    '/admin/plantas/{id}': {
      get: {
        tags: ['Admin · Plantas'], summary: 'Obtener una planta', security: protegido,
        parameters: [idPath('Id de la planta')],
        responses: { 200: ok('Planta', ref('PlantaAdmin')), ...comunes, 404: r404 },
      },
      put: {
        tags: ['Admin · Plantas'], summary: 'Editar la ficha técnica (HU-03)', security: protegido,
        description: 'Acepta cualquier subconjunto de los campos de la ficha.',
        parameters: [idPath('Id de la planta')],
        requestBody: cuerpo(ref('PlantaEdicion'), { inversor: 'Growatt SPH 5000', baterias: 'Pylontech US5000 × 2' }),
        responses: { 200: ok('Planta actualizada', ref('PlantaAdmin')), 400: r400, ...comunes, 404: r404 },
      },
    },
    '/admin/plantas/{id}/suscripciones': {
      get: {
        tags: ['Admin · Plantas'], summary: 'Historial de suscripciones de una planta', security: protegido,
        parameters: [idPath('Id de la planta')],
        responses: { 200: ok('Suscripciones, la vigente primero', lista('Suscripcion')), ...comunes, 404: r404 },
      },
      post: {
        tags: ['Admin · Plantas'], summary: 'Crear suscripción mensual (HU-03)', security: protegido,
        description: 'Una planta admite **una sola** suscripción vigente.',
        parameters: [idPath('Id de la planta')],
        requestBody: cuerpo(ref('SuscripcionPeticion'), { monto_mensual: 15000, fecha_inicio: '2026-11-01', dia_cobro: 5 }),
        responses: { 201: ok('Suscripción creada', ref('Suscripcion')), 400: r400, ...comunes, 404: r404, 409: { description: 'La planta ya tiene una suscripción vigente', content: json(ref('Error')) } },
      },
    },
    '/admin/suscripciones/{id}': {
      patch: {
        tags: ['Admin · Plantas'], summary: 'Cambiar cuota, día de cobro o estado', security: protegido,
        description: 'Pasar a `cancelada` registra la fecha y es definitivo (una suscripción cancelada no se modifica).',
        parameters: [idPath('Id de la suscripción')],
        requestBody: cuerpo(ref('SuscripcionEdicion'), { monto_mensual: 18000 }),
        responses: { 200: ok('Suscripción actualizada', ref('Suscripcion')), 400: r400, ...comunes, 404: r404, 409: { description: 'La suscripción está cancelada', content: json(ref('Error')) } },
      },
    },

    // ───────────── Admin · Trabajadores ─────────────
    '/admin/trabajadores': {
      get: {
        tags: ['Admin · Trabajadores'], summary: 'Listar trabajadores (HU-15)', security: protegido,
        responses: { 200: ok('Trabajadores, los activos primero', lista('TrabajadorAdmin')), ...comunes },
      },
      post: {
        tags: ['Admin · Trabajadores'], summary: 'Crear trabajador (HU-15)', security: protegido,
        requestBody: cuerpo(ref('TrabajadorPeticion'), { nombre: 'Juan Muñoz Pinto', email: 'juan.munoz@eninti.test', password: 'Trabajador.2026', telefono: '+56966666666' }),
        responses: { 201: ok('Trabajador creado', ref('TrabajadorAdmin')), 400: r400, ...comunes, 409: r409 },
      },
    },
    '/admin/trabajadores/{id}': {
      patch: {
        tags: ['Admin · Trabajadores'], summary: 'Editar, restablecer contraseña o desactivar (HU-15)', security: protegido,
        description: 'Con `activo: false` el trabajador **no puede iniciar sesión** y sus tokens vigentes son rechazados de inmediato.',
        parameters: [idPath('Id del usuario trabajador')],
        requestBody: cuerpo(ref('TrabajadorEdicion'), { activo: false }),
        responses: { 200: ok('Trabajador actualizado', ref('TrabajadorAdmin')), 400: r400, ...comunes, 404: r404, 409: r409 },
      },
    },

    // ───────────── Admin · Mantenciones ─────────────
    '/admin/mantenciones': {
      get: {
        tags: ['Admin · Mantenciones'], summary: 'Calendario de mantenciones (HU-04)', security: protegido,
        description: 'Ordenadas por comuna y fecha, con el trabajador asignado (`null` si está sin asignar).',
        parameters: [
          query('id_comuna', 'Filtrar por comuna', entero),
          query('desde', 'Fecha programada mínima (YYYY-MM-DD)', { type: 'string', format: 'date' }),
          query('hasta', 'Fecha programada máxima (YYYY-MM-DD)', { type: 'string', format: 'date' }),
          query('estado', 'Filtrar por estado', { type: 'string', enum: ['pendiente', 'en_curso', 'por_confirmar', 'finalizada', 'cancelada'] }),
        ],
        responses: { 200: ok('Mantenciones', lista('MantencionAdmin')), 400: r400, ...comunes },
      },
      post: {
        tags: ['Admin · Mantenciones'], summary: 'Programar una mantención (HU-04, HU-17)', security: protegido,
        description: 'Opcionalmente a partir de una solicitud del cliente (`id_solicitud`), que pasa a `asignada`. El trabajador, si se indica, debe estar **activo**.',
        requestBody: cuerpo(ref('MantencionPeticion'), { id_planta: 1, tipo: 'preventiva', fecha_programada: '2026-11-25', id_trabajador: 2 }),
        responses: { 201: ok('Mantención programada', ref('MantencionAdmin')), 400: r400, ...comunes, 409: { description: 'La solicitud no existe o ya fue atendida', content: json(ref('Error')) } },
      },
    },
    '/admin/mantenciones/{id}/asignar': {
      patch: {
        tags: ['Admin · Mantenciones'], summary: 'Asignar o reasignar a un trabajador (HU-17)', security: protegido,
        description: 'Solo a un usuario con rol trabajador **activo**, y solo mientras la mantención esté `pendiente` o `en_curso`.',
        parameters: [idPath('Id de la mantención')],
        requestBody: cuerpo({ type: 'object', required: ['id_trabajador'], properties: { id_trabajador: entero } }, { id_trabajador: 2 }),
        responses: { 200: ok('Mantención asignada', ref('MantencionAdmin')), 400: r400, ...comunes, 409: { description: 'La mantención no existe o ya está cerrada', content: json(ref('Error')) } },
      },
    },
    '/admin/mantenciones/{id}/cancelar': {
      post: {
        tags: ['Admin · Mantenciones'], summary: 'Cancelar una mantención abierta (HU-16)', security: protegido,
        parameters: [idPath('Id de la mantención')],
        requestBody: { required: false, content: json({ type: 'object', properties: { comentario: texto } }, { comentario: 'Cliente pidió reprogramar' }) },
        responses: { 200: ok('Mantención cancelada', ref('MantencionAdmin')), ...comunes, 404: r404, 409: { description: 'La mantención ya está cerrada', content: json(ref('Error')) } },
      },
    },

    // ───────────── Admin · Solicitudes ─────────────
    '/admin/solicitudes': {
      get: {
        tags: ['Admin · Solicitudes'], summary: 'Bandeja de solicitudes (HU-11)', security: protegido,
        parameters: [query('estado', 'Filtrar por estado', { type: 'string', enum: ['pendiente', 'asignada', 'rechazada', 'cerrada'] })],
        responses: { 200: ok('Solicitudes, las pendientes primero', lista('SolicitudAdmin')), ...comunes },
      },
    },
    '/admin/solicitudes/{id}/rechazar': {
      post: {
        tags: ['Admin · Solicitudes'], summary: 'Rechazar una solicitud pendiente (HU-11)', security: protegido,
        parameters: [idPath('Id de la solicitud')],
        responses: { 200: ok('Solicitud rechazada', ref('Solicitud')), ...comunes, 409: { description: 'La solicitud no existe o ya fue atendida', content: json(ref('Error')) } },
      },
    },

    // ───────────── Admin · Finanzas ─────────────
    '/admin/finanzas/impagos': {
      get: {
        tags: ['Admin · Finanzas'], summary: 'Listado de impagos y morosidad (HU-01)', security: protegido,
        description: 'Suscripciones con cuotas vencidas, ordenadas por antigüedad de la deuda.',
        responses: { 200: ok('Impagos', lista('Impago')), ...comunes },
      },
    },
    '/admin/suscripciones/{id}/cuotas': {
      get: {
        tags: ['Admin · Finanzas'], summary: 'Cuotas de una suscripción', security: protegido,
        parameters: [idPath('Id de la suscripción')],
        responses: { 200: ok('Cuotas, la más reciente primero', lista('Cuota')), ...comunes, 404: { description: 'La suscripción no tiene cuotas generadas', content: json(ref('Error')) } },
      },
    },
    '/admin/cuotas/{id}/pagos': {
      post: {
        tags: ['Admin · Finanzas'], summary: 'Registrar un pago manual (HU-02)', security: protegido,
        description: 'Por transferencia (exige `referencia` con el N° de operación) o efectivo (referencia opcional). Si se envía `monto`, debe ser el total de la cuota. Guarda quién lo registró y cuándo. La cuota pasa a `pagada` y, si no quedan cuotas vencidas, la suscripción vuelve a `al_dia`. Una cuota ya pagada **no admite un segundo pago**.',
        parameters: [idPath('Id de la cuota')],
        requestBody: cuerpo(ref('PagoManualPeticion'), { origen: 'transferencia', referencia: 'TRF-123456' }),
        responses: { 201: ok('Pago registrado', ref('Pago')), 400: r400, ...comunes, 404: r404, 409: { description: 'La cuota ya está pagada o anulada', content: json(ref('Error')) } },
      },
    },
    '/admin/finanzas/pagos': {
      get: {
        tags: ['Admin · Finanzas'], summary: 'Pagos recibidos en un mes (HU-06)', security: protegido,
        description: 'Para que el contador emita las boletas. Con `formato=csv` descarga un archivo (separador `;`, compatible con Excel).',
        parameters: [
          query('periodo', 'Mes consultado, formato `YYYY-MM`', { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])$', example: '2026-11' }, { required: true }),
          query('formato', 'Con `csv` devuelve un archivo descargable', { type: 'string', enum: ['json', 'csv'], default: 'json' }),
        ],
        responses: {
          200: { description: 'Pagos del mes (JSON o CSV)', content: { ...json(lista('PagoMes')), 'text/csv': { schema: { type: 'string' } } } },
          400: r400, ...comunes,
        },
      },
    },
    '/admin/finanzas/generar-cuotas': {
      post: {
        tags: ['Admin · Finanzas'], summary: 'Generar las cuotas de un período', security: protegido,
        description: 'Crea una cuota por cada suscripción no cancelada y marca como `vencida` toda cuota pendiente cuyo plazo pasó. Es **idempotente**: repetirlo no duplica cuotas.',
        requestBody: cuerpo({ type: 'object', required: ['periodo'], properties: { periodo: { type: 'string', example: '2026-11' } } }, { periodo: '2026-11' }),
        responses: { 200: ok('Resumen', { type: 'object', properties: { periodo: texto, cuotas_generadas: entero, cuotas_vencidas: entero } }), 400: r400, ...comunes },
      },
    },
    '/admin/finanzas/procesar-cargos': {
      post: {
        tags: ['Admin · Finanzas'], summary: 'Cobro recurrente en la pasarela (HU-13)', security: protegido,
        description: 'Intenta cobrar cada cuota abierta de los clientes con medio de pago activo. Un **rechazo no registra pago** ni cambia la cuota. Cada intento queda en `intento_cargo`; las cuotas con un cobro **en espera** en la pasarela se omiten para no cobrar dos veces.',
        responses: { 200: ok('Resultado de los cargos', ref('ResultadoCargos')), ...comunes },
      },
    },
    '/admin/finanzas/cobro-automatico': {
      get: {
        tags: ['Admin · Finanzas'], summary: 'Estado del cobro mensual automático (HU-13)', security: protegido,
        description: 'Si está activo, la hora diaria, si hoy ya se ejecutó, las últimas 5 ejecuciones y los cobros en espera de la pasarela.',
        responses: { 200: ok('Estado', { type: 'object' }), ...comunes },
      },
    },
    '/admin/finanzas/cobro-automatico/ejecutar': {
      post: {
        tags: ['Admin · Finanzas'], summary: 'Ejecutar ahora la tarea diaria de cobro', security: protegido,
        description: 'Genera las cuotas del mes en curso y cobra las que vencen, aunque hoy ya se haya ejecutado. 409 si otra ejecución está en curso.',
        responses: { 200: ok('Resumen de la ejecución', { type: 'object' }), 409: { description: 'Ya hay una ejecución en curso', content: json(ref('Error')) }, ...comunes },
      },
    },
    '/admin/finanzas/intentos/{id}/descartar': {
      post: {
        tags: ['Admin · Finanzas'], summary: 'Descartar un cobro en espera que no se realizó', security: protegido,
        description: 'Úsalo solo tras confirmar en el panel de la pasarela que no se cobró: la cuota vuelve a cobrarse en el próximo proceso.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: ok('Intento descartado', { type: 'object' }), 404: { description: 'No hay un cobro en espera con ese número', content: json(ref('Error')) }, ...comunes },
      },
    },
    '/tareas/cobro-diario': {
      post: {
        tags: ['Sistema'], summary: 'Disparador externo del cobro diario (cron)', security: [],
        description: 'Existe solo si se define `CRON_SECRET`; se llama con `Authorization: Bearer <CRON_SECRET>`. Es seguro repetirlo: si hoy ya se ejecutó responde `{ "omitida": true }`.',
        responses: { 200: ok('Resultado o tarea omitida', { type: 'object' }), 401: r401, 404: { description: 'CRON_SECRET no configurado', content: json(ref('Error')) } },
      },
    },

    // ───────────── Admin · Catálogo ─────────────
    '/admin/catalogo': {
      get: {
        tags: ['Admin · Catálogo'], summary: 'Listar el catálogo completo (RNF-07)', security: protegido,
        responses: { 200: ok('Planes y servicios, incluidos los inactivos', lista('CatalogoItem')), ...comunes },
      },
      post: {
        tags: ['Admin · Catálogo'], summary: 'Agregar un plan o servicio', security: protegido,
        requestBody: cuerpo(ref('CatalogoPeticion'), { nombre: 'Revisión de tableros', descripcion: 'Inspección termográfica del tablero eléctrico', tipo: 'servicio', precio: 40000 }),
        responses: { 201: ok('Ítem creado', ref('CatalogoItem')), 400: r400, ...comunes, 409: r409 },
      },
    },
    '/admin/catalogo/{id}': {
      patch: {
        tags: ['Admin · Catálogo'], summary: 'Editar o activar/desactivar un ítem', security: protegido,
        parameters: [idPath('Id del ítem')],
        requestBody: cuerpo(ref('CatalogoEdicion'), { precio: 16000 }),
        responses: { 200: ok('Ítem actualizado', ref('CatalogoItem')), 400: r400, ...comunes, 404: r404, 409: r409 },
      },
    },
    // ---------------------------------------------------------------- Cierre de órdenes y solicitudes del cliente
    '/cliente/ordenes/por-confirmar': {
      get: {
        tags: ['Cliente'], summary: 'Órdenes terminadas por el técnico que esperan mi confirmación (con fotos)', security: protegido,
        responses: { 200: ok('Órdenes por confirmar', { type: 'array', items: { type: 'object' } }), ...comunes },
      },
    },
    '/cliente/ordenes/{id}/confirmar': {
      post: {
        tags: ['Cliente'], summary: 'Confirmar el trabajo (→ finalizada) o informar que el problema sigue (→ en_curso)', security: protegido,
        parameters: [idPath('Id de la mantención')],
        requestBody: cuerpo({ type: 'object', required: ['satisfecho', 'problema_resuelto'], properties: { satisfecho: { type: 'boolean' }, problema_resuelto: { type: 'boolean' }, comentario: { type: 'string', maxLength: 500, description: 'Obligatorio si el problema sigue' } } }, { satisfecho: true, problema_resuelto: true }),
        responses: { 200: ok('Nuevo estado', { type: 'object', properties: { id_mantencion: entero, estado: texto } }), 400: r400, ...comunes, 404: r404, 409: r409 },
      },
    },
    '/cliente/solicitudes-suscripcion': {
      post: {
        tags: ['Cliente'], summary: 'Pedir (de nuevo) una suscripción para una planta propia; la otorga el administrador', security: protegido,
        requestBody: cuerpo({ type: 'object', required: ['id_planta'], properties: { id_planta: entero, mensaje: { type: 'string', maxLength: 500 } } }, { id_planta: 1 }),
        responses: { 201: ok('Solicitud creada', { type: 'object' }), 400: r400, ...comunes, 404: r404, 409: r409 },
      },
    },
    '/cliente/solicitudes-planta': {
      get: { tags: ['Cliente'], summary: 'Mis solicitudes de nueva planta, con la respuesta del administrador (CU-36)', security: protegido, responses: { 200: ok('Solicitudes', { type: 'array', items: { type: 'object' } }), ...comunes } },
      post: {
        tags: ['Cliente'], summary: 'Solicitar el registro de una nueva planta; la aprueba el administrador (CU-36)', security: protegido,
        description: 'Comuna y dirección obligatorias; potencia y baterías opcionales. Responde **409** si la dirección ya es una planta del cliente, si ya hay una solicitud pendiente para esa dirección o si el cliente tiene 3 solicitudes pendientes.',
        requestBody: cuerpo({ type: 'object', required: ['id_comuna', 'direccion'], properties: { id_comuna: entero, direccion: { type: 'string', minLength: 5, maxLength: 200 }, potencia_kw: { type: 'number', exclusiveMinimum: 0, maximum: 9999.99 }, tiene_baterias: { type: 'boolean', nullable: true }, mensaje: { type: 'string', maxLength: 500 } } },
          { id_comuna: 2, direccion: 'Parcela 7, Chiu Chiu', potencia_kw: 4.5, tiene_baterias: true, mensaje: 'Instalada en octubre' }),
        responses: { 201: ok('Solicitud creada', { type: 'object' }), 400: r400, ...comunes, 409: r409 },
      },
    },
    '/cliente/datos': {
      get: { tags: ['Cliente'], summary: 'Mis datos y mis solicitudes de cambio', security: protegido, responses: { 200: ok('Datos del cliente', { type: 'object' }), ...comunes } },
    },
    '/cliente/datos/solicitudes': {
      post: {
        tags: ['Cliente'], summary: 'Solicitar cambio de correo o teléfono (lo aprueba el administrador)', security: protegido,
        requestBody: cuerpo({ type: 'object', required: ['motivo'], properties: { email: { type: 'string', format: 'email' }, telefono: { type: 'string', example: '+56912345678' }, motivo: { type: 'string', maxLength: 300 } } }),
        responses: { 201: ok('Solicitud creada', { type: 'object' }), 400: r400, ...comunes, 409: r409 },
      },
    },
    '/pagos/flow/retorno': {
      post: {
        tags: ['Pagos'], summary: 'Retorno de Flow sandbox tras inscribir la tarjeta',
        description: 'Flow redirige el navegador con un POST (token). El servidor consulta `customer/getRegisterStatus`, guarda solo customerId, marca y últimos 4 dígitos, y redirige a Mi cuenta.',
        requestBody: { required: true, content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', properties: { token: texto } } } } },
        responses: { 303: { description: 'Redirección a /cliente/cuenta?inscripcion=aprobada|rechazada|error' } },
      },
    },
    '/admin/solicitudes-suscripcion': {
      get: { tags: ['Admin · Solicitudes'], summary: 'Solicitudes de suscripción (con deuda del cliente y suscripción anterior)', security: protegido, parameters: [query('estado', 'pendiente, aprobada o rechazada')], responses: { 200: ok('Solicitudes', { type: 'array', items: { type: 'object' } }), 400: r400, ...comunes } },
    },
    '/admin/solicitudes-suscripcion/{id}/aprobar': {
      post: { tags: ['Admin · Solicitudes'], summary: 'Aprobar y crear la suscripción', security: protegido, parameters: [idPath()], requestBody: cuerpo({ type: 'object', required: ['monto_mensual'], properties: { monto_mensual: entero, dia_cobro: { type: 'integer', minimum: 1, maximum: 28 }, fecha_inicio: fecha, respuesta: { type: 'string', maxLength: 500 } } }, { monto_mensual: 15000 }), responses: { 200: ok('Solicitud y suscripción', { type: 'object' }), 400: r400, ...comunes, 404: r404, 409: r409 } },
    },
    '/admin/solicitudes-suscripcion/{id}/rechazar': {
      post: { tags: ['Admin · Solicitudes'], summary: 'Rechazar con motivo visible para el cliente', security: protegido, parameters: [idPath()], requestBody: cuerpo({ type: 'object', required: ['respuesta'], properties: { respuesta: texto } }), responses: { 200: ok('Solicitud rechazada', { type: 'object' }), 400: r400, ...comunes, 409: r409 } },
    },
    '/admin/solicitudes-planta': {
      get: { tags: ['Admin · Solicitudes'], summary: 'Solicitudes de nueva planta (con cuántas plantas tiene ya el cliente) (CU-36)', security: protegido, parameters: [query('estado', 'pendiente, aprobada o rechazada')], responses: { 200: ok('Solicitudes', { type: 'array', items: { type: 'object' } }), 400: r400, ...comunes } },
    },
    '/admin/solicitudes-planta/{id}/aprobar': {
      post: {
        tags: ['Admin · Solicitudes'], summary: 'Aprobar: completar la ficha técnica y crear la planta (CU-36)', security: protegido, parameters: [idPath()],
        description: 'Comuna, dirección y potencia toman lo que envió el cliente si no se indican. Inversor, paneles y fecha de instalación son obligatorios. La planta y la aprobación se guardan en una sola transacción.',
        requestBody: cuerpo({ type: 'object', required: ['inversor', 'paneles', 'fecha_instalacion'], properties: { id_comuna: entero, direccion: texto, potencia_kw: { type: 'number' }, inversor: texto, paneles: texto, baterias: { type: 'string', nullable: true }, fecha_instalacion: fecha, respuesta: { type: 'string', maxLength: 500 } } },
          { inversor: 'Huawei SUN2000-5KTL', paneles: '10 x 450 W', baterias: null, fecha_instalacion: '2026-10-15', respuesta: 'Planta registrada' }),
        responses: { 200: ok('Solicitud aprobada (incluye id_planta)', { type: 'object' }), 400: r400, ...comunes, 404: r404, 409: r409 },
      },
    },
    '/admin/solicitudes-planta/{id}/rechazar': {
      post: { tags: ['Admin · Solicitudes'], summary: 'Rechazar con motivo visible para el cliente (CU-36)', security: protegido, parameters: [idPath()], requestBody: cuerpo({ type: 'object', required: ['respuesta'], properties: { respuesta: texto } }), responses: { 200: ok('Solicitud rechazada', { type: 'object' }), 400: r400, ...comunes, 409: r409 } },
    },
    '/admin/solicitudes-datos': {
      get: { tags: ['Admin · Solicitudes'], summary: 'Solicitudes de cambio de correo o teléfono', security: protegido, parameters: [query('estado', 'pendiente, aprobada o rechazada')], responses: { 200: ok('Solicitudes', { type: 'array', items: { type: 'object' } }), 400: r400, ...comunes } },
    },
    '/admin/solicitudes-datos/{id}/aprobar': {
      post: { tags: ['Admin · Solicitudes'], summary: 'Aprobar y aplicar el cambio', security: protegido, parameters: [idPath()], responses: { 200: ok('Solicitud aprobada', { type: 'object' }), ...comunes, 404: r404, 409: r409 } },
    },
    '/admin/solicitudes-datos/{id}/rechazar': {
      post: { tags: ['Admin · Solicitudes'], summary: 'Rechazar con motivo', security: protegido, parameters: [idPath()], requestBody: cuerpo({ type: 'object', required: ['respuesta'], properties: { respuesta: texto } }), responses: { 200: ok('Solicitud rechazada', { type: 'object' }), 400: r400, ...comunes, 409: r409 } },
    },
    '/admin/mantenciones/{id}/fotos': {
      get: { tags: ['Admin · Mantenciones'], summary: 'Fotos del trabajo enviadas por el técnico', security: protegido, parameters: [idPath()], responses: { 200: ok('Fotos (data URL)', { type: 'array', items: { type: 'object' } }), ...comunes, 404: r404 } },
    },
    '/admin/mantenciones/{id}/cerrar': {
      post: { tags: ['Admin · Mantenciones'], summary: 'Cerrar una orden por confirmar sin el cliente (queda el motivo en el historial)', security: protegido, parameters: [idPath()], requestBody: cuerpo({ type: 'object', required: ['comentario'], properties: { comentario: texto } }), responses: { 200: ok('Orden finalizada', ref('MantencionAdmin')), 400: r400, ...comunes, 404: r404, 409: r409 } },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token obtenido en `POST /auth/login`. Pégalo sin el prefijo `Bearer`.' },
    },
    responses: {
      NoAutenticado: { description: 'Falta el token, es inválido o expiró, o la cuenta fue desactivada', content: json(ref('Error'), { error: 'Token requerido' }) },
      Prohibido: { description: 'El rol del usuario no tiene acceso a este endpoint', content: json(ref('Error'), { error: 'Acceso no permitido para este rol' }) },
      NoEncontrado: { description: 'El recurso no existe o no pertenece al usuario', content: json(ref('Error')) },
      Invalido: { description: 'Datos de entrada inválidos', content: json(ref('Error'), { error: 'Datos inválidos', detalles: ['campo no es válido'] }) },
      Conflicto: { description: 'Conflicto con un registro existente (por ejemplo, un valor único repetido)', content: json(ref('Error'), { error: 'El registro ya existe o entra en conflicto con otro' }) },
    },
    schemas: {
      Error: { type: 'object', properties: { error: texto, detalles: { description: 'Detalle de validación, si aplica', oneOf: [{ type: 'array', items: texto }, texto] } }, required: ['error'] },

      // Autenticación
      LoginPeticion: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } },
      SolicitudCuentaPeticion: { type: 'object', required: ['nombre', 'rut', 'email', 'telefono', 'direccion_planta', 'id_comuna'], properties: { nombre: texto, rut: { type: 'string', example: '12345678-5' }, email: { type: 'string', format: 'email' }, telefono: { type: 'string', example: '+56912345678' }, direccion_planta: texto, id_comuna: entero, potencia_kw: { type: 'number', nullable: true }, tiene_baterias: { type: 'boolean', nullable: true, description: 'null si el cliente no lo sabe' }, mensaje: { type: 'string', maxLength: 500 } } },
      SolicitudCuenta: { type: 'object', properties: { id_solicitud_cuenta: entero, nombre: texto, rut: texto, email: texto, telefono: texto, direccion_planta: texto, id_comuna: entero, comuna: texto, potencia_kw: { type: 'number', nullable: true }, tiene_baterias: { type: 'boolean', nullable: true }, mensaje: { type: 'string', nullable: true }, estado: { type: 'string', enum: ['pendiente', 'aprobada', 'rechazada'] }, fecha_solicitud: fechaHora, fecha_resolucion: { ...fechaHora, nullable: true }, resuelta_por_nombre: { type: 'string', nullable: true }, id_cliente: { type: 'integer', nullable: true } } },
      CuentaClientePeticion: { type: 'object', required: ['password'], properties: { email: { type: 'string', format: 'email', description: 'Si se omite al aprobar, se usa el de la solicitud' }, password: { type: 'string', minLength: 8, description: 'Contraseña inicial definida por el administrador' } } },
      UsuarioCreado: { type: 'object', properties: { id_usuario: entero, nombre: texto, email: texto, rol: texto } },
      UsuarioSesion: { type: 'object', properties: { id: entero, nombre: texto, rol: { type: 'string', enum: ['cliente', 'trabajador', 'administrador'] }, email: texto } },
      LoginRespuesta: { type: 'object', properties: { token: { type: 'string', description: 'JWT válido por 8 horas' }, usuario: ref('UsuarioSesion') } },
      Perfil: { type: 'object', properties: { id_usuario: entero, nombre: texto, email: texto, rol: texto, telefono: { type: 'string', nullable: true }, ultimo_acceso: { ...fechaHora, nullable: true }, id_cliente: { type: 'integer', nullable: true, description: 'Solo para clientes' }, rut: { type: 'string', nullable: true } } },

      // Pagos / pasarela
      ConfirmarPasarelaPeticion: { type: 'object', required: ['token', 'resultado'], properties: { token: texto, resultado: { type: 'string', enum: ['aprobada', 'rechazada'] }, marca: texto, ultimos_4: { type: 'string', pattern: '^[0-9]{4}$', description: 'Obligatorio si es aprobada' } } },
      InscripcionPeticion: { type: 'object', required: ['acepta_condiciones'], properties: { acepta_condiciones: { type: 'boolean', description: 'Debe ser `true`' }, version_condiciones: { type: 'string', default: '1.0' } } },
      InscripcionRespuesta: { type: 'object', properties: { url_pasarela: { type: 'string', description: 'Ruta o URL a la que redirigir al cliente' }, proveedor: { type: 'string', enum: ['simulado', 'flow-sandbox'] } } },
      MedioPago: { type: 'object', properties: { id_medio_pago: entero, id_cliente: entero, token_pasarela: texto, marca: { type: 'string', nullable: true }, ultimos_4: { type: 'string', nullable: true }, estado: { type: 'string', enum: ['activo', 'inactivo', 'rechazado'] }, fecha_inscripcion: fechaHora } },

      // Catálogo
      CatalogoPublico: { type: 'object', properties: { id_item: entero, nombre: texto, descripcion: texto, tipo: { type: 'string', enum: ['plan', 'servicio'] }, precio: { type: 'integer', description: 'CLP, IVA incluido' } } },
      CatalogoItem: { allOf: [ref('CatalogoPublico'), { type: 'object', properties: { activo: { type: 'boolean' } } }] },
      CatalogoPeticion: { type: 'object', required: ['nombre', 'descripcion', 'tipo', 'precio'], properties: { nombre: texto, descripcion: texto, tipo: { type: 'string', enum: ['plan', 'servicio'] }, precio: { type: 'integer', minimum: 0 } } },
      CatalogoEdicion: { type: 'object', properties: { nombre: texto, descripcion: texto, tipo: { type: 'string', enum: ['plan', 'servicio'] }, precio: { type: 'integer', minimum: 0 }, activo: { type: 'boolean' } } },

      // Comunes
      Comuna: { type: 'object', properties: { id_comuna: entero, nombre: texto } },
      Suscripcion: { type: 'object', properties: { id_suscripcion: entero, id_planta: entero, monto_mensual: { type: 'integer', description: 'CLP' }, fecha_inicio: fecha, dia_cobro: { type: 'integer', minimum: 1, maximum: 28 }, mantenciones_anuales: entero, estado: { type: 'string', enum: ['al_dia', 'con_deuda', 'cancelada'] }, fecha_cancelacion: { ...fecha, nullable: true }, motivo_cancelacion: { type: 'string', enum: ['cliente', 'morosidad', 'administrador'], nullable: true }, flow_subscription_id: { type: 'string', nullable: true } } },
      SuscripcionResumen: { type: 'object', nullable: true, properties: { id_suscripcion: entero, estado: texto, fecha_inicio: fecha, monto_mensual: entero, dia_cobro: entero, mantenciones_anuales: entero } },
      Solicitud: { type: 'object', properties: { id_solicitud: entero, id_planta: entero, fecha_solicitud: fechaHora, motivo: texto, estado: { type: 'string', enum: ['pendiente', 'asignada', 'rechazada', 'cerrada'] }, fecha_asignada: { ...fecha, nullable: true } } },
      Cuota: { type: 'object', properties: { id_cuota: entero, id_suscripcion: entero, periodo: { type: 'string', example: '2026-11' }, monto: entero, fecha_vencimiento: fecha, estado: { type: 'string', enum: ['pendiente', 'pagada', 'vencida', 'anulada'] }, direccion: texto, cliente: texto } },
      Pago: { type: 'object', properties: { id_pago: entero, id_cuota: entero, id_medio_pago: { type: 'integer', nullable: true }, registrado_por: { type: 'integer', nullable: true }, origen: { type: 'string', enum: ['pasarela', 'transferencia', 'efectivo'] }, monto: entero, fecha_pago: fechaHora, referencia: { type: 'string', nullable: true } } },

      // Cliente
      PlantaCliente: { type: 'object', properties: { id_planta: entero, id_cliente: entero, id_comuna: entero, comuna: texto, direccion: texto, potencia_kw: { type: 'number', example: 3.3 }, inversor: texto, paneles: texto, baterias: { type: 'string', nullable: true, description: '`null` si la planta no tiene baterías' }, fecha_instalacion: fecha, latitud: { type: 'number', nullable: true }, longitud: { type: 'number', nullable: true }, suscripcion: ref('SuscripcionResumen') } },
      Cuenta: {
        type: 'object', properties: {
          suscripciones: { type: 'array', items: { type: 'object', properties: { id_suscripcion: entero, estado: texto, monto_mensual: entero, fecha_inicio: fecha, direccion: texto, comuna: texto, meses_pagados: entero, cuotas_vencidas: entero, deuda: entero } } },
          deuda_total: { type: 'integer', description: 'CLP' },
          cuotas_pendientes: { type: 'array', items: { type: 'object', properties: { periodo: texto, monto: entero, fecha_vencimiento: fecha, estado: texto, direccion: texto } } },
          pagos: { type: 'array', description: 'Últimos 50 pagos', items: { type: 'object', properties: { fecha_pago: fechaHora, monto: entero, origen: texto, referencia: { type: 'string', nullable: true }, periodo: texto, direccion: texto } } },
          medio_pago: { nullable: true, allOf: [{ type: 'object', properties: { id_medio_pago: entero, marca: texto, ultimos_4: texto, estado: texto, fecha_inscripcion: fechaHora } }] },
          medios_pago: { type: 'array', items: { type: 'object' } },
        },
      },
      MantencionesPlanta: { type: 'object', properties: { id_planta: entero, direccion: texto, comuna: texto, ultima: { type: 'object', nullable: true, properties: { fecha: fecha, tipo: texto, actividades: texto } }, proxima: { type: 'object', nullable: true, properties: { fecha: fecha, tipo: texto, estado: texto } } } },
      SolicitudCliente: { allOf: [ref('Solicitud'), { type: 'object', properties: { direccion: texto } }] },
      SolicitudPeticion: { type: 'object', required: ['id_planta', 'motivo'], properties: { id_planta: entero, motivo: { type: 'string', maxLength: 255 } } },

      // Trabajador
      FichaOrden: { type: 'object', properties: { id_planta: entero, direccion: texto, comuna: texto, potencia_kw: { type: 'number' }, inversor: texto, paneles: texto, baterias: { type: 'string', nullable: true }, fecha_instalacion: fecha, latitud: { type: 'number', nullable: true }, longitud: { type: 'number', nullable: true } } },
      Orden: { type: 'object', properties: { id_mantencion: entero, tipo: { type: 'string', enum: ['preventiva', 'correctiva'] }, estado: { type: 'string', enum: ['pendiente', 'en_curso', 'por_confirmar', 'finalizada', 'cancelada'] }, fecha_programada: fecha, fecha_ejecucion: { ...fecha, nullable: true }, actividades: { type: 'string', nullable: true }, observaciones: { type: 'string', nullable: true }, planta: ref('FichaOrden'), cliente: { type: 'object', properties: { nombre: texto, telefono: { type: 'string', nullable: true } } }, motivo_solicitud: { type: 'string', nullable: true } } },
      OrdenDetalle: { allOf: [ref('Orden'), { type: 'object', properties: { historial: { type: 'array', items: { type: 'object', properties: { estado_anterior: { type: 'string', nullable: true }, estado_nuevo: texto, comentario: { type: 'string', nullable: true }, fecha_cambio: fechaHora, responsable: texto } } } } }] },
      CambioEstadoPeticion: { type: 'object', required: ['estado'], properties: { estado: { type: 'string', enum: ['en_curso', 'por_confirmar'] }, actividades: { type: 'string', description: '**Obligatorio** al terminar (por_confirmar)' }, fotos: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'string', description: 'data:image/jpeg;base64,…' }, description: '**Obligatorio** al terminar: 1 a 4 fotos de hasta 2 MB' }, observaciones: texto, comentario: { type: 'string', maxLength: 255 } } },

      // Admin
      Cliente: { type: 'object', properties: { id_cliente: entero, id_usuario: { type: 'integer', nullable: true }, rut: texto, nombre: texto, telefono: { type: 'string', nullable: true }, direccion: { type: 'string', nullable: true }, id_comuna: { type: 'integer', nullable: true } } },
      ClienteAdmin: { type: 'object', properties: { id_cliente: entero, rut: texto, nombre: texto, telefono: { type: 'string', nullable: true }, direccion: { type: 'string', nullable: true }, id_comuna: { type: 'integer', nullable: true }, comuna: { type: 'string', nullable: true }, tiene_cuenta: { type: 'boolean' }, plantas: entero } },
      ClientePeticion: { type: 'object', required: ['rut', 'nombre'], properties: { rut: { type: 'string', example: '12345678-5' }, nombre: texto, telefono: texto, direccion: texto, id_comuna: entero } },
      ClienteEdicion: { type: 'object', properties: { rut: texto, nombre: texto, telefono: texto, direccion: texto, id_comuna: entero } },
      PlantaAdmin: { type: 'object', properties: { id_planta: entero, id_cliente: entero, id_comuna: entero, comuna: texto, direccion: texto, potencia_kw: { type: 'number' }, inversor: texto, paneles: texto, baterias: { type: 'string', nullable: true }, fecha_instalacion: fecha, cliente: { type: 'object', properties: { id_cliente: entero, rut: texto, nombre: texto } }, suscripcion: ref('SuscripcionResumen') } },
      PlantaPeticion: { type: 'object', required: ['id_cliente', 'id_comuna', 'direccion', 'potencia_kw', 'inversor', 'paneles', 'fecha_instalacion'], properties: { id_cliente: entero, id_comuna: entero, direccion: texto, potencia_kw: { type: 'number', minimum: 0, exclusiveMinimum: true }, inversor: texto, paneles: texto, baterias: { type: 'string', nullable: true, description: 'Opcional; `null` si no tiene' }, fecha_instalacion: fecha } },
      PlantaEdicion: { type: 'object', properties: { id_cliente: entero, id_comuna: entero, direccion: texto, potencia_kw: { type: 'number' }, inversor: texto, paneles: texto, baterias: { type: 'string', nullable: true }, fecha_instalacion: fecha } },
      SuscripcionPeticion: { type: 'object', required: ['monto_mensual'], properties: { monto_mensual: { type: 'integer', minimum: 1, description: 'CLP' }, fecha_inicio: { ...fecha, description: 'Por defecto, hoy' }, dia_cobro: { type: 'integer', minimum: 1, maximum: 28, default: 1 } } },
      SuscripcionEdicion: { type: 'object', description: 'Indica al menos un campo', properties: { monto_mensual: { type: 'integer', minimum: 1 }, dia_cobro: { type: 'integer', minimum: 1, maximum: 28 }, estado: { type: 'string', enum: ['cancelada'], description: 'al_dia y con_deuda los calculan las reglas de deuda' } } },
      TrabajadorAdmin: { type: 'object', properties: { id_usuario: entero, nombre: texto, email: texto, telefono: { type: 'string', nullable: true }, activo: { type: 'boolean' }, fecha_creacion: fechaHora, ultimo_acceso: { ...fechaHora, nullable: true } } },
      TrabajadorPeticion: { type: 'object', required: ['nombre', 'email', 'password'], properties: { nombre: texto, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 8, description: 'Contraseña inicial' }, telefono: texto } },
      TrabajadorEdicion: { type: 'object', properties: { nombre: texto, email: texto, password: { type: 'string', minLength: 8 }, telefono: texto, activo: { type: 'boolean' } } },
      MantencionAdmin: { type: 'object', properties: { id_mantencion: entero, tipo: texto, estado: texto, fecha_programada: fecha, fecha_ejecucion: { ...fecha, nullable: true }, actividades: { type: 'string', nullable: true }, observaciones: { type: 'string', nullable: true }, id_solicitud: { type: 'integer', nullable: true }, id_planta: entero, direccion: texto, id_comuna: entero, comuna: texto, id_cliente: entero, cliente: texto, telefono_cliente: { type: 'string', nullable: true }, id_trabajador: { type: 'integer', nullable: true }, trabajador: { type: 'string', nullable: true } } },
      MantencionPeticion: { type: 'object', required: ['id_planta', 'tipo', 'fecha_programada'], properties: { id_planta: entero, tipo: { type: 'string', enum: ['preventiva', 'correctiva'] }, fecha_programada: fecha, id_trabajador: { type: 'integer', description: 'Opcional; debe ser un trabajador activo' }, id_solicitud: { type: 'integer', description: 'Opcional; la solicitud debe estar pendiente y ser de la misma planta' } } },
      SolicitudAdmin: { allOf: [ref('Solicitud'), { type: 'object', properties: { direccion: texto, comuna: texto, cliente: texto, telefono_cliente: { type: 'string', nullable: true } } }] },
      Impago: { type: 'object', properties: { id_suscripcion: entero, id_cliente: entero, cliente: texto, rut: texto, telefono: { type: 'string', nullable: true }, direccion: texto, comuna: texto, estado_suscripcion: texto, periodos: { type: 'array', items: texto, example: ['2026-09', '2026-10'] }, meses_adeudados: entero, monto_total: { type: 'integer', description: 'CLP' }, vencida_desde: fecha } },
      PagoManualPeticion: { type: 'object', required: ['origen'], properties: { origen: { type: 'string', enum: ['transferencia', 'efectivo'] }, monto: { type: 'integer', minimum: 1, description: 'Por defecto, el monto de la cuota' }, referencia: { type: 'string', maxLength: 100, description: 'N° de transferencia, folio, etc.' } } },
      PagoMes: { type: 'object', properties: { id_pago: entero, fecha_pago: fechaHora, cliente: texto, rut: texto, monto: entero, origen: texto, referencia: { type: 'string', nullable: true }, periodo: texto, direccion: texto, registrado_por: { type: 'string', nullable: true } } },
      ResultadoCargos: { type: 'object', properties: { intentos: entero, aprobados: entero, rechazados: entero, pendientes: entero, errores: entero, detalle: { type: 'array', items: { type: 'object', properties: { cuota: entero, periodo: texto, cliente: texto, monto: entero, resultado: { type: 'string', enum: ['aprobado', 'rechazado', 'pendiente', 'error'] }, referencia: { type: 'string', nullable: true } } } } } },
    },
  },
};
