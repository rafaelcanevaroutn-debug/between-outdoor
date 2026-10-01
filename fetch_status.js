const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://khmdhgivxnzvnftsdvsb.supabase.co/';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtobWRoZ2l2eG56dm5mdHNkdnNiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTcyMjcxOCwiZXhwIjoyMDk3Mjk4NzE4fQ.V8QZjU6Ky4xakMyLoEpdbGq7oGZOMVqHXfZllUEFDWc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('contenido_generado')
    .select('id, formato, render_status, generation_metadata')
    .in('render_status', ['dispatching', 'rendering'])
    .order('updated_at', { ascending: false })
    .limit(10);
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

run();
