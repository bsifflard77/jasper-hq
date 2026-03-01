const { createClient } = require('@supabase/supabase-js');
const url = 'https://cymfsifrjcisncnzywbd.supabase.co';
const key = process.env.SB_KEY;
const sb = createClient(url, key);
async function run() {
  // Find the latest user message that has no assistant response after it
  const { data: msgs } = await sb.from('jasper_chat').select('*').eq('role', 'user').order('created_at', { ascending: false }).limit(1);
  if (!msgs || msgs.length === 0) { console.log('NO_PENDING'); return; }
  const lastUserMsg = msgs[0];
  // Check if there's already an assistant response after this message
  const { data: responses } = await sb.from('jasper_chat').select('id').eq('role', 'assistant').gt('created_at', lastUserMsg.created_at).limit(1);
  if (responses && responses.length > 0) { console.log('NO_PENDING'); return; }
  // Check message age - only process if < 5 minutes old
  const ageMs = Date.now() - new Date(lastUserMsg.created_at).getTime();
  if (ageMs > 300000) { console.log('NO_PENDING'); return; }
  console.log('PENDING:' + lastUserMsg.id + ':' + lastUserMsg.content);
}
run().catch(e => { console.error(e); process.exit(1); });
