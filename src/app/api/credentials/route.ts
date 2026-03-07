import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('jasper_credentials')
      .select('id, name, service, entry_type, project, environment, description, dashboard_url, created_at, updated_at')
      // NOTE: value (the actual key) is deliberately excluded from GET list
      .order('service', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Credentials fetch error:', error)
      return NextResponse.json({ credentials: [], error: error.message }, { status: 200 })
    }
    return NextResponse.json({ credentials: data || [] })
  } catch (err) {
    return NextResponse.json({ credentials: [], error: String(err) })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, service, entry_type, value, project, environment, description, dashboard_url } = body

    if (!name || !value) {
      return NextResponse.json({ error: 'name and value are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('jasper_credentials')
      .insert({
        name,
        service: service || '',
        entry_type: entry_type || 'api_key',
        value,
        project: project || null,
        environment: environment || 'production',
        description: description || null,
        dashboard_url: dashboard_url || null,
      })
      .select('id, name, service, entry_type, project, environment, description, dashboard_url, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ credential: data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
