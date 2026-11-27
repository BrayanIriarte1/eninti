"""Genera los diagramas de casos de uso de ENINTI como SVG (estilo del informe U2)."""
import sys, pathlib
from html import escape

SALIDA = pathlib.Path(sys.argv[1])

ROJO, ROSA = '#B71C1C', '#FDE8E8'
AZUL, CELESTE = '#0B5C8A', '#E3F0FA'
GRIS, GRIS_FONDO = '#616161', '#EEEEEE'
TEXTO = '#1F2328'

PITCH = 84       # separación vertical entre filas
EH = 64          # alto de cada elipse


class Diagrama:
    def __init__(self, ancho, titulo):
        self.ancho, self.titulo = ancho, titulo
        self.capas = {'fondo': [], 'lineas': [], 'formas': [], 'textos': []}
        self.elipses = {}
        self.alto = 0

    # ------------------------------------------------------------- primitivas
    def add(self, capa, s):
        self.capas[capa].append(s)

    def elipse(self, clave, cx, cy, w, nombre, codigo, tipo='original'):
        borde, fondo = {'original': (ROJO, ROSA), 'nuevo': (AZUL, CELESTE), 'apoyo': (GRIS, GRIS_FONDO)}[tipo]
        self.elipses[clave] = (cx, cy, w)
        self.add('formas', f'<ellipse cx="{cx}" cy="{cy}" rx="{w/2}" ry="{EH/2}" fill="{fondo}" stroke="{borde}" stroke-width="1.6"/>')
        lineas = nombre.split('\n')
        y0 = cy - 6 - (len(lineas) - 1) * 8
        for i, l in enumerate(lineas):
            self.add('textos', f'<text x="{cx}" y="{y0 + i*16}" text-anchor="middle" font-size="14.5" fill="{TEXTO}">{escape(l)}</text>')
        self.add('textos', f'<text x="{cx}" y="{y0 + len(lineas)*16 + 1}" text-anchor="middle" font-size="11" font-weight="700" fill="{borde}">{escape(codigo)}</text>')

    def actor(self, x, y, nombre):
        s = f'stroke="{TEXTO}" stroke-width="2" fill="none"'
        self.add('formas', f'<circle cx="{x}" cy="{y-36}" r="11" fill="#fff" {s}/>')
        self.add('formas', f'<line x1="{x}" y1="{y-25}" x2="{x}" y2="{y+4}" {s}/>')
        self.add('formas', f'<line x1="{x-18}" y1="{y-15}" x2="{x+18}" y2="{y-15}" {s}/>')
        self.add('formas', f'<polyline points="{x-15},{y+30} {x},{y+4} {x+15},{y+30}" {s}/>')
        for i, l in enumerate(nombre.split('\n')):
            self.add('textos', f'<text x="{x}" y="{y+50+i*17}" text-anchor="middle" font-size="15" font-weight="700" fill="{TEXTO}">{escape(l)}</text>')

    def borde(self, clave, lado):
        cx, cy, w = self.elipses[clave]
        return {'izq': (cx - w/2, cy), 'der': (cx + w/2, cy), 'arr': (cx, cy - EH/2), 'aba': (cx, cy + EH/2)}[lado]

    def asociacion(self, ax, ay, clave, lado='izq'):
        x, y = self.borde(clave, lado)
        self.add('lineas', f'<line x1="{ax}" y1="{ay}" x2="{x}" y2="{y}" stroke="{TEXTO}" stroke-width="1.3"/>')

    def poli(self, puntos, color=TEXTO):
        p = ' '.join(f'{x},{y}' for x, y in puntos)
        self.add('lineas', f'<polyline points="{p}" fill="none" stroke="{color}" stroke-width="1.3"/>')

    def dependencia(self, origen, lado_o, destino, lado_d, estereotipo, etiqueta_xy=None, puntos=None):
        """Flecha punteada «include»/«extend» de origen a destino."""
        a = self.borde(origen, lado_o)
        b = self.borde(destino, lado_d)
        ruta = [a] + (puntos or []) + [b]
        p = ' '.join(f'{x},{y}' for x, y in ruta)
        self.add('lineas', f'<polyline points="{p}" fill="none" stroke="{TEXTO}" stroke-width="1.3" stroke-dasharray="6 4" marker-end="url(#abierta)"/>')
        if etiqueta_xy is None:
            (x1, y1), (x2, y2) = ruta[-2], ruta[-1]
            etiqueta_xy = ((x1 + x2) / 2, (y1 + y2) / 2 - 7)
        ex, ey = etiqueta_xy
        self.add('textos', f'<text x="{ex}" y="{ey}" text-anchor="middle" font-size="12" font-style="italic" fill="{TEXTO}">«{estereotipo}»</text>')

    def generalizacion(self, desde, hasta):
        p = ' '.join(f'{x},{y}' for x, y in desde + [hasta])
        self.add('lineas', f'<polyline points="{p}" fill="none" stroke="{TEXTO}" stroke-width="1.3" marker-end="url(#hueca)"/>')

    def caja(self, x0, y0, x1, y1, nombre):
        self.add('fondo', f'<rect x="{x0}" y="{y0}" width="{x1-x0}" height="{y1-y0}" fill="#fff" stroke="{TEXTO}" stroke-width="1.6"/>')
        self.add('textos', f'<text x="{x0+14}" y="{y0+24}" font-size="15" font-weight="700" fill="{TEXTO}">{escape(nombre)}</text>')

    def leyenda(self, x, y):
        items = [(ROSA, ROJO, 'Caso de uso del Informe U2'), (CELESTE, AZUL, 'Caso de uso agregado en la implementación'),
                 (GRIS_FONDO, GRIS, 'Paso incluido / extensión (sin número propio)')]
        for i, (f, b, t) in enumerate(items):
            yy = y + i * 24
            self.add('formas', f'<ellipse cx="{x+18}" cy="{yy}" rx="16" ry="9" fill="{f}" stroke="{b}" stroke-width="1.5"/>')
            self.add('textos', f'<text x="{x+42}" y="{yy+4.5}" font-size="13" fill="{TEXTO}">{escape(t)}</text>')

    def svg(self):
        defs = f'''<defs>
  <marker id="abierta" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto-start-reverse">
    <path d="M1,1 L11,6 L1,11" fill="none" stroke="{TEXTO}" stroke-width="1.4"/></marker>
  <marker id="hueca" viewBox="0 0 16 16" refX="15" refY="8" markerWidth="15" markerHeight="15" orient="auto-start-reverse">
    <path d="M1,1 L15,8 L1,15 Z" fill="#fff" stroke="{TEXTO}" stroke-width="1.4"/></marker>
</defs>'''
        cuerpo = '\n'.join(self.capas['fondo'] + self.capas['lineas'] + self.capas['formas'] + self.capas['textos'])
        return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.ancho}" height="{self.alto}" '
                f'viewBox="0 0 {self.ancho} {self.alto}" font-family="Calibri, Carlito, \'Segoe UI\', Arial, sans-serif">\n'
                f'<rect width="100%" height="100%" fill="#fff"/>\n{defs}\n{cuerpo}\n</svg>\n')


