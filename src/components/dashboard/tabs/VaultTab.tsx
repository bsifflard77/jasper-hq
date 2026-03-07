'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
type EntryType   = 'password' | 'api_key' | 'secret_key' | 'token' | 'ssh_key' | 'certificate'
type Environment = 'production' | 'staging' | 'development' | 'test'
type SortMode    = 'popular' | 'recent' | 'az'
type VaultView   = 'passwords' | 'api_keys'

export interface VaultItem {
  id: string
  type: EntryType
  name: string
  username: string | null
  password: string | null
  url: string | null
  provider: string | null
  environment: Environment | null
  project: string | null
  tool: string | null
  notes: string | null
  is_favorite: boolean
  category: string
  created_at: string
  updated_at: string
}

// ── API Health service definitions ────────────────────────────────────────────
interface ServiceHealth {
  id: string
  name: string
  icon: string
  checkUrl: string
  status: 'checking' | 'ok' | 'warn' | 'error'
  latencyMs?: number
}

const HEALTH_SERVICES: Omit<ServiceHealth, 'status'>[] = [
  { id: 'openai',    name: 'OpenAI',    icon: '🤖', checkUrl: 'https://status.openai.com/api/v2/status.json' },
  { id: 'anthropic', name: 'Anthropic', icon: '🧠', checkUrl: 'https://status.anthropic.com/api/v2/status.json' },
  { id: 'supabase',  name: 'Supabase',  icon: '🗄️', checkUrl: 'https://status.supabase.com/api/v2/status.json' },
  { id: 'vercel',    name: 'Vercel',    icon: '▲',  checkUrl: 'https://www.vercel-status.com/api/v2/status.json' },
  { id: 'stripe',    name: 'Stripe',    icon: '💳', checkUrl: 'https://status.stripe.com/api/v2/status.json' },
  { id: 'github',    name: 'GitHub',    icon: '🐙', checkUrl: 'https://kctbh9vrtdwd.statuspage.io/api/v2/status.json' },
]

// ── Constants ─────────────────────────────────────────────────────────────────
const ENTRY_TYPES: { value: EntryType; label: string; icon: string; color: string }[] = [
  { value: 'password',    label: 'Password',   icon: '🔑', color: '#10b981' },
  { value: 'api_key',     label: 'API Key',    icon: '⚡', color: '#f59e0b' },
  { value: 'secret_key',  label: 'Secret Key', icon: '🔒', color: '#ef4444' },
  { value: 'token',       label: 'Token',      icon: '🪙', color: '#3b82f6' },
  { value: 'ssh_key',     label: 'SSH Key',    icon: '💻', color: '#8b5cf6' },
  { value: 'certificate', label: 'Certificate',icon: '📜', color: '#6366f1' },
]

const ENVIRONMENTS: { value: Environment; label: string }[] = [
  { value: 'production',  label: 'Production' },
  { value: 'staging',     label: 'Staging' },
  { value: 'development', label: 'Development' },
  { value: 'test',        label: 'Test' },
]

const PROJECTS   = ['No project','Jasper HQ','Vortxx','YTidy','HeartbeatGuard','GiftHQ','The Fort','Monomoy Site','OpenClaw HQ','TVE Book','General']
const TOOLS      = ['No tool','n8n','OpenClaw','Supabase','Vercel','GitHub','Stripe','Discord','Google Cloud','AWS']
const PW_CATS    = ['personal','finance','work','social','dev','general']

// ── Helpers ───────────────────────────────────────────────────────────────────
function strengthOf(pw: string | null): { label: string; color: string } {
  if (!pw) return { label: 'None', color: '#64748b' }
  let s = 0
  if (pw.length >= 12) s++
  if (pw.length >= 20) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { label: 'Weak',   color: '#ef4444' }
  if (s <= 2) return { label: 'Fair',   color: '#f59e0b' }
  if (s <= 3) return { label: 'Good',   color: '#f59e0b' }
  return           { label: 'Strong', color: '#10b981' }
}

