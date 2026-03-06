import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => {
      const key = l.split('=')[0].trim()
      const val = l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')
      return [key, val]
    })
)

const BILL_USER_ID = '1cfef549-ae52-4824-808b-7bfafb303adc'
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data, error } = await supabase.from('agent_tasks').insert({
  user_id: BILL_USER_ID,
  title: 'Write LinkedIn article + X thread series: HBG × ToxicSkills (drop Wednesday Mar 4)',
  notes: `GOAL: Leverage the Snyk ToxicSkills research as the hook for a HeartbeatGuard content push.

TIMING:
- Mon/Tue: Draft + wait to see if OpenClaw drops an update (could add a fresh angle)
- Wednesday Mar 4: Publish LinkedIn article
- Wed-Fri: Fire X thread series (3-4 posts, spaced out)

---

LINKEDIN ARTICLE (Wednesday Mar 4)
Title options:
- "13% of AI Agent Skills Are Actively Dangerous. Here's What We Did About It."
- "The AI Skills Supply Chain Has a Malware Problem Nobody's Talking About"
- "Snyk Just Proved Why We Built HeartbeatGuard"

Structure:
1. Hook: Snyk scanned 3,984 ClawHub skills. 13.4% critical. 76 confirmed malicious payloads. 8 still live.
2. The "Delegated Compromise" concept — you're not being attacked, your agent is. And it has root access to everything.
3. What the 8 attack categories look like in the wild (use real examples from Snyk report: base64 exfil, credential reads piped to attacker URLs, memory poisoning via SOUL.md)
4. What HeartbeatGuard does about it — ToxicSkills taxonomy now built in. Show the scan output.
5. CTA: heartbeatguard.com — get your badge, know what's running on your machine

Tone: Bill's voice — seasoned exec, practical, first-person. NOT "As an AI safety researcher..." — more like "I've been building with OpenClaw for months and this caught my attention."

---

X THREAD SERIES (Wed-Fri, 3-4 posts)

Post 1 (Wednesday, drops same day as LinkedIn):
Hook post — the stat. Short, punchy. Link to LinkedIn article.
"Snyk just scanned 3,984 AI agent skills.
13% were critically dangerous.
76 were actively stealing credentials.
8 are still live right now.
This is the supply chain problem nobody's talking about. 🧵"

Post 2 (Thursday):
The "Delegated Compromise" concept — original framing, quotable.
"Traditional malware attacks you.
AI agent malware attacks your agent.
Your agent has:
- Shell access
- Your credentials
- Your email
- Your calendar
- Persistent memory that survives reboots
One bad skill. Everything exposed.
We built HeartbeatGuard to catch this."

Post 3 (Friday):
Product post — show the scan working. Screenshot of HBG output catching a malicious pattern.
"We just upgraded HeartbeatGuard with the full ToxicSkills detection taxonomy.
8 categories. 90-100% recall on known malicious skills.
Run it on your OpenClaw install:
pip install heartbeatguard
heartbeatguard --full
Know what's running on your machine."

Post 4 (optional, Friday or weekend):
Community/conversation starter — "Are you vetting your skills before installing?"

---

NOTES FOR BEACON:
- Bill's voice throughout — nearly half a century of business experience, practical, not academic
- Cite Snyk research specifically (credibility)
- heartbeatguard.com CTA in everything
- Do NOT use NYT or Guardian as sources
- Check if OpenClaw drops 2026.2.27 Mon/Tue — if so, add a line about latest release context
- Save drafts to agents/beacon/outputs/ and drop in #drafts Discord channel for Bill review`,
  status: 'todo',
  priority: 'high',
  assigned_by: 'agent',
  due_date: '2026-03-04',
  tags: ['heartbeatguard', 'content', 'linkedin', 'x-twitter', 'beacon']
}).select()

if (error) console.error('❌ Error:', error.message)
else console.log('✅ Created:', data[0].id, '—', data[0].title)