# =============================================================================
# Diagrama 1 · Visitante, Cliente y Trabajador
# =============================================================================
def diagrama_usuarios():
    d = Diagrama(1440, 'Visitante, Cliente y Trabajador')
    X0, X1 = 250, 1200
    MAIN, MW = 560, 330
    DER, DW = 985, 290
    top = 30
    filas = [
        # clave, nombre, código, tipo, grupo
        ('cu01', 'Cotizar planes y servicios', 'CU-01 · RNF-07', 'original', 'vis'),
        ('cu02', 'Solicitar cuenta y planta', 'CU-02 · HU-07', 'original', 'vis'),
        ('cu35', 'Contactar a ENINTI', 'CU-35', 'nuevo', 'vis'),
        ('cu27', 'Recuperar contraseña', 'CU-27', 'nuevo', 'vis'),
        None,
        ('cu03', 'Iniciar sesión', 'CU-03 · HU-07', 'original', 'usr'),
        ('cu26', 'Cambiar contraseña', 'CU-26', 'nuevo', 'usr'),
        None,
        ('cu04', 'Consultar estado de cuenta', 'CU-04 · HU-08', 'original', 'cli'),
        ('cu05', 'Consultar mantenciones', 'CU-05 · HU-09', 'original', 'cli'),
        ('cu06', 'Consultar ficha de planta', 'CU-06 · HU-10', 'original', 'cli'),
        ('cu07', 'Solicitar mantención', 'CU-07 · HU-11', 'original', 'cli'),
        ('cu08', 'Cancelar suscripción', 'CU-08 · HU-12', 'original', 'cli'),
        ('cu09', 'Inscribir medio de pago', 'CU-09 · HU-13', 'original', 'cli'),
        ('cu24', 'Solicitar suscripción', 'CU-24', 'nuevo', 'cli'),
        ('cu25', 'Solicitar cambio de datos', 'CU-25', 'nuevo', 'cli'),
        None,
        ('cu10', 'Consultar agenda', 'CU-10 · HU-14', 'original', 'tra'),
        ('cu11', 'Gestionar orden de trabajo', 'CU-11 · HU-16', 'original', 'tra'),
    ]
    y = top + 76
    grupos = {}
    for f in filas:
        if f is None:
            y += 22
            continue
        clave, nombre, codigo, tipo, grupo = f
        d.elipse(clave, MAIN, y, MW, nombre, codigo, tipo)
        grupos.setdefault(grupo, []).append(clave)
        y += PITCH
    y_fin = y - PITCH + EH / 2 + 30

    # Columna derecha: include / extend
    _, y05, _ = d.elipses['cu05']
    d.elipse('cu23', DER, y05, DW, 'Confirmar cierre de orden', 'CU-23', 'nuevo')
    d.dependencia('cu23', 'izq', 'cu05', 'der', 'extend')
    _, y09, _ = d.elipses['cu09']
    d.elipse('rf19', DER, y09, DW, 'Aceptar condiciones', 'RF-19', 'apoyo')
    d.dependencia('cu09', 'der', 'rf19', 'izq', 'include')
    _, y11, _ = d.elipses['cu11']
    d.elipse('cu12', DER, y11, DW, 'Registrar actividades y\nenviar al cliente', 'CU-12 · HU-05', 'original')
    d.dependencia('cu12', 'izq', 'cu11', 'der', 'extend')

    d.caja(X0, top, X1, y_fin, 'Plataforma ENINTI')

    # Actores y asociaciones
    AX = 140
    def centro(grupo):
        ys = [d.elipses[k][1] for k in grupos[grupo]]
        return (min(ys) + max(ys)) / 2 - 8
    posiciones = {}
    for grupo, nombre in [('vis', 'Visitante'), ('usr', 'Usuario\nregistrado'), ('cli', 'Cliente'), ('tra', 'Trabajador')]:
        ay = centro(grupo)
        posiciones[grupo] = ay
        d.actor(AX, ay, nombre)
        for k in grupos[grupo]:
            d.asociacion(AX + 22, ay - 15, k)
    # El cliente también confirma el cierre de la orden (CU-23)
    # Herencia: Cliente y Trabajador son Usuarios registrados
    yu = posiciones['usr']
    for g in ('cli', 'tra'):
        ya = posiciones[g]
        d.generalizacion([(AX - 22, ya - 15), (60, ya - 15), (60, yu - 15)], (AX - 22, yu - 15))

    # Actor secundario: Pasarela de pago
    PX = 1320
    py = y09 + 60
    d.actor(PX, py, 'Pasarela\nde pago')
    cx9, _, _ = d.elipses['cu09']
    d.poli([(cx9, y09 + EH / 2), (cx9, y09 + 40), (DER + DW / 2 + 40, y09 + 40), (PX - 24, py - 15)])

    d.leyenda(X0 + 10, y_fin + 34)
    d.alto = int(y_fin + 120)
    d.add('textos', f'<text x="{X1}" y="{y_fin + 38}" text-anchor="end" font-size="12" fill="{GRIS}">Cliente y Trabajador heredan de Usuario registrado (flecha de punta hueca).</text>')
    return d


