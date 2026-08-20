const DATE_SLOT = /(<span class="date" data-slot="salida_([1-4])_fecha"><\/span>)/gu

/** Evoluciona el Molde 4 aprobado sin reinterpretar su dirección visual. */
export function addPricesToApprovedMolde4(html: string): string {
  if (/data-slot="salida_1_precio"/u.test(html)) return html
  if (!/grid-template-columns:\s*1fr\s+250px\s*;/u.test(html)) {
    throw new Error('El Molde 4 fuente no tiene la grilla aprobada esperada')
  }

  let upgraded = html.replace(/grid-template-columns:\s*1fr\s+250px\s*;/u, 'grid-template-columns: 1fr 190px 175px;')
  if (!/\.date\s*\{[^}]*\}/u.test(upgraded)) throw new Error('El Molde 4 fuente no tiene estilo de fecha')
  upgraded = upgraded.replace(/(\.date\s*\{[^}]*\})/u, `$1
.price {
  color: var(--brand-primary);
  font-size: 18px;
  font-weight: 800;
  letter-spacing: .02em;
  text-align: right;
}`)

  let inserted = 0
  upgraded = upgraded.replace(DATE_SLOT, (date, _whole, index: string) => {
    inserted += 1
    return `${date}<span class="price" data-slot="salida_${index}_precio"></span>`
  })
  if (inserted !== 4) throw new Error(`Se esperaban 4 filas de agenda y se encontraron ${inserted}`)
  return upgraded
}
