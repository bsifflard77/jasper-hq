'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Copy, Check, Plus, Search, X, Eye, EyeOff, Trash2, Edit2,
  ExternalLink, Zap, Key, ChevronRight, FolderOpen, Wrench,
  AlertCircle, Loader2, Shield
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Credential {
  id: string
  name: string
  service: string
  entry_type: string
  project: string | null
  environment: string
  description: string | null
  dashboard_url: string | null
  created_at: string
  updated_at: string
  value?: string // only when revealed
}

interface AddForm {
  name: string
  service: string
  entry_type: string
  value: string
  project: string
  environment: string
  description: string
  dashboard_url: string
}

// ─── Smart paste detection ────────────────────────────────────────────────────

interface DetectedKey {
  service: string
  entry_type: string
  suggestedName: string
  dashboardUrl: string
  confidence: 'high' | 'medium'
}

const KEY_PATTERNS: Array<{ test: RegExp | ((s: string) => boolean); result: DetectedKey }> = [
  { test: /^sk-proj-/, result: { service: 'OpenAI', entry_type: 'api_key', suggestedName: 'OpenAI API Key', dashboardUrl: 'https://platform.openai.com/api-keys', confidence: 'high' } },
  { test: /^sk-[a-zA-Z0-9]{32,}/, result: { service: 'OpenAI', entry_type: 'api_key', suggestedName: 'OpenAI API Key', dashboardUrl: 'https://platform.openai.com/api-keys', confidence: 'medium' } },
  { test: /^sk-ant-/, result: { service: 'Anthropic', entry_type: 'api_key', suggestedName: 'Anthropic API Key', dashboardUrl: 'https://console.anthropic.com/settings/keys', confidence: 'high' } },
  { test: /^vcp_/, result: { service: 'Vercel', entry_type: 'token', suggestedName: 'Vercel Token', dashboardUrl: 'https://vercel.com/account/tokens', confidence: 'high' } },
  { test: /^ghp_/, result: { service: 'GitHub', entry_type: 'token', suggestedName: 'GitHub Personal Access Token', dashboardUrl: 'https://github.com/settings/tokens', confidence: 'high' } },
  { test: /^gho_/, result: { service: 'GitHub', entry_type: 'token', suggestedName: 'GitHub OAuth Token', dashboardUrl: 'https://github.com/settings/tokens', confidence: 'high' } },
  { test: /^rk_live_|^sk_live_/, result: { service: 'Stripe', entry_type: 'secret_key', suggestedName: 'Stripe Live Secret Key', dashboardUrl: 'https://dashboard.stripe.com/apikeys', confidence: 'high' } },
  { test: /^rk_test_|^sk_test_/, result: { service: 'Stripe', entry_type: 'secret_key', suggestedName: 'Stripe Test Secret Key', dashboardUrl: 'https://dashboard.stripe.com/test/apikeys', confidence: 'high' } },
  { test: /^pk_live_/, result: { service: 'Stripe', entry_type: 'api_key', suggestedName: 'Stripe Live Publishable Key', dashboardUrl: 'https://dashboard.stripe.com/apikeys', confidence: 'high' } },
  { test: /^pk_test_/, result: { service: 'Stripe', entry_type: 'api_key', suggestedName: 'Stripe Test Publishable Key', dashboardUrl: 'https://dashboard.stripe.com/test/apikeys', confidence: 'high' } },
  { test: /^GOCSPX-/, result: { service: 'Google', entry_type: 'secret_key', suggestedName: 'Google OAuth Client Secret', dashboardUrl: 'https://console.cloud.google.com/apis/credentials', confidence: 'high' } },
  { test: /^AIza[0-9A-Za-z_-]{35}/, result: { service: 'Google', entry_type: 'api_key', suggestedName: 'Google API Key', dashboardUrl: 'https://console.cloud.google.com/apis/credentials', confidence: 'high' } },
  { test: (s) => s.startsWith('eyJhbGci') && s.length > 100, result: { service: 'Supabase', entry_type: 'token', suggestedName: 'Supabase JWT Token', dashboardUrl: 'https://supabase.com/dashboard/project/_/settings/api', confidence: 'medium' } },
  { test: /^xai-/, result: { service: 'xAI / Grok', entry_type: 'api_key', suggestedName: 'xAI API Key', dashboardUrl: 'https://console.x.ai/', confidence: 'high' } },
  { test: /^SG\./, result: { service: 'SendGrid', entry_type: 'api_key', suggestedName: 'SendGrid API Key', dashboardUrl: 'https://app.sendgrid.com/settings/api_keys', confidence: 'high' } },
  { test: /^xoxb-/, result: { service: 'Slack', entry_type: 'token', suggestedName: 'Slack Bot Token', dashboardUrl: 'https://api.slack.com/apps', confidence: 'high' } },
  { test: /^ya29\./, result: { service: 'Google', entry_type: 'token', suggestedName: 'Google OAuth Access Token', dashboardUrl: 'https://console.cloud.google.com/apis/credentials', confidence: 'high' } },
  { test: /^AC[a-f0-9]{32}$/i, result: { service: 'Twilio', entry_type: 'api_key', suggestedName: 'Twilio Account SID', dashboardUrl: 'https://console.twilio.com/', confidence: 'high' } },
]

