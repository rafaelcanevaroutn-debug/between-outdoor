import SalidaMediaPage from '@/components/fotos/SalidaMediaPage'

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{salida?: string}>
}) {
  const {salida} = await searchParams
  return <SalidaMediaPage type="videos" requestedSalidaId={salida} />
}
