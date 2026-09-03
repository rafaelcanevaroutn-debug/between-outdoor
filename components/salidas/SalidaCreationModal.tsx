'use client'

import { CheckCircle2, Loader2 } from 'lucide-react'

export type CreationModalStatus = 'idle' | 'creating' | 'success'

interface SalidaCreationModalProps {
  status: CreationModalStatus
  isEditing?: boolean
}

export default function SalidaCreationModal({ status, isEditing = false }: SalidaCreationModalProps) {
  if (status === 'idle') return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="creation-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-[400px] rounded-3xl bg-white p-8 sm:p-10 text-center shadow-2xl border border-[var(--linea)] animate-in zoom-in-95 duration-200">
        {status === 'creating' ? (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--cardon-tenue)] text-[var(--cardon)] shadow-inner">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h3
              id="creation-modal-title"
              className="text-2xl font-bold text-[var(--tinta)] tracking-tight mb-2"
              style={{ fontFamily: 'var(--font-bricolage), sans-serif' }}
            >
              {isEditing ? 'Guardando cambios...' : 'Creando salida...'}
            </h3>
            <p className="text-sm text-[var(--piedra)] leading-relaxed">
              {isEditing 
                ? 'Estamos guardando los cambios de tu salida.'
                : 'Estamos configurando tu salida y vinculando los recursos en el sistema.'}
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-inner">
              <CheckCircle2 className="h-8 w-8 stroke-[2.2]" />
            </div>
            <h3
              id="creation-modal-title"
              className="text-2xl font-bold text-[var(--tinta)] tracking-tight mb-2"
              style={{ fontFamily: 'var(--font-bricolage), sans-serif' }}
            >
              {isEditing ? '¡Cambios guardados con éxito!' : '¡Salida creada con éxito!'}
            </h3>
            <p className="text-sm text-[var(--piedra)] leading-relaxed">
              Redirigiendo a tus salidas...
            </p>
          </>
        )}
      </div>
    </div>
  )
}
