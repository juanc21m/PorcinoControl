/**
 * Utilidades CSV sin dependencias.
 *
 * - `toCSV` serializa con comillas seguras (maneja comas, comillas y saltos).
 * - `parseCSV` parsea respetando campos entrecomillados.
 * - `downloadCSV` dispara la descarga (con BOM para que Excel respete acentos).
 *
 * El mismo conjunto de columnas se usa para exportar e importar, de modo que un
 * archivo descargado pueda editarse en Excel y volver a subirse sin cambios.
 */

type Cell = string | number | null | undefined;

function escapeCell(v: Cell): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(headers: string[], rows: Cell[][]): string {
  const lines = [headers.map(escapeCell).join(',')];
  for (const r of rows) lines.push(r.map(escapeCell).join(','));
  return lines.join('\r\n');
}

export function parseCSV(text: string): Record<string, string>[] {
  const t = text.replace(/^﻿/, ''); // quita BOM
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQ = false;

  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') {
        if (t[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      cur.push(field); field = '';
    } else if (c === '\n') {
      cur.push(field); rows.push(cur); cur = []; field = '';
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  if (!rows.length) return [];

  const headers = rows[0].map(h => h.trim());
  return rows.slice(1)
    .filter(r => r.some(c => c.trim() !== ''))
    .map(r => {
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
      return obj;
    });
}

export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
