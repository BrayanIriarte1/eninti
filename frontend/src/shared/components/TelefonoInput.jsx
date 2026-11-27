import { useState } from 'react';

// Códigos de país más usados (Chile primero). El número se guarda completo: +56912345678
const PAISES = [
  { codigo: '+56', nombre: 'Chile', largo: 9, ejemplo: '912345678' },
  { codigo: '+54', nombre: 'Argentina', largo: 10 },
  { codigo: '+591', nombre: 'Bolivia', largo: 8 },
  { codigo: '+51', nombre: 'Perú', largo: 9 },
  { codigo: '+55', nombre: 'Brasil', largo: 11 },
  { codigo: '+57', nombre: 'Colombia', largo: 10 },
  { codigo: '+593', nombre: 'Ecuador', largo: 9 },
  { codigo: '+595', nombre: 'Paraguay', largo: 9 },
  { codigo: '+598', nombre: 'Uruguay', largo: 8 },
  { codigo: '+58', nombre: 'Venezuela', largo: 10 },
  { codigo: '+52', nombre: 'México', largo: 10 },
  { codigo: '+1', nombre: 'EE. UU. / Canadá', largo: 10 },
  { codigo: '+34', nombre: 'España', largo: 9 },
  { codigo: '+49', nombre: 'Alemania', largo: 11 },
  { codigo: '+86', nombre: 'China', largo: 11 },
];

// Separa '+56912345678' en país y número (el código más largo que coincida)
function separar(valor) {
  const v = String(valor ?? '').replace(/\s/g, '');
  const pais = [...PAISES].sort((a, b) => b.codigo.length - a.codigo.length).find((p) => v.startsWith(p.codigo));
  return pais ? { codigo: pais.codigo, numero: v.slice(pais.codigo.length) } : { codigo: '+56', numero: v.replace(/\D/g, '') };
}

// Teléfono con lista de códigos de país. Entrega onChange({ target: { name, value } })
// con el número completo ('+56912345678'), o '' si no se escribió número.
export default function TelefonoInput({ name = 'telefono', value, onChange, required }) {
  const [elegido, setElegido] = useState(() => separar(value).codigo);
  // Si ya hay número, el código sale del valor (p. ej. al editar otro cliente)
  const codigo = value ? separar(value).codigo : elegido;
  const numero = value ? separar(value).numero : '';
  const pais = PAISES.find((p) => p.codigo === codigo) ?? PAISES[0];

  const emitir = (cod, num) => onChange({ target: { name, value: num ? `${cod}${num}` : '' } });

  return (
    <span className="telefono">
      <select
        aria-label="Código de país"
        value={codigo}
        onChange={(e) => { setElegido(e.target.value); emitir(e.target.value, numero); }}
      >
        {PAISES.map((p) => (
          <option key={p.codigo} value={p.codigo}>{p.codigo} {p.nombre}</option>
        ))}
      </select>
      <input
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={numero}
        onChange={(e) => emitir(codigo, e.target.value.replace(/\D/g, '').slice(0, 13))}
        required={required}
        minLength={Math.min(pais.largo, 8)}
        maxLength={13}
        placeholder={pais.ejemplo ?? '0'.repeat(pais.largo)}
      />
    </span>
  );
}
