import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  const { data: slots } = await supabase.from('contenido_generado').select('id, user_id, formato, slides_data, created_at, scheduled_at, batch_run_id').order('created_at', { ascending: false }).limit(20);
  console.log('Last 20 pieces:');
  let count = 0;
  slots?.forEach(s => {
    count++;
    console.log(`${count}. User: ${s.user_id} | ${s.formato} | ${s.created_at} | Slot: ${s.slides_data?.slot_index ?? 'none'} | ID: ${s.id}`);
  });
}
run();
