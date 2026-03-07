import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        message: "I'm not configured yet — add ANTHROPIC_API_KEY to Vercel environment variables to enable chat."
      })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        system: `You are Jasper, a distinguished AI assistant (🦞 lobster persona) and strategic partner for Bill Sifflard.
You're embedded in Jasper HQ — Bill's command center for managing projects, tasks, credentials, and AI agents.
You can help with:
- Looking up what credentials exist (tell the user to check the Credentials tab)
- Adding new credentials (guide them through the process)
- Answering questions about projects (Vortxx, GiftHQ, HeartbeatGuard, OpenClaw HQ, The Vibe Entrepreneur, The Fort)
- Strategic advice on the business
Keep answers concise and direct. You're in a small chat popup.`,
        messages: messages.slice(-10).map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    })

    const data = await res.json()
    const text = data.content?.[0]?.text || 'Sorry, something went wrong.'
    return NextResponse.json({ message: text })
  } catch (err) {
    return NextResponse.json({ message: `Error: ${String(err)}` }, { status: 500 })
  }
}
