import { describe, expect, test } from 'vitest';
import { digitoVerificador, formatearRut, rutValido } from './rut.js';
import { formatoFecha, formatoPesos } from './formato.js';
import { contrasenaValida, REQUISITOS } from './contrasena.js';
import { enlaceCorreo, enlaceTelefono, enlaceWhatsapp } from './contacto.js';

describe('RUT', () => {
  test('calcula el dígito verificador con módulo 11', () => {
    expect(digitoVerificador('12345678')).toBe('5');
    expect(digitoVerificador('11111111')).toBe('1');
    expect(digitoVerificador('10000013')).toBe('K');
  });

  test('pone el guion mientras se escribe y limpia lo que no sirve', () => {
    expect(formatearRut('123456785')).toBe('12345678-5');
    expect(formatearRut('12.345.678-5')).toBe('12345678-5');
    expect(formatearRut('1000001k')).toBe('1000001-K');
    expect(formatearRut('1')).toBe('1');
  });

  test('valida RUT correctos y rechaza dígitos verificadores erróneos', () => {
    expect(rutValido('12345678-5')).toBe(true);
    expect(rutValido('12345678-4')).toBe(false);
    expect(rutValido('123')).toBe(false);
  });
});

describe('formatos', () => {
  test('pesos chilenos sin decimales', () => {
    expect(formatoPesos(20000)).toMatch(/^\$\s?20\.000$/);
  });

  test('fecha DD-MM-YYYY sin desfase de zona horaria', () => {
    expect(formatoFecha('2026-11-05')).toBe('05-11-2026');
    expect(formatoFecha(null)).toBe('—');
  });
});

describe('contraseña (mismas reglas que el backend)', () => {
  test('exige 8 caracteres con letras y números', () => {
    expect(contrasenaValida('Solar2026')).toBe(true);
    expect(contrasenaValida('Sol2026')).toBe(false);
    expect(contrasenaValida('solamenteletras')).toBe(false);
    expect(contrasenaValida('12345678')).toBe(false);
    expect(contrasenaValida('a1'.repeat(65))).toBe(false);
  });

  test('cada requisito se informa por separado', () => {
    expect(REQUISITOS.map((r) => r.cumple('abc'))).toEqual([false, false]);
    expect(REQUISITOS.map((r) => r.cumple('abcdefgh'))).toEqual([true, false]);
  });
});

describe('enlaces de contacto', () => {
  test('WhatsApp lleva el mensaje codificado', () => {
    const url = enlaceWhatsapp('Hola ENINTI, necesito ayuda');
    expect(url).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(url.split('text=')[1])).toBe('Hola ENINTI, necesito ayuda');
  });

  test('teléfono sin espacios y correo con asunto', () => {
    expect(enlaceTelefono()).toMatch(/^tel:\+\d+$/);
    expect(enlaceCorreo('Consulta sobre pagos')).toMatch(/^mailto:.+\?subject=Consulta%20sobre%20pagos$/);
  });
});
