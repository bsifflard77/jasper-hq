'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
type EntryType = 'password' | 'api_key' | 'secret_key' | 'token' | 'ssh_key' | 'certificate'
type Environment = 'production' | 'staging' | 'development' | 'test'
type SortMode = 'popular' | 'recent' | 'az'
type ViewMode = 'list' | 'grid'
type VaultView = 'passwords' | 'api_keys'

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

// ── Constants ─────────────────────────────────────────────────────────────────
const ENTRY_TYPES: { value: EntryType; label: string; icon: string }[] = [
  { value: 'password',    label: 'Password',   icon: '🔑' },
  { value: 'api_key',     label: 'API Key',    icon: '⚡' },
  { value: 'secret_key',  label: 'Secret Key', icon: '🔒' },
  { value: 'token',       label: 'Token',      icon: '🪙' },
  { value: 'ssh_key',     label: 'SSH Key',    icon: '💻' },
  { value: 'certificate', label: 'Certificate',icon: '📜' },
]

const ENVIRONMENTS: { value: Environment; label: string }[] = [
  { value: 'production',  label: 'Production' },
  { value: 'staging',     label: 'Staging' },
  { value: 'development', label: 'Development' },
  { value: 'test',        label: 'Test' },
]

const PROJECTS = ['No project','Jasper HQ','Vortxx','YTidy','HeartbeatGuard','GiftHQ','The Fort','Monomoy Site','OpenClaw HQ','TVE Book','General']
const TOOLS    = ['No tool','n8n','OpenClaw','Supabase','Vercel','GitHub','Stripe','Discord','Google Cloud','AWS']
const PW_CATEGORIES = ['personal','finance','work','social','dev','general']

// ── Password strength ─────────────────────────────────────────────────────────
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

// ── Password generator ────────────────────────────────────────────────────────
interface GenOpts { length: number; symbols: boolean }

