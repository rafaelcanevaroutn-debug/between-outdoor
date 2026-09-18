'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

interface Props {
  salidaId: string
  className?: string
}

export default function DeleteSalidaButton({ salidaId, className = '' }: Props) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!window.confirm('¿Estás seguro de que querés borrar esta salida/viaje? Se borrará todo el contenido asociado.')) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/salidas/${salidaId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Error al borrar la salida')
      router.refresh()
    } catch (error) {
      console.error(error)
      alert('Hubo un error al borrar la salida')
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className={`p-2 rounded-full bg-white/10 hover:bg-red-500/80 text-white backdrop-blur-sm transition-colors disabled:opacity-50 ${className}`}
      title="Borrar viaje"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}
