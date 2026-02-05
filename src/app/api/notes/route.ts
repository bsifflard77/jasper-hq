import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''
const userId = process.env.USER_ID || ''

export async function POST(request: Request) {
  if (!supabaseUrl || !supabaseKey || !userId) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    const { content } = await request.json()
    
    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('agent_notes')
      .insert({
        user_id: userId,
        content: content.trim(),
        is_read: false,
        is_processed: false,
        tags: [],
        metadata: {},
      })
      .select()
      .single()

    if (error) {
      // If agent_notes table doesn't exist, fall back to agent_activities
      const { data: actData, error: actError } = await supabase
        .from('agent_activities')
        .insert({
          user_id: userId,
          title: 'Note from Bill',
          description: content.trim(),
          activity_type: 'note',
          category: 'communication',
          importance: 'medium',
          is_pinned: false,
          tags: ['note', 'from-dashboard'],
          metadata: { source: 'jasper-hq' },
        })
        .select()
        .single()

      if (actError) {
        return NextResponse.json({ error: actError.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, data: actData, method: 'activity' })
    }

    return NextResponse.json({ ok: true, data, method: 'note' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
