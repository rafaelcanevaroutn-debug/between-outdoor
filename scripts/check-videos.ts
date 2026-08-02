import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=')
  if (key && val) acc[key.trim()] = val.join('=').trim()
  return acc
}, {} as Record<string, string>)

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL']!,
  env['SUPABASE_SERVICE_ROLE_KEY']!
)

async function main() {
  const { data, error } = await supabase
    .from('contenido_generado')
    .select('id, formato, titulo, render_folder_id, created_at')
    .eq('formato', 'video')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Últimos 5 videos generados:')
  console.table(data)
}

main()