function genPassword(length = 20, symbols = true): string {
  const base  = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const syms  = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const chars = symbols ? base + syms : base
  const arr   = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

// ── Favicon ───────────────────────────────────────────────────────────────────
function Favicon({ url, name }: { url: string | null; name: string }) {
  const [ok, setOk] = useState(!!url)
  const letter = (name[0] ?? '?').toUpperCase()
  const hue    = ((name.charCodeAt(0) ?? 0) * 37) % 360
  if (!url || !ok) return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
      style={{ background: `hsl(${hue},55%,38%)` }}>{letter}</div>
  )
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
      style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)' }}>
      <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`}
        alt="" className="w-5 h-5" onError={() => setOk(false)} />
    </div>
  )
}

// ── CopyBtn ───────────────────────────────────────────────────────────────────
function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={async e => { e.stopPropagation(); await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      title={label ?? 'Copy'}
      className="p-1.5 rounded-lg transition-all"
      style={{ color: copied ? '#10b981' : 'var(--jhq-text3)', background: copied ? 'rgba(16,185,129,0.1)' : 'transparent' }}>
      {copied ? '✓' : '⎘'}
    </button>
  )
}

// ── Password Generator popover button ─────────────────────────────────────────
function GeneratorPopover({ onUse }: { onUse: (v: string) => void }) {
  const [open,    setOpen]    = useState(false)
  const [length,  setLength]  = useState(20)
  const [symbols, setSymbols] = useState(true)
  const [value,   setValue]   = useState(() => genPassword(20, true))
  const [copied,  setCopied]  = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const regen = useCallback(() => setValue(genPassword(length, symbols)), [length, symbols])
  useEffect(() => { if (open) regen() }, [open, regen])

  // close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { label: sLabel, color: sColor } = strengthOf(value)

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
        style={{ background: open ? 'rgba(16,185,129,0.12)' : 'var(--jhq-surface2)', borderColor: open ? 'var(--jhq-accent)' : 'var(--jhq-border)', color: 'var(--jhq-accent)' }}>
        ⚡ Generator
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-2 right-0 w-80 rounded-2xl border shadow-2xl p-4"
          style={{ background: 'var(--jhq-bg)', borderColor: 'var(--jhq-border)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--jhq-text)' }}>Password Generator</span>
            <span className="text-xs font-semibold" style={{ color: sColor }}>✓ {sLabel}</span>
          </div>

          {/* Generated value */}
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 text-xs font-mono px-3 py-2 rounded-xl truncate border"
              style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-accent2)' }}>
              {value}
            </code>
            <button onClick={regen} className="p-2 rounded-lg border transition-all"
              style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }} title="Regenerate">
              🔄
            </button>
          </div>

          {/* Options */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs shrink-0" style={{ color: 'var(--jhq-text2)' }}>Length: {length}</span>
              <input type="range" min={8} max={64} value={length} onChange={e => setLength(+e.target.value)} className="flex-1 accent-emerald-500" />
            </div>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--jhq-text2)' }}>
              <input type="checkbox" checked={symbols} onChange={e => setSymbols(e.target.checked)} className="accent-emerald-500" />
              Symbols
            </label>
          </div>

          <div className="flex gap-2">
            <button onClick={async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="flex-1 py-2 rounded-xl text-xs font-medium border transition-all"
              style={{ background: copied ? 'rgba(16,185,129,0.15)' : 'var(--jhq-surface2)', borderColor: copied ? 'rgba(16,185,129,0.4)' : 'var(--jhq-border)', color: copied ? '#10b981' : 'var(--jhq-text2)' }}>
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>
            <button onClick={() => { onUse(value); setOpen(false) }}
              className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
              style={{ background: 'var(--jhq-accent)' }}>
              Use This
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── API Health strip ──────────────────────────────────────────────────────────
function ApiHealthStrip({ vaultItems, onUpdateKey }: { vaultItems: VaultItem[]; onUpdateKey: (item: Partial<VaultItem>) => void }) {
  const [services, setServices] = useState<ServiceHealth[]>(
    HEALTH_SERVICES.map(s => ({ ...s, status: 'checking' as const }))
  )
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [checking, setChecking] = useState(false)

  const check = useCallback(async () => {
    setChecking(true)
    const results = await Promise.all(
      HEALTH_SERVICES.map(async svc => {
        const t0 = Date.now()
        try {
          const res = await fetch(svc.checkUrl, { signal: AbortSignal.timeout(6000) })
          const json = await res.json()
          const indicator = json?.status?.indicator ?? json?.status ?? 'none'
          const latencyMs = Date.now() - t0
          const status = indicator === 'none' || indicator === 'operational' ? 'ok'
            : indicator === 'minor' ? 'warn' : 'error'
          return { ...svc, status, latencyMs } as ServiceHealth
        } catch {
          return { ...svc, status: 'error' as const, latencyMs: Date.now() - t0 }
        }
      })
    )
    setServices(results)
    setLastChecked(new Date())
    setChecking(false)
  }, [])

  useEffect(() => { check() }, [check])

  const statusIcon = (s: ServiceHealth['status']) =>
    s === 'checking' ? '⋯' : s === 'ok' ? '✅' : s === 'warn' ? '⚠️' : '❌'
  const statusColor = (s: ServiceHealth['status']) =>
    s === 'ok' ? '#10b981' : s === 'warn' ? '#f59e0b' : s === 'error' ? '#ef4444' : 'var(--jhq-text3)'

  const errorServices = services.filter(s => s.status === 'error' || s.status === 'warn')

  return (
    <div className="rounded-2xl border mb-6 overflow-hidden" style={{ borderColor: 'var(--jhq-border)', background: 'var(--jhq-surface)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: 'var(--jhq-border)', background: 'var(--jhq-surface2)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: 'var(--jhq-text)' }}>🔌 API Health</span>
          {errorServices.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
              {errorServices.length} issue{errorServices.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastChecked && (
            <span className="text-xs" style={{ color: 'var(--jhq-text3)' }}>
              Checked {lastChecked.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={check} disabled={checking}
            className="text-xs px-2.5 py-1 rounded-lg border transition-all"
            style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)', opacity: checking ? 0.5 : 1 }}>
            {checking ? '⋯' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 divide-x divide-y" style={{ borderColor: 'var(--jhq-border2)' }}>
        {services.map(svc => {
          const vaultEntry = vaultItems.find(v =>
            v.name.toLowerCase().includes(svc.id) || v.provider?.toLowerCase().includes(svc.id)
          )
          return (
            <div key={svc.id} className="flex flex-col items-center gap-1 px-3 py-2.5">
              <div className="flex items-center gap-1">
                <span className="text-base">{svc.icon}</span>
                <span className="text-lg leading-none">{statusIcon(svc.status)}</span>
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--jhq-text)' }}>{svc.name}</span>
              {svc.latencyMs && svc.status !== 'checking' && (
                <span className="text-[10px]" style={{ color: statusColor(svc.status) }}>
                  {svc.status === 'ok' ? `${svc.latencyMs}ms` : svc.status.toUpperCase()}
                </span>
              )}
              {(svc.status === 'error' || svc.status === 'warn') && vaultEntry && (
                <button
                  onClick={() => onUpdateKey(vaultEntry)}
                  className="text-[10px] px-1.5 py-0.5 rounded border mt-0.5"
                  style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>
                  Update Key
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Quick Action Buttons ──────────────────────────────────────────────────────
function QuickActions({ onAdd }: { onAdd: (type: EntryType) => void }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
      {ENTRY_TYPES.map(t => (
        <button
          key={t.value}
          onClick={() => onAdd(t.value)}
          className="flex flex-col items-center gap-2 py-4 px-2 rounded-xl border font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: `${t.color}10`,
            borderColor: `${t.color}30`,
            color: t.color,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${t.color}20`; (e.currentTarget as HTMLElement).style.borderColor = `${t.color}60` }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${t.color}10`; (e.currentTarget as HTMLElement).style.borderColor = `${t.color}30` }}
        >
          <span className="text-2xl">{t.icon}</span>
          <span className="text-xs">{t.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Password row ──────────────────────────────────────────────────────────────
function PasswordRow({ item, onEdit, onDelete, onToggleFav }: { item: VaultItem; onEdit: () => void; onDelete: () => void; onToggleFav: () => void }) {
  const { label: sLabel, color: sColor } = strengthOf(item.password)
  const domain = item.url ? item.url.replace(/^https?:\/\//, '').split('/')[0] : null
  return (
    <tr className="group border-b cursor-pointer transition-colors hover:opacity-90" style={{ borderColor: 'var(--jhq-border2)' }} onClick={onEdit}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Favicon url={item.url} name={item.name} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--jhq-text)' }}>{item.name}</span>
              {item.is_favorite && <span>⭐</span>}
            </div>
            <span className="text-xs capitalize" style={{ color: 'var(--jhq-text3)' }}>{item.category}</span>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm" style={{ color: item.username ? 'var(--jhq-text2)' : 'var(--jhq-text3)' }}>{item.username ?? '—'}</td>
      <td className="py-3 px-4"><span className="text-xs font-semibold" style={{ color: sColor }}>✓ {sLabel}</span></td>
      <td className="py-3 px-4 text-sm" style={{ color: 'var(--jhq-text3)' }}>
        {domain ? <a href={item.url!} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="hover:underline" style={{ color: 'var(--jhq-text2)' }}>{domain.length > 22 ? domain.slice(0,22)+'…' : domain}</a> : '—'}
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {item.password && <CopyBtn value={item.password} label="Copy password" />}
          <button onClick={onToggleFav} className="p-1.5 rounded-lg" style={{ color: item.is_favorite ? '#f59e0b' : 'var(--jhq-text3)' }}>★</button>
          {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg" style={{ color: 'var(--jhq-text3)' }}>↗</a>}
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }}>✕</button>
        </div>
      </td>
    </tr>
  )
}

// ── API Key card ──────────────────────────────────────────────────────────────
function ApiKeyCard({ item, onEdit, onDelete }: { item: VaultItem; onEdit: () => void; onDelete: () => void }) {
  const [revealed, setRevealed] = useState(false)
  const typeInfo = ENTRY_TYPES.find(t => t.value === item.type) ?? ENTRY_TYPES[1]
  return (
    <div className="rounded-xl border p-4 cursor-pointer transition-all hover:border-emerald-500/40"
      style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)' }} onClick={onEdit}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Favicon url={item.url} name={item.name} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--jhq-text)' }}>{item.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-mono"
                style={{ background: `${typeInfo.color}15`, borderColor: `${typeInfo.color}40`, color: typeInfo.color }}>
                {typeInfo.icon} {typeInfo.label}
              </span>
              {item.environment && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border capitalize"
                  style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text3)' }}>
                  {item.environment}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {item.password && <CopyBtn value={item.password} label="Copy key" />}
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }}>✕</button>
        </div>
      </div>
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <code className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--jhq-text2)' }}>
          {revealed && item.password ? item.password : '●'.repeat(Math.min(item.password?.length ?? 20, 40))}
        </code>
        <button onClick={() => setRevealed(v => !v)} className="text-xs px-2 py-1 rounded border"
          style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
          {revealed ? '🙈' : '👁'}
        </button>
      </div>
      {item.project && item.project !== 'No project' && (
        <div className="mt-2 text-xs" style={{ color: 'var(--jhq-text3)' }}>📁 {item.project}</div>
      )}
    </div>
  )
}

// ── Vault Modal ───────────────────────────────────────────────────────────────
function VaultModal({ initial, onSave, onClose }: { initial?: Partial<VaultItem>; onSave: (item: Partial<VaultItem>) => Promise<void>; onClose: () => void }) {
  const [type,     setType]     = useState<EntryType>(initial?.type ?? 'password')
  const [name,     setName]     = useState(initial?.name ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')
  const [url,      setUrl]      = useState(initial?.url ?? '')
  const [provider, setProvider] = useState(initial?.provider ?? '')
  const [env,      setEnv]      = useState<Environment>(initial?.environment ?? 'production')
  const [project,  setProject]  = useState(initial?.project ?? 'No project')
  const [tool,     setTool]     = useState(initial?.tool ?? 'No tool')
  const [notes,    setNotes]    = useState(initial?.notes ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'general')
  const [showPw,   setShowPw]   = useState(false)
  const [saving,   setSaving]   = useState(false)

  const isPassword = type === 'password'
  const { label: sLabel, color: sColor } = strengthOf(password)

  const inp: React.CSSProperties = {
    background: 'var(--jhq-surface2)', border: '1px solid var(--jhq-border)', color: 'var(--jhq-text)',
    borderRadius: '0.75rem', padding: '0.625rem 0.875rem', fontSize: '0.875rem', width: '100%', outline: 'none',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    await onSave({ type, name, username: username || null, password: password || null, url: url || null, provider: provider || null, environment: env, project: project === 'No project' ? null : project, tool: tool === 'No tool' ? null : tool, notes: notes || null, category, is_favorite: initial?.is_favorite ?? false })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: 'var(--jhq-bg)', border: '1px solid var(--jhq-border)' }}>

        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: 'var(--jhq-header-bg)', borderColor: 'var(--jhq-header-bdr)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--jhq-text)' }}>{initial?.id ? 'Edit Entry' : 'Add Entry'}</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: 'var(--jhq-text3)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type chips */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--jhq-text2)' }}>Type</p>
            <div className="flex flex-wrap gap-2">
              {ENTRY_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={type === t.value
                    ? { background: t.color, borderColor: t.color, color: '#fff' }
                    : { background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder={isPassword ? 'Amazon, DCU, Google…' : 'OpenAI Prod Key, Stripe Live…'} style={inp} />
          </div>

          {isPassword && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Username / Email</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="bill@sifflard.com" style={inp} />
            </div>
          )}

          {/* Password / Key */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--jhq-text2)' }}>
                {isPassword ? 'Password' : ENTRY_TYPES.find(t => t.value === type)?.label}
              </label>
              {password && <span className="text-xs font-semibold" style={{ color: sColor }}>✓ {sLabel}</span>}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={isPassword ? 'Enter or generate…' : 'sk-...'}
                  style={{ ...inp, paddingRight: '2.75rem', fontFamily: 'monospace' }} />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--jhq-text3)' }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              <GeneratorPopover onUse={v => setPassword(v)} />
            </div>
          </div>

          {!isPassword && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Provider</label>
                <input value={provider} onChange={e => setProvider(e.target.value)} placeholder="OpenAI, Stripe…" style={inp} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Environment</label>
                <select value={env} onChange={e => setEnv(e.target.value as Environment)} style={inp}>
                  {ENVIRONMENTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {isPassword && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
                {PW_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Project</label>
              <select value={project} onChange={e => setProject(e.target.value)} style={inp}>
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Tool</label>
              <select value={tool} onChange={e => setTool(e.target.value)} style={inp}>
                {TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Dashboard URL</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://platform.openai.com/api-keys" style={inp} />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="2FA app, which project, renewal date…"
              style={{ ...inp, resize: 'vertical' as const }} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--jhq-accent)', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : initial?.id ? '✓ Update' : 'Save to Vault'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium border"
              style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main VaultTab ─────────────────────────────────────────────────────────────
export function VaultTab() {
  const [items,     setItems]     = useState<VaultItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [view,      setView]      = useState<VaultView>('passwords')
  const [search,    setSearch]    = useState('')
  const [sort,      setSort]      = useState<SortMode>('recent')
  const [apiProject,setApiProject]= useState('All Keys')
  const [editing,   setEditing]   = useState<Partial<VaultItem> | null>(null)
  const [showModal, setShowModal] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/vault'); const d = await r.json(); setItems(d.items ?? []) }
    catch { setItems([]) }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const passwords = items.filter(i => i.type === 'password')
  const apiKeys   = items.filter(i => i.type !== 'password')

  const sortItems = (arr: VaultItem[]) => {
    const q = search.toLowerCase()
    const filtered = arr.filter(i => !q || i.name.toLowerCase().includes(q) || i.username?.toLowerCase().includes(q) || i.url?.toLowerCase().includes(q) || i.provider?.toLowerCase().includes(q))
    if (sort === 'az')      return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'popular') return [...filtered].sort((a, b) => (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0))
    return [...filtered].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  const save = async (data: Partial<VaultItem>) => {
    const method = editing?.id ? 'PUT' : 'POST'
    const url    = editing?.id ? `/api/vault/${editing.id}` : '/api/vault'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setShowModal(false); setEditing(null); await load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/vault/${id}`, { method: 'DELETE' }); await load()
  }

  const toggleFav = async (item: VaultItem) => {
    await fetch(`/api/vault/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_favorite: !item.is_favorite }) })
    await load()
  }

  const openAdd = (type: EntryType) => {
    setEditing({ type })
    setShowModal(true)
    setView(type === 'password' ? 'passwords' : 'api_keys')
  }

  const apiProjects = ['All Keys', 'Uncategorized', ...Array.from(new Set(apiKeys.map(i => i.project).filter(Boolean) as string[]))]
  const visibleApiKeys = sortItems(
    apiProject === 'All Keys' ? apiKeys
    : apiProject === 'Uncategorized' ? apiKeys.filter(i => !i.project)
    : apiKeys.filter(i => i.project === apiProject)
  )

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--jhq-bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--jhq-text)' }}>🏦 Vault</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--jhq-text2)' }}>
            {passwords.length} password{passwords.length !== 1 ? 's' : ''} · {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''}
          </p>
        </div>
        <GeneratorPopover onUse={v => { setEditing({ password: v }); setShowModal(true) }} />
      </div>

      {/* API Health */}
      <ApiHealthStrip vaultItems={items} onUpdateKey={item => { setEditing(item); setShowModal(true) }} />

      {/* Quick action buttons */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--jhq-text3)' }}>Add New</p>
        <QuickActions onAdd={openAdd} />
      </div>

      {/* Main tabs */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={() => setView('passwords')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
          style={view === 'passwords'
            ? { background: 'var(--jhq-accent)', borderColor: 'var(--jhq-accent)', color: '#fff' }
            : { background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
          🔒 Passwords <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.2)' }}>{passwords.length}</span>
        </button>
        <button onClick={() => setView('api_keys')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
          style={view === 'api_keys'
            ? { background: 'var(--jhq-accent)', borderColor: 'var(--jhq-accent)', color: '#fff' }
            : { background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
          ⚡ API Keys &amp; Secrets <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.2)' }}>{apiKeys.length}</span>
        </button>
        <div className="flex-1" />
        {/* Sort controls */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--jhq-border)' }}>
          {(['popular','recent','az'] as SortMode[]).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className="px-3 py-1.5 text-xs font-medium transition-all"
              style={sort === s ? { background: 'var(--jhq-accent)', color: '#fff' } : { background: 'var(--jhq-surface)', color: 'var(--jhq-text2)' }}>
              {s === 'az' ? 'A–Z' : s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search…"
          className="px-3 py-1.5 rounded-xl border text-sm w-40"
          style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text)', outline: 'none' }} />
      </div>

      {/* PASSWORDS TABLE */}
      {view === 'passwords' && (
        loading ? (
          <div className="text-center py-16 text-sm" style={{ color: 'var(--jhq-text3)' }}>Loading…</div>
        ) : sortItems(passwords).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔒</p>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--jhq-text)' }}>No passwords yet</p>
            <p className="text-sm mb-4" style={{ color: 'var(--jhq-text3)' }}>Click 🔑 Password above to add your first</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--jhq-border)' }}>
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs font-semibold uppercase tracking-wider"
                  style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text3)' }}>
                  <th className="py-2.5 px-4 text-left">Name</th>
                  <th className="py-2.5 px-4 text-left">Username</th>
                  <th className="py-2.5 px-4 text-left">Strength</th>
                  <th className="py-2.5 px-4 text-left">URL</th>
                  <th className="py-2.5 px-2 text-left w-28">Actions</th>
                </tr>
              </thead>
              <tbody style={{ background: 'var(--jhq-surface)' }}>
                {sortItems(passwords).map(item => (
                  <PasswordRow key={item.id} item={item}
                    onEdit={() => { setEditing(item); setShowModal(true) }}
                    onDelete={() => del(item.id)}
                    onToggleFav={() => toggleFav(item)} />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* API KEYS GRID */}
      {view === 'api_keys' && (
        <div className="flex gap-4">
          <div className="w-40 shrink-0">
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--jhq-border)', background: 'var(--jhq-surface)' }}>
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-b"
                style={{ color: 'var(--jhq-text3)', borderColor: 'var(--jhq-border)' }}>Projects</p>
              {apiProjects.map(p => (
                <button key={p} onClick={() => setApiProject(p)}
                  className="w-full text-left px-3 py-2 text-sm transition-colors"
                  style={apiProject === p ? { background: 'var(--jhq-accent)', color: '#fff' } : { color: 'var(--jhq-text2)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-center py-16 text-sm" style={{ color: 'var(--jhq-text3)' }}>Loading…</div>
            ) : visibleApiKeys.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔑</p>
                <p className="text-base font-semibold mb-2" style={{ color: 'var(--jhq-text)' }}>No keys here yet</p>
                <p className="text-sm" style={{ color: 'var(--jhq-text3)' }}>Use the buttons above to add an API key, token, or secret</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {visibleApiKeys.map(item => (
                  <ApiKeyCard key={item.id} item={item}
                    onEdit={() => { setEditing(item); setShowModal(true) }}
                    onDelete={() => del(item.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <VaultModal
          initial={editing ?? undefined}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