# =============================================================================
# Diagrama 2 · Administrador
# =============================================================================
def diagrama_admin():
    d = Diagrama(1440, 'Administrador')
    X0, X1 = 250, 1200
    MAIN, MW = 560, 340
    DER, DW = 985, 290
    top = 30
    filas = [
        ('cu03', 'Iniciar sesión', 'CU-03 · HU-07', 'original'),
        ('cu13', 'Gestionar solicitudes de cuenta', 'CU-13 · HU-07', 'original'),
        ('hueco', None, None, None),
        ('cu14', 'Gestionar clientes y plantas', 'CU-14 · HU-03', 'original'),
        ('cu28', 'Atender solicitudes de suscripción', 'CU-28', 'nuevo'),
        ('cu29', 'Atender cambios de datos', 'CU-29', 'nuevo'),
        ('cu15', 'Gestionar trabajadores', 'CU-15 · HU-15', 'original'),
        ('cu16', 'Programar y asignar mantención', 'CU-16 · HU-04, HU-17', 'original'),
        ('cu17', 'Atender solicitudes de mantención', 'CU-17 · HU-11', 'original'),
        ('cu31', 'Cerrar orden sin confirmación\ndel cliente', 'CU-31', 'nuevo'),
        ('cu18', 'Consultar impagos', 'CU-18 · HU-01', 'original'),
        ('cu19', 'Listado mensual de pagos', 'CU-19 · HU-06', 'original'),
        ('cu20', 'Generar cuotas y procesar cargos', 'CU-20 · HU-13', 'original'),
        ('cu21', 'Administrar catálogo', 'CU-21 · RNF-07', 'original'),
        ('cu33', 'Revisar avisos por correo', 'CU-33', 'nuevo'),
    ]
    y = top + 76
    claves = []
    for clave, nombre, codigo, tipo in filas:
        if clave != 'hueco':
            d.elipse(clave, MAIN, y, MW, nombre, codigo, tipo)
            claves.append(clave)
        y += PITCH
    y_fin = y - PITCH + EH / 2 + 30

    Y = lambda k: d.elipses[k][1]
    # CU-13 «include» Crear cliente y cuenta web ← «extend» Registrar planta
    d.elipse('crear', DER, Y('cu13'), DW, 'Crear cliente y cuenta web', 'HU-07', 'apoyo')
    d.dependencia('cu13', 'der', 'crear', 'izq', 'include')
    d.elipse('planta', DER, Y('cu13') + PITCH, DW, 'Registrar planta y\nficha técnica', 'HU-03', 'apoyo')
    d.dependencia('planta', 'arr', 'crear', 'aba', 'extend', etiqueta_xy=(DER + 48, Y('cu13') + PITCH / 2 + 4))
    # CU-32 «extend» CU-14
    d.elipse('cu32', DER, Y('cu14') + 18, DW, 'Cancelar suscripción\npor administración', 'CU-32', 'nuevo')
    d.dependencia('cu32', 'izq', 'cu14', 'der', 'extend')
    # CU-17 «extend» CU-16 (vertical) y CU-30 «extend» CU-16
    d.dependencia('cu17', 'arr', 'cu16', 'aba', 'extend', etiqueta_xy=(MAIN + 46, (Y('cu16') + Y('cu17')) / 2 + 4))
    d.elipse('cu30', DER, Y('cu16'), DW, 'Cancelar mantención', 'CU-30', 'nuevo')
    d.dependencia('cu30', 'izq', 'cu16', 'der', 'extend')
    # CU-22 «extend» CU-18
    d.elipse('cu22', DER, Y('cu18'), DW, 'Registrar pago manual', 'CU-22 · HU-02', 'original')
    d.dependencia('cu22', 'izq', 'cu18', 'der', 'extend')
    # CU-34 «include» CU-20
    d.elipse('cu34', DER, Y('cu19'), DW, 'Cobro automático diario', 'CU-34', 'nuevo')
    x34, y34 = d.borde('cu34', 'izq'); x20, y20 = d.borde('cu20', 'der')
    d.dependencia('cu34', 'izq', 'cu20', 'der', 'include', etiqueta_xy=((x34 + x20) / 2 + 52, (y34 + y20) / 2 + 14))

    d.caja(X0, top, X1, y_fin, 'Plataforma ENINTI · Administración')

    AX = 140
    ays = [Y(k) for k in claves]
    ay = (min(ays) + max(ays)) / 2
    d.actor(AX, ay, 'Administrador')
    for k in claves:
        d.asociacion(AX + 22, ay - 15, k)

    # Actores secundarios
    PX = 1320
    d.actor(PX, Y('cu19') - 40, 'Reloj del\nsistema')
    d.asociacion(PX - 24, Y('cu19') - 55, 'cu34', 'der')
    d.actor(PX, Y('cu21') + 20, 'Pasarela\nde pago')
    x20, y20 = d.borde('cu20', 'der')
    d.poli([(x20, y20), (x20 + 60, y20 + 36), (PX - 24, Y('cu21') + 5)])

    d.leyenda(X0 + 10, y_fin + 34)
    d.alto = int(y_fin + 120)
    return d


SALIDA.mkdir(parents=True, exist_ok=True)
(SALIDA / 'casos_de_uso_1_visitante_cliente_trabajador.svg').write_text(diagrama_usuarios().svg())
(SALIDA / 'casos_de_uso_2_administrador.svg').write_text(diagrama_admin().svg())
print('ok')