function detectKey(value: string): DetectedKey | null {
  const trimmed = value.trim()
  for (const { test, result } of KEY_PATTERNS) {
    if (typeof test === 'function' ? test(trimmed) : test.test(trimmed)) {
      return result
    }
  }
  return null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: AddForm = {
  name: '', service: '', entry_type: 'api_key', value: '',
  project: '', environment: 'production', description: '', dashboard_url: ''
}

const ENV_COLORS: Record<string, string> = {
  production: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
  development: 'bg-blue-900/60 text-blue-300 border-blue-700',
  staging: 'bg-yellow-900/60 text-yellow-300 border-yellow-700',
  test: 'bg-slate-700 text-slate-300 border-slate-600',
}

const TYPE_ICONS: Record<string, string> = {
  api_key: '⚡', secret_key: '🔐', token: '🎫', password: '🔑', ssh_key: '🖥️', certificate: '📜'
}

const KNOWN_PROJECTS = ['Vortxx', 'GiftHQ', 'HeartbeatGuard', 'Jasper HQ', 'Monomoy Strategies', 'OpenClaw HQ', 'Personal', 'The Vibe Entrepreneur']

function useCopy() {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [])
  return { copiedId, copy }
}

function getFaviconUrl(service: string): string | null {
  const map: Record<string, string> = {
    'OpenAI': 'https://www.google.com/s2/favicons?domain=openai.com&sz=32',
    'Anthropic': 'https://www.google.com/s2/favicons?domain=anthropic.com&sz=32',
    'Vercel': 'https://www.google.com/s2/favicons?domain=vercel.com&sz=32',
    'GitHub': 'https://www.google.com/s2/favicons?domain=github.com&sz=32',
    'Stripe': 'https://www.google.com/s2/favicons?domain=stripe.com&sz=32',
    'Google': 'https://www.google.com/s2/favicons?domain=google.com&sz=32',
    'Supabase': 'https://www.google.com/s2/favicons?domain=supabase.com&sz=32',
    'xAI / Grok': 'https://www.google.com/s2/favicons?domain=x.ai&sz=32',
    'Twilio': 'https://www.google.com/s2/favicons?domain=twilio.com&sz=32',
    'SendGrid': 'https://www.google.com/s2/favicons?domain=sendgrid.com&sz=32',
    'Slack': 'https://www.google.com/s2/favicons?domain=slack.com&sz=32',
    'n8n': 'https://www.google.com/s2/favicons?domain=n8n.io&sz=32',
    'Firecrawl': 'https://www.google.com/s2/favicons?domain=firecrawl.dev&sz=32',
  }
  return map[service] || null
}

