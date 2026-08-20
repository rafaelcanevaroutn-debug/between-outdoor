const LOGO_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
} as const

export const MAX_LOGO_BYTES = 2_000_000

export function validateLogoUpload(bytes: Uint8Array, mime: string): {extension: string; contentType: keyof typeof LOGO_TYPES} {
  const contentType = mime.toLowerCase() as keyof typeof LOGO_TYPES
  if (!(contentType in LOGO_TYPES)) throw new Error('Usá un logo PNG, JPG o WebP')
  if (bytes.length < 12 || bytes.length > MAX_LOGO_BYTES) throw new Error('El logo debe pesar menos de 2 MB')

  const png = contentType === 'image/png' && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)
  const jpeg = contentType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const webp = contentType === 'image/webp'
    && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
    && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (!png && !jpeg && !webp) throw new Error('El archivo no coincide con el formato de imagen declarado')

  return {extension: LOGO_TYPES[contentType], contentType}
}
