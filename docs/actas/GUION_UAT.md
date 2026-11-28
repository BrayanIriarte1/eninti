# Guion de la prueba de aceptación (UAT) · ENINTI

Prueba de aceptación del prototipo con el Product Owner (Gerente General de ENINTI),
correspondiente a la **Fase 6** del Informe U2. El resultado se registra en el
[acta de aceptación](ACTA_DE_ACEPTACION.md).

## Preparación (el día anterior)

- [ ] Despertar el sitio publicado 5 minutos antes (abrir https://eninti.onrender.com): el plan
      gratuito tarda cerca de un minuto en reactivarse.
- [ ] Verificar que las cuentas de demostración entran (administrador, técnico y un cliente con
      planta y suscripción). Usar **solo datos ficticios** (RNF-04).
- [ ] Tener a mano un teléfono para la vista del técnico y otro equipo para la del cliente.
- [ ] Imprimir o compartir el acta. Duración estimada: **60 minutos**.

## Reglas de la sesión

1. El Product Owner ejecuta cada paso; el equipo solo explica qué se pide, sin tomar el control.
2. Por cada escenario se anota: **Aprobado**, **Aprobado con observaciones** o **Rechazado**.
3. Toda observación se registra en el acta con su prioridad; ninguna se corrige durante la sesión.
4. Se acepta el prototipo si se aprueban **todos** los escenarios marcados como *Must*
   (RNF-11). Un escenario *Should* rechazado se registra como defecto para el cierre.

## Escenarios

| # | Perfil | Escenario (pasos) | Resultado esperado | HU | Prioridad |
|---|---|---|---|---|---|
| 1 | Visitante | Abrir el cotizador y luego «Contacta al administrador» desde el login; enviar datos y planta | Se ven planes y precios; la solicitud queda enviada sin crear cuenta | HU-07 | Must |
| 2 | Administrador | Ver la campana y la solicitud en *Nuevas cuentas*; crear la cuenta (el correo viene cargado) y registrar la planta | Cliente, cuenta y planta creados; aviso en la campana | HU-07, HU-03 | Must |
| 3 | Administrador | Activar la suscripción de la planta (cuota y día de cobro) | La planta queda «Al día» | HU-03 | Must |
| 4 | Administrador | Programar una mantención en el *Calendario* y asignarla a un técnico | Aparece en el calendario con el técnico; el técnico recibe el aviso | HU-04, HU-17 | Must |
| 5 | Técnico (teléfono) | Abrir la agenda, ver la ficha (baterías) y el mapa; iniciar la visita | Solo ve sus visitas; el estado pasa a «En curso»; el administrador recibe aviso | HU-14, HU-16 | Must |
| 6 | Técnico (teléfono) | Registrar actividades y tomar 1 a 4 fotos; enviar al cliente | Queda «por confirmar»; no deja enviar sin fotos | HU-05 | Must |
| 7 | Cliente | Iniciar sesión con la cuenta creada; ver el aviso, revisar las fotos y confirmar el cierre | La orden queda finalizada; aparece como última mantención | HU-09, CU-23 | Must |
| 8 | Cliente | En *Mi cuenta*, encontrar la deuda y los pagos en **máximo 3 acciones** | Información de pago visible | HU-08 | Must |
| 9 | Cliente | Leer y aceptar las condiciones e inscribir una tarjeta en la pasarela simulada | Tarjeta inscrita (solo últimos 4 dígitos) | HU-13 | Must |
| 10 | Cliente | Solicitar una mantención y una nueva planta | Quedan pendientes; el administrador recibe avisos | HU-11, CU-36 | Should |
| 11 | Administrador | Revisar *Impagos*, registrar un pago por transferencia y exportar el CSV del mes | La cuota queda pagada con su N° de operación; el CSV abre en Excel | HU-01, HU-02, HU-06 | Must |
| 12 | Administrador | Aprobar la nueva planta del escenario 10 | La planta aparece en *Mis plantas* del cliente | CU-36 | Should |
| 13 | Administrador | Desactivar un técnico e intentar usar su sesión | El técnico pierde el acceso de inmediato | HU-15 | Must |
| 14 | Cliente | Cancelar la suscripción (máximo dos pasos) | Queda cancelada con fecha; puede pedirla de nuevo | HU-12 | Should |

## Preguntas de cierre al Product Owner

1. ¿La plataforma reemplaza la planilla y WhatsApp para estos procesos?
2. ¿Qué cambiaría antes de usarla con clientes reales?
3. ¿Los clientes mayores podrían usarla sin ayuda? (Escala 1 a 5).
4. ¿Autoriza la Fase 2 (cobros reales, boleta electrónica, recordatorios)?
