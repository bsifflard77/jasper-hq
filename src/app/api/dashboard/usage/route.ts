import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Rough token estimates per message (GPT-4o averages)
const AVG_TOKENS_USER = 80
const AVG_TOKENS_ASSISTANT = 280
const COST_PER_1K_INPUT = 0.0025   // gpt-4o input
const COST_PER_1K_OUTPUT = 0.01    // gpt-4o output

export async function GET() {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    // Today's messages
    const { data: todayMsgs } = await supabase
      .from('jasper_chat')
      .select('role, created_at')
      .gte('created_at', todayStart.toISOString())

    // Month messages
    const { data: monthMsgs } = await supabase
      .from('jasper_chat')
      .select('role')
      .gte('created_at', monthStart.toISOString())

    // Today stats
    const todayUser = todayMsgs?.filter(m => m.role === 'user').length ?? 0
    const todayAssistant = todayMsgs?.filter(m => m.role === 'assistant').length ?? 0
    const todayTokens = todayUser * AVG_TOKENS_USER + todayAssistant * AVG_TOKENS_ASSISTANT
    const todayCost = (todayUser * AVG_TOKENS_USER / 1000) * COST_PER_1K_INPUT +
                      (todayAssistant * AVG_TOKENS_ASSISTANT / 1000) * COST_PER_1K_OUTPUT

    // Month stats
    const monthUser = monthMsgs?.filter(m => m.role === 'user').length ?? 0
    const monthAssistant = monthMsgs?.filter(m => m.role === 'assistant').length ?? 0
    const monthTokens = monthUser * AVG_TOKENS_USER + monthAssistant * AVG_TOKENS_ASSISTANT
    const monthCost = (monthUser * AVG_TOKENS_USER / 1000) * COST_PER_1K_INPUT +
                      (monthAssistant * AVG_TOKENS_ASSISTANT / 1000) * COST_PER_1K_OUTPUT

    return NextResponse.json({
      today: {
        messages: todayUser,
        tokens: todayTokens,
        cost: todayCost,
      },
      month: {
        messages: monthUser,
        tokens: monthTokens,
        cost: monthCost,
      },
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
