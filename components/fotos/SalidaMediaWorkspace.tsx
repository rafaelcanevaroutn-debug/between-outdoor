'use client'

import {usePathname, useRouter} from 'next/navigation'
import Link from 'next/link'
import FotosGallery from '@/components/fotos/FotosGallery'

interface SalidaOption {
  id: string
  nombre: string
  destino: string
  fechaInicio: string | null
  estado: string
}

interface Props {
  type: 'fotos' | 'videos'
  salidas: SalidaOption[]
  selectedSalidaId: string | null
  selectedSalidaName: string | null
  selectedDestino: string | null
  rootFolderId: string | null
  suggestedTopics: string[]
}

function salidaLabel(salida: SalidaOption): string {
  const date = salida.fechaInicio
    ? new Intl.DateTimeFormat('es-AR', {month: 'short', year: 'numeric', timeZone: 'UTC'}).format(new Date(salida.fechaInicio))
    : null
  return [salida.nombre, salida.destino !== salida.nombre ? salida.destino : null, date].filter(Boolean).join(' · ')
}

export default function SalidaMediaWorkspace({
  type,
  salidas,
  selectedSalidaId,
  selectedSalidaName,
  selectedDestino,
  rootFolderId,
  suggestedTopics,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const isVideo = type === 'videos'

  if (salidas.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--linea)] bg-[var(--nieve)] px-6 py-12 text-center">
        <h1 className="m-0 text-xl font-semibold text-[var(--tinta)]">Primero creá una salida</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--piedra)]">
          El material se organiza alrededor de una salida para que Between sepa qué puede mostrar y qué puede mencionar.
        </p>
        <Link href="/salidas/nueva" className="mt-5 inline-flex rounded-xl bg-[var(--cardon)] px-4 py-2.5 text-sm font-semibold text-white">
          Crear una salida
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-[var(--linea)] bg-[var(--nieve)] p-5 md:p-6">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] md:items-end">
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[.12em] text-[var(--cardon)]">Material para generar contenido</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-.025em] text-[var(--tinta)]">
              {isVideo ? '¿Para qué salida son estos videos?' : '¿Para qué salida son estas imágenes?'}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--piedra)]">
              Elegí la salida primero. Así cada archivo queda relacionado con el viaje correcto y el contenido no mezcla destinos ni experiencias.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold text-[var(--tinta)]">Salida seleccionada</span>
            <select
              value={selectedSalidaId ?? ''}
              onChange={event => {
                const query = new URLSearchParams({salida: event.target.value})
                router.push(`${pathname}?${query.toString()}`)
              }}
              className="h-12 w-full rounded-xl border border-[var(--linea)] bg-[var(--blanco-piedra)] px-4 text-sm font-semibold text-[var(--tinta)] outline-none focus:border-[var(--cardon)]"
            >
              {salidas.map(salida => (
                <option key={salida.id} value={salida.id}>{salidaLabel(salida)}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {rootFolderId && selectedSalidaId && selectedDestino ? (
        <section className="rounded-2xl border border-[var(--linea)] bg-[var(--nieve)] p-4 md:p-6">
          <div className="mb-6 flex flex-col gap-3 border-b border-[var(--linea)] pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="m-0 text-xs font-bold uppercase tracking-[.1em] text-[var(--piedra)]">Organizando material de</p>
              <h2 className="mt-1 text-xl font-semibold text-[var(--tinta)]">{selectedSalidaName}</h2>
              <p className="mt-1 text-sm text-[var(--piedra)]">Destino: {selectedDestino}</p>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-[var(--cardon-tenue)] px-3 py-2 text-xs font-semibold text-[var(--cardon)]">
              <span className="h-2 w-2 rounded-full bg-[var(--cardon)]" />
              Todo lo que cargues acá pertenece a esta salida
            </div>
          </div>

          <FotosGallery
            key={`${type}:${selectedSalidaId}:${rootFolderId}`}
            rootFolderId={rootFolderId}
            rootLabel={selectedDestino}
            type={type}
            scopedSalida={{
              id: selectedSalidaId,
              nombre: selectedSalidaName ?? selectedDestino,
              destino: selectedDestino,
              suggestedTopics,
            }}
          />
        </section>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-900">
          No pudimos preparar el espacio de esta salida. Recargá la página para reintentar.
        </div>
      )}
    </div>
  )
}
