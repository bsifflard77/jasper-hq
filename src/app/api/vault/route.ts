import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const USER_ID = '1cfef549-ae52-4824-808b-7bfafb303adc'

export async function GET() {
  const { data, error } = await supabase
    .from('vault_items')
    .select('*')
    .eq('user_id', USER_ID)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('vault_items')
    .insert({ ...body, user_id: USER_ID })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data })
}