function ServiceIcon({ service, size = 24 }: { service: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const favicon = getFaviconUrl(service)
  const colors = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-orange-600', 'bg-pink-600', 'bg-teal-600']
  const bg = colors[(service.charCodeAt(0) || 0) % colors.length]

  if (favicon && !failed) {
    return <img src={favicon} alt={service} width={size} height={size} className="rounded" onError={() => setFailed(true)} />
  }
  return (
    <div className={`${bg} rounded flex items-center justify-center text-white font-bold shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {service.charAt(0).toUpperCase()}
    </div>
  )
}

// ─── Smart Paste Modal ────────────────────────────────────────────────────────

function AddCredentialModal({ onSave, onCancel }: {
  onSave: (form: AddForm) => Promise<void>
  onCancel: () => void
}) {
  const [step, setStep] = useState<'paste' | 'fill'>('paste')
  const [pastedValue, setPastedValue] = useState('')
  const [detected, setDetected] = useState<DetectedKey | null>(null)
  const [form, setForm] = useState<AddForm>({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [showValue, setShowValue] = useState(false)

  function handlePaste(value: string) {
    setPastedValue(value)
    const d = detectKey(value)
    setDetected(d)
  }

  function handleProceed() {
    if (!pastedValue.trim()) return
    const d = detected
    setForm(f => ({
      ...f,
      value: pastedValue.trim(),
      service: d?.service || '',
      entry_type: d?.entry_type || 'api_key',
      name: d?.suggestedName || '',
      dashboard_url: d?.dashboardUrl || '',
    }))
    setStep('fill')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.value) return
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <h2 className="font-semibold text-white">{step === 'paste' ? 'Add Credential' : 'Confirm Details'}</h2>
          </div>
          <button onClick={onCancel} className="p-1 rounded hover:bg-slate-800 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        {step === 'paste' ? (
          <div className="p-5">
            <p className="text-sm text-slate-400 mb-4">
              Paste your API key or secret below. I'll detect what it is automatically.
            </p>
            <textarea
              autoFocus
              value={pastedValue}
              onChange={e => handlePaste(e.target.value)}
              onPaste={e => {
                const val = e.clipboardData.getData('text')
                setTimeout(() => handlePaste(val), 10)
              }}
              rows={3}
              placeholder="Paste your API key, secret, or token here..."
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
            />

            {/* Detection result */}
            {pastedValue && (
              <div className={`mt-3 flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                detected
                  ? 'bg-emerald-900/30 border-emerald-700 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}>
                {detected ? (
                  <>
                    <ServiceIcon service={detected.service} size={20} />
                    <div>
                      <div className="font-medium text-sm">{detected.service} — {detected.suggestedName}</div>
                      <div className="text-xs opacity-70">{detected.confidence === 'high' ? '✅ High confidence' : '⚠️ Pattern match'}</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Key className="w-4 h-4 shrink-0" />
                    <span className="text-sm">Unknown key type — you can fill in the details manually</span>
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={handleProceed}
                disabled={!pastedValue.trim()}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {detected ? `Yes, this is a ${detected.service} key →` : 'Fill in details →'}
              </button>
              <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Auto-detected banner */}
            {detected && (
              <div className="flex items-center gap-2.5 bg-emerald-900/30 border border-emerald-700 rounded-lg px-3 py-2 text-sm text-emerald-300">
                <ServiceIcon service={detected.service} size={18} />
                <span>Detected: <strong>{detected.service}</strong> {detected.suggestedName}</span>
              </div>
            )}

            {/* Name */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                placeholder="OpenAI — Vortxx Project" />
            </div>

            {/* Service + Type */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Service / Provider</label>
                <input value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  placeholder="OpenAI, Stripe..." />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Type</label>
                <select value={form.entry_type} onChange={e => setForm(f => ({ ...f, entry_type: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
                  <option value="api_key">⚡ API Key</option>
                  <option value="secret_key">🔐 Secret Key</option>
                  <option value="token">🎫 Token</option>
                  <option value="password">🔑 Password</option>
                  <option value="ssh_key">🖥️ SSH Key</option>
                </select>
              </div>
            </div>

            {/* Project + Environment */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Project</label>
                <input value={form.project} onChange={e => setForm(f => ({ ...f, project: e.target.value }))}
                  list="projects-list"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  placeholder="Vortxx, GiftHQ..." />
                <datalist id="projects-list">
                  {KNOWN_PROJECTS.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 mb-1 block">Environment</label>
                <select value={form.environment} onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500">
                  <option value="production">Production</option>
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="test">Test</option>
                </select>
              </div>
            </div>

            {/* Key value (confirm) */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Key Value</label>
              <div className="relative">
                <input type={showValue ? 'text' : 'password'} value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 pr-8 text-sm font-mono text-white focus:outline-none focus:border-violet-500"
                  required />
                <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowValue(s => !s)}>
                  {showValue ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Dashboard URL */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Dashboard URL (optional)</label>
              <input value={form.dashboard_url} onChange={e => setForm(f => ({ ...f, dashboard_url: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                placeholder="https://platform.openai.com/api-keys" />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">Description (optional)</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                placeholder="Used for Vortxx email classifier, n8n workflows..." />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving}
                className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save to Vault'}
              </button>
              <button type="button" onClick={() => setStep('paste')}
                className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 text-sm">
                ← Back
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Credential Row ───────────────────────────────────────────────────────────

function CredentialRow({ cred, onDelete }: {
  cred: Credential
  onDelete: (id: string) => void
}) {
  const { copiedId, copy } = useCopy()
  const [revealed, setRevealed] = useState(false)
  const [revealedValue, setRevealedValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleReveal() {
    if (revealedValue) {
      setRevealed(r => !r)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/credentials/${cred.id}`)
      const data = await res.json()
      setRevealedValue(data.credential?.value || null)
      setRevealed(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!revealedValue) {
      const res = await fetch(`/api/credentials/${cred.id}`)
      const data = await res.json()
      const val = data.credential?.value
      if (val) copy(val, cred.id)
    } else {
      copy(revealedValue, cred.id)
    }
  }

  const maskedDisplay = revealedValue && revealed
    ? revealedValue
    : '•'.repeat(24)

  return (
    <div className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 border-b border-slate-800 last:border-0 transition-colors">
      <ServiceIcon service={cred.service} size={28} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-white truncate">{cred.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${ENV_COLORS[cred.environment] || ENV_COLORS.production}`}>
            {cred.environment}
          </span>
          <span className="text-[10px] text-slate-500">{TYPE_ICONS[cred.entry_type] || '🔑'} {cred.entry_type.replace('_', ' ')}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {cred.project && <span className="text-xs text-violet-400">{cred.project}</span>}
          {cred.service && <span className="text-xs text-slate-500">{cred.service}</span>}
        </div>
      </div>

      {/* Masked value */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="font-mono text-xs text-slate-500 max-w-[140px] truncate">{maskedDisplay}</span>
        <button onClick={handleReveal} className="text-slate-500 hover:text-slate-300" title={revealed ? 'Hide' : 'Reveal'}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {cred.dashboard_url && (
          <a href={cred.dashboard_url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded text-slate-500 hover:text-blue-400 hover:bg-blue-900/30" title="Dashboard">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button onClick={handleCopy} className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-slate-700" title="Copy key">
          {copiedId === cred.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => { if (confirm(`Delete "${cred.name}"?`)) onDelete(cred.id) }}
          className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-900/30" title="Delete">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ─── Main CredentialsTab ──────────────────────────────────────────────────────

export function CredentialsTab() {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/credentials')
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setCredentials(data.credentials || [])
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(form: AddForm) {
    const res = await fetch('/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    setShowAdd(false)
    await load()
  }

  async function handleDelete(id: string) {
    await fetch(`/api/credentials/${id}`, { method: 'DELETE' })
    setCredentials(prev => prev.filter(c => c.id !== id))
  }

  // Get unique projects
  const projects = ['all', ...new Set(credentials.map(c => c.project).filter(Boolean) as string[]).values()]

  // Group by project
  const filtered = credentials.filter(c => {
    const matchesProject = projectFilter === 'all' || c.project === projectFilter
    if (!matchesProject) return false
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.service.toLowerCase().includes(q) || (c.project || '').toLowerCase().includes(q)
  })

  // Group by service
  const byService: Record<string, Credential[]> = {}
  for (const c of filtered) {
    const key = c.service || 'Other'
    if (!byService[key]) byService[key] = []
    byService[key].push(c)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔐</span>
          <div>
            <h2 className="text-2xl font-bold text-white">Credentials Manager</h2>
            <p className="text-sm text-slate-400">{credentials.length} credentials secured · Paste any key to auto-detect</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Credential
        </button>
      </div>

      {/* Setup note if no table */}
      {error && error.includes('does not exist') && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4 text-sm text-amber-300">
          <div className="flex items-center gap-2 font-medium mb-1"><AlertCircle className="w-4 h-4" /> Setup required</div>
          <p>Run this SQL in your Supabase dashboard to create the credentials table:</p>
          <pre className="mt-2 text-xs bg-black/40 rounded p-2 overflow-x-auto">
{`CREATE TABLE IF NOT EXISTS jasper_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, service TEXT DEFAULT '',
  entry_type TEXT DEFAULT 'api_key', value TEXT NOT NULL,
  project TEXT, environment TEXT DEFAULT 'production',
  description TEXT, dashboard_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);`}
          </pre>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search credentials..."
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500" />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-slate-500" /></button>}
        </div>
        <div className="flex gap-1 flex-wrap">
          {projects.map(p => (
            <button key={p} onClick={() => setProjectFilter(p)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${projectFilter === p ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'}`}>
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading credentials...
        </div>
      ) : credentials.length === 0 && !error ? (
        <div className="text-center py-16 text-slate-500">
          <Key className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium text-slate-400">No credentials yet</p>
          <p className="text-sm mt-1 mb-5">Add your first API key — paste it in and I'll detect it automatically</p>
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Add First Credential
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-slate-500">No results for "{search}"</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(byService).sort(([a], [b]) => a.localeCompare(b)).map(([service, creds]) => (
            <div key={service} className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-slate-800/50 border-b border-slate-700">
                <ServiceIcon service={service} size={18} />
                <span className="font-semibold text-sm text-slate-200">{service}</span>
                <span className="text-xs text-slate-500 ml-auto">{creds.length} {creds.length === 1 ? 'key' : 'keys'}</span>
              </div>
              {creds.map(c => <CredentialRow key={c.id} cred={c} onDelete={handleDelete} />)}
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddCredentialModal onSave={handleSave} onCancel={() => setShowAdd(false)} />}
    </div>
  )
}
