import SalidaMediaPage from '@/components/fotos/SalidaMediaPage'

export default async function FotosPage({
  searchParams,
}: {
  searchParams: Promise<{salida?: string}>
}) {
  const {salida} = await searchParams
  return <SalidaMediaPage type="fotos" requestedSalidaId={salida} />
}
