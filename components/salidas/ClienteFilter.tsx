'use client'

import { useRouter } from 'next/navigation'

interface Cliente {
  id:           string
  full_name:    string | null
  company_name: string | null
}

interface Props {
  clientes:        Cliente[]
  selectedCliente: string | null
}

export default function ClienteFilter({ clientes, selectedCliente }: Props) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (val) {
      router.push(`/salidas?cliente=${val}`)
    } else {
      router.push('/salidas')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 13, color: '#7E9286', whiteSpace: 'nowrap' }}>Cliente:</span>
      <select
        value={selectedCliente ?? ''}
        onChange={handleChange}
        style={{
          appearance: 'none',
          backgroundColor: '#0D130E',
          border: '1px solid rgba(255,255,255,.1)',
          borderRadius: 10,
          color: selectedCliente ? '#EAF2EC' : '#7E9286',
          fontSize: 13,
          fontWeight: 500,
          padding: '7px 32px 7px 12px',
          cursor: 'pointer',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 20 20' fill='none' stroke='%237E9286' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M5 8l5 5 5-5'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          minWidth: 180,
        }}
      >
        <option value="">Todos los clientes</option>
        {clientes.map(c => (
          <option key={c.id} value={c.id}>
            {c.company_name || c.full_name || c.id}
          </option>
        ))}
      </select>
    </div>
  )
}
