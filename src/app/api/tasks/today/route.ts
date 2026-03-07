import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const USER_ID = process.env.USER_ID || '1cfef549-ae52-4824-808b-7bfafb303adc'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('agent_tasks')
      .select('id, title, status, priority, agent, tags')
      .eq('user_id', USER_ID)
      .neq('status', 'completed')
      .order('priority', { ascending: true })
      .order('updated_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ tasks: data || [] })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