function genPassword(opts: GenOpts): string {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const syms = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  const chars = opts.symbols ? base + syms : base
  const arr = new Uint8Array(opts.length)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

// ── Favicon ───────────────────────────────────────────────────────────────────
function Favicon({ url, name }: { url: string | null; name: string }) {
  const [ok, setOk] = useState(!!url)
  const letter = (name[0] ?? '?').toUpperCase()
  const hue = ((name.charCodeAt(0) ?? 0) * 37) % 360
  const bg = `hsl(${hue},55%,38%)`

  if (!url || !ok) {
    return (
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: bg }}>
        {letter}
      </div>
    )
  }
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border" style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)' }}>
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(url)}&sz=32`}
        alt=""
        className="w-5 h-5"
        onError={() => setOk(false)}
      />
    </div>
  )
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyBtn({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async e => { e.stopPropagation(); await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      title={label ?? 'Copy'}
      className="p-1.5 rounded-lg transition-all"
      style={{ color: copied ? '#10b981' : 'var(--jhq-text3)', background: copied ? 'rgba(16,185,129,0.1)' : 'transparent' }}
    >
      {copied ? '✓' : '⎘'}
    </button>
  )
}

// ── Always-visible generator strip ───────────────────────────────────────────
function GeneratorStrip({ onUse }: { onUse?: (v: string) => void }) {
  const [opts,    setOpts]    = useState<GenOpts>({ length: 20, symbols: true })
  const [value,   setValue]   = useState(() => genPassword({ length: 20, symbols: true }))
  const [reveal,  setReveal]  = useState(false)
  const [copied,  setCopied]  = useState(false)
  const { label: sLabel, color: sColor } = strengthOf(value)

  const regen = useCallback(() => setValue(genPassword(opts)), [opts])
  useEffect(() => { regen() }, [opts, regen])

  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  return (
    <div className="rounded-2xl border p-4 mb-5" style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--jhq-text)' }}>
          ⚡ Password Generator
        </span>
        <span className="text-xs font-semibold flex items-center gap-1" style={{ color: sColor }}>
          ✓ {sLabel}
        </span>
      </div>

      {/* Generated value */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 relative">
          <input
            type={reveal ? 'text' : 'password'}
            value={value}
            readOnly
            className="w-full px-4 py-2.5 rounded-xl font-mono text-sm border"
            style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text)', outline: 'none' }}
          />
        </div>
        <button onClick={() => setReveal(v => !v)}
          className="p-2.5 rounded-xl border transition-all"
          style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
          {reveal ? '🙈' : '👁'}
        </button>
        <button onClick={copy}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
          style={{
            background: copied ? 'rgba(16,185,129,0.15)' : 'var(--jhq-surface2)',
            borderColor: copied ? 'rgba(16,185,129,0.4)' : 'var(--jhq-border)',
            color: copied ? '#10b981' : 'var(--jhq-text)',
          }}>
          {copied ? '✓' : '⎘'} {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={regen}
          className="p-2.5 rounded-xl border transition-all"
          style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}
          title="Regenerate">
          🔄
        </button>
        {onUse && (
          <button onClick={() => onUse(value)}
            className="px-3 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: 'var(--jhq-accent)' }}>
            Use
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xs shrink-0" style={{ color: 'var(--jhq-text2)' }}>Length: {opts.length}</span>
          <input type="range" min={8} max={64} value={opts.length}
            onChange={e => setOpts(o => ({ ...o, length: +e.target.value }))}
            className="flex-1 accent-emerald-500" />
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--jhq-text2)' }}>
          <input type="checkbox" checked={opts.symbols} onChange={e => setOpts(o => ({ ...o, symbols: e.target.checked }))} className="accent-emerald-500" />
          Symbols
        </label>
      </div>
    </div>
  )
}

// ── Password list row ─────────────────────────────────────────────────────────
function PasswordRow({ item, onEdit, onDelete, onToggleFav }: {
  item: VaultItem; onEdit: () => void; onDelete: () => void; onToggleFav: () => void
}) {
  const { label: sLabel, color: sColor } = strengthOf(item.password)
  const domain = item.url ? item.url.replace(/^https?:\/\//, '').split('/')[0] : null

  return (
    <tr
      className="group border-b cursor-pointer transition-colors"
      style={{ borderColor: 'var(--jhq-border2)' }}
      onClick={onEdit}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <Favicon url={item.url} name={item.name} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold" style={{ color: 'var(--jhq-text)' }}>{item.name}</span>
              {item.is_favorite && <span className="text-xs">⭐</span>}
            </div>
            <span className="text-xs capitalize" style={{ color: 'var(--jhq-text3)' }}>{item.category}</span>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-sm" style={{ color: item.username ? 'var(--jhq-text2)' : 'var(--jhq-text3)' }}>
        {item.username ?? '—'}
      </td>
      <td className="py-3 px-4">
        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: sColor }}>
          ✓ {sLabel}
        </span>
      </td>
      <td className="py-3 px-4 text-sm" style={{ color: 'var(--jhq-text3)' }}>
        {domain
          ? <a href={item.url!} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="hover:underline" style={{ color: 'var(--jhq-text2)' }}>{domain.length > 22 ? domain.slice(0,22)+'…' : domain}</a>
          : '—'}
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {item.password && <CopyBtn value={item.password} label="Copy password" />}
          <button onClick={onToggleFav} className="p-1.5 rounded-lg transition-colors" style={{ color: item.is_favorite ? '#f59e0b' : 'var(--jhq-text3)' }} title="Favorite">★</button>
          {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg" style={{ color: 'var(--jhq-text3)' }} title="Open site">↗</a>}
          <button onClick={onDelete} className="p-1.5 rounded-lg transition-colors" style={{ color: '#ef4444' }} title="Delete">✕</button>
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
    <div className="rounded-xl border p-4 cursor-pointer transition-all hover:border-emerald-500/40" style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)' }} onClick={onEdit}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Favicon url={item.url} name={item.name} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--jhq-text)' }}>{item.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full border font-mono" style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--jhq-accent)' }}>
                {typeInfo.icon} {typeInfo.label}
              </span>
              {item.environment && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border capitalize" style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text3)' }}>
                  {item.environment}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
          {item.password && <CopyBtn value={item.password} label="Copy key" />}
          <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: '#ef4444' }} title="Delete">✕</button>
        </div>
      </div>

      {/* Key value masked */}
      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
        <code className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--jhq-text2)' }}>
          {revealed && item.password ? item.password : '●'.repeat(Math.min(item.password?.length ?? 20, 32))}
        </code>
        <button onClick={() => setRevealed(v => !v)} className="text-xs px-2 py-1 rounded border" style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
          {revealed ? '🙈' : '👁'}
        </button>
      </div>

      {item.project && item.project !== 'No project' && (
        <div className="mt-2 text-xs" style={{ color: 'var(--jhq-text3)' }}>📁 {item.project}</div>
      )}
    </div>
  )
}

// ── Add / Edit form (modal) ───────────────────────────────────────────────────
function VaultModal({ initial, defaultView, onSave, onClose }: {
  initial?: Partial<VaultItem>
  defaultView: VaultView
  onSave: (item: Partial<VaultItem>) => Promise<void>
  onClose: () => void
}) {
  const [type,     setType]     = useState<EntryType>(initial?.type ?? (defaultView === 'api_keys' ? 'api_key' : 'password'))
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

  const input = {
    background: 'var(--jhq-surface2)',
    border: '1px solid var(--jhq-border)',
    color: 'var(--jhq-text)',
    borderRadius: '0.75rem',
    padding: '0.625rem 0.875rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({ type, name, username: username || null, password: password || null, url: url || null, provider: provider || null, environment: env, project: project === 'No project' ? null : project, tool: tool === 'No tool' ? null : tool, notes: notes || null, category, is_favorite: initial?.is_favorite ?? false })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" style={{ background: 'var(--jhq-bg)', border: '1px solid var(--jhq-border)' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: 'var(--jhq-header-bg)', borderColor: 'var(--jhq-header-bdr)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--jhq-text)' }}>{initial?.id ? 'Edit Entry' : 'Add Entry'}</h2>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: 'var(--jhq-text3)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type chips */}
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--jhq-text2)' }}>Type</p>
            <div className="flex flex-wrap gap-2">
              {ENTRY_TYPES.map(t => (
                <button key={t.value} type="button"
                  onClick={() => setType(t.value)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                  style={type === t.value
                    ? { background: 'var(--jhq-accent)', borderColor: 'var(--jhq-accent)', color: '#fff' }
                    : { background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }
                  }>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>
              Name (e.g. &ldquo;OpenAI — Vortxx&rdquo;) *
            </label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder={`${isPassword ? 'Amazon, DCU…' : 'OpenAI Prod Key'}`} style={input} />
          </div>

          {/* Username (passwords only) */}
          {isPassword && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Username / Email</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="bill@sifflard.com" style={input} />
            </div>
          )}

          {/* Password / Key value */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold" style={{ color: 'var(--jhq-text2)' }}>
                {isPassword ? 'Password' : ENTRY_TYPES.find(t => t.value === type)?.label}
              </label>
              {password && (
                <span className="text-xs font-semibold" style={{ color: sColor }}>✓ {sLabel}</span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={isPassword ? 'Enter or generate…' : 'sk-...'}
                  style={{ ...input, paddingRight: '2.75rem', fontFamily: 'monospace' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--jhq-text3)', fontSize: '0.875rem' }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              <button type="button"
                onClick={() => { const v = genPassword({ length: 20, symbols: true }); setPassword(v) }}
                className="px-3 py-2 rounded-xl border text-xs font-medium transition-all whitespace-nowrap"
                style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--jhq-accent)' }}>
                ⚡ Generate
              </button>
            </div>
          </div>

          {/* Provider + Environment (API keys) */}
          {!isPassword && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Provider</label>
                <input value={provider} onChange={e => setProvider(e.target.value)} placeholder="OpenAI, Stripe, Google…" style={input} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Environment</label>
                <select value={env} onChange={e => setEnv(e.target.value as Environment)} style={input}>
                  {ENVIRONMENTS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Category (passwords) */}
          {isPassword && (
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={input}>
                {PW_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
          )}

          {/* Project + Tool */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Project</label>
              <select value={project} onChange={e => setProject(e.target.value)} style={input}>
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Tool</label>
              <select value={tool} onChange={e => setTool(e.target.value)} style={input}>
                {TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Dashboard URL */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Dashboard URL (optional)</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://platform.openai.com/api-keys" style={input} />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--jhq-text2)' }}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Which project? 2FA app used? Special instructions…"
              rows={3} style={{ ...input, resize: 'vertical' as const }} />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'var(--jhq-accent)', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : initial?.id ? '✓ Update' : 'Save to Vault'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-medium border transition-all"
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
  const [listView,  setListView]  = useState<ViewMode>('list')
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
    const filtered = arr.filter(i => {
      const q = search.toLowerCase()
      return !q || i.name.toLowerCase().includes(q) || i.username?.toLowerCase().includes(q) || i.url?.toLowerCase().includes(q) || i.provider?.toLowerCase().includes(q)
    })
    if (sort === 'az') return [...filtered].sort((a, b) => a.name.localeCompare(b.name))
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

  const apiProjects = ['All Keys', 'Uncategorized', ...Array.from(new Set(apiKeys.map(i => i.project).filter(Boolean) as string[]))]

  const visibleApiKeys = sortItems(
    apiProject === 'All Keys' ? apiKeys
    : apiProject === 'Uncategorized' ? apiKeys.filter(i => !i.project)
    : apiKeys.filter(i => i.project === apiProject)
  )

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--jhq-bg)' }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--jhq-text)' }}>🏦 Vault</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--jhq-text2)' }}>
            {passwords.length} password{passwords.length !== 1 ? 's' : ''} · {apiKeys.length} API key{apiKeys.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── Generator (always visible) ── */}
      <GeneratorStrip onUse={v => { setEditing({ password: v }); setShowModal(true) }} />

      {/* ── Main tabs ── */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => setView('passwords')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
          style={view === 'passwords'
            ? { background: 'var(--jhq-accent)', borderColor: 'var(--jhq-accent)', color: '#fff' }
            : { background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
          🔒 Passwords <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.2)' }}>{passwords.length}</span>
        </button>
        <button
          onClick={() => setView('api_keys')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all"
          style={view === 'api_keys'
            ? { background: 'var(--jhq-accent)', borderColor: 'var(--jhq-accent)', color: '#fff' }
            : { background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
          ⚡ API Keys &amp; Secrets <span className="px-1.5 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.2)' }}>{apiKeys.length}</span>
        </button>
      </div>

      {/* ── PASSWORDS VIEW ── */}
      {view === 'passwords' && (
        <>
          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-4">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Search…"
              className="flex-1 px-4 py-2 rounded-xl border text-sm"
              style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text)', outline: 'none' }} />
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--jhq-border)' }}>
              {(['popular','recent','az'] as SortMode[]).map(s => (
                <button key={s} onClick={() => setSort(s)}
                  className="px-3 py-2 text-xs font-medium capitalize transition-all"
                  style={sort === s ? { background: 'var(--jhq-accent)', color: '#fff' } : { background: 'var(--jhq-surface)', color: 'var(--jhq-text2)' }}>
                  {s === 'az' ? 'A–Z' : s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
            <button onClick={() => { setEditing(null); setShowModal(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--jhq-accent)' }}>
              + Add
            </button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="text-center py-16 text-sm" style={{ color: 'var(--jhq-text3)' }}>Loading vault…</div>
          ) : sortItems(passwords).length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">🔒</p>
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--jhq-text)' }}>No passwords yet</p>
              <p className="text-sm mb-4" style={{ color: 'var(--jhq-text3)' }}>Add your first password to get started</p>
              <button onClick={() => { setEditing(null); setShowModal(true) }}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'var(--jhq-accent)' }}>
                + Add Password
              </button>
            </div>
          ) : (
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--jhq-border)' }}>
              <table className="w-full">
                <thead>
                  <tr className="border-b text-xs font-semibold uppercase tracking-wider" style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text3)' }}>
                    <th className="py-2.5 px-4 text-left">Name</th>
                    <th className="py-2.5 px-4 text-left">Username</th>
                    <th className="py-2.5 px-4 text-left">Strength</th>
                    <th className="py-2.5 px-4 text-left">URL</th>
                    <th className="py-2.5 px-2 text-left w-32">Actions</th>
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
          )}
        </>
      )}

      {/* ── API KEYS VIEW ── */}
      {view === 'api_keys' && (
        <div className="flex gap-4">
          {/* Sidebar */}
          <div className="w-44 shrink-0">
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--jhq-border)', background: 'var(--jhq-surface)' }}>
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest border-b" style={{ color: 'var(--jhq-text3)', borderColor: 'var(--jhq-border)' }}>Projects</p>
              {apiProjects.map(p => (
                <button key={p} onClick={() => setApiProject(p)}
                  className="w-full text-left px-3 py-2 text-sm transition-colors"
                  style={apiProject === p
                    ? { background: 'var(--jhq-accent)', color: '#fff' }
                    : { color: 'var(--jhq-text2)' }}>
                  {p}
                </button>
              ))}
              <div className="border-t p-2" style={{ borderColor: 'var(--jhq-border)' }}>
                <button onClick={() => { setEditing({ type: 'api_key' }); setShowModal(true) }}
                  className="w-full text-xs py-1.5 rounded-lg text-left px-2"
                  style={{ color: 'var(--jhq-accent)' }}>
                  + Add Key
                </button>
              </div>
            </div>
          </div>

          {/* Keys grid */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--jhq-text3)' }}>Tools</p>
              <div className="flex-1" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Search keys…"
                className="px-3 py-1.5 rounded-xl border text-sm w-48"
                style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text)', outline: 'none' }} />
              <button onClick={() => { setEditing({ type: 'api_key' }); setShowModal(true) }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--jhq-accent)' }}>
                + Add
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 text-sm" style={{ color: 'var(--jhq-text3)' }}>Loading keys…</div>
            ) : visibleApiKeys.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🔑</p>
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--jhq-text)' }}>No keys here yet</p>
                <button onClick={() => { setEditing({ type: 'api_key' }); setShowModal(true) }}
                  className="mt-2 text-sm" style={{ color: 'var(--jhq-accent)' }}>
                  Add one →
                </button>
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

      {/* ── Modal ── */}
      {showModal && (
        <VaultModal
          initial={editing ?? undefined}
          defaultView={view}
          onSave={save}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
