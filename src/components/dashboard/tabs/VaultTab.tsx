'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
export interface VaultField {
  id: string
  type: string
  label: string
  value: string
}

export interface VaultItem {
  id: string
  name: string
  project: string | null
  url: string | null
  username: string | null
  password: string | null
  fields: VaultField[]
  notes: string | null
  category: string
  tags: string[] | null
  created_at: string
  updated_at: string
}

// ── Field type definitions ─────────────────────────────────────────────────────
const FIELD_TYPES = [
  { value: 'api_key',     label: 'API Key',       icon: '🔑', placeholder: 'sk-...' },
  { value: 'secret_key',  label: 'Secret Key',    icon: '🔒', placeholder: 'sk_secret_...' },
  { value: 'service_key', label: 'Service Key',   icon: '👑', placeholder: 'eyJ...' },
  { value: 'token',       label: 'Token',         icon: '🪙', placeholder: 'token_...' },
  { value: 'webhook_url', label: 'Webhook URL',   icon: '🔗', placeholder: 'https://hooks...' },
  { value: 'license',     label: 'License/Code',  icon: '📋', placeholder: 'XXXX-XXXX-XXXX' },
  { value: 'username',    label: 'Username',      icon: '👤', placeholder: 'user@email.com' },
  { value: 'pin',         label: 'PIN/Code',      icon: '🔢', placeholder: '1234' },
  { value: 'project_id',  label: 'Project ID',    icon: '🆔', placeholder: 'proj_...' },
  { value: 'org_id',      label: 'Org/Account ID',icon: '🏢', placeholder: 'org_...' },
  { value: 'custom',      label: 'Custom',        icon: '✏️', placeholder: 'value...' },
]

const CATEGORIES = [
  { value: 'ai',       label: 'AI / LLM',       icon: '🤖' },
  { value: 'database', label: 'Database',        icon: '🗄️' },
  { value: 'infra',    label: 'Infrastructure',  icon: '⚙️' },
  { value: 'saas',     label: 'SaaS / Business', icon: '💼' },
  { value: 'payments', label: 'Payments',        icon: '💳' },
  { value: 'social',   label: 'Social / Media',  icon: '📱' },
  { value: 'dev',      label: 'Dev Tools',       icon: '💻' },
  { value: 'general',  label: 'General',         icon: '📦' },
]

const PROJECTS = [
  'Jasper HQ', 'Vortxx', 'YTidy', 'HeartbeatGuard', 'GiftHQ',
  'The Fort', 'Monomoy Site', 'OpenClaw HQ', 'TVE Book', 'General',
]

function uid() { return Math.random().toString(36).slice(2, 10) }

// ── Password generator ────────────────────────────────────────────────────────
interface GenOpts { length: number; upper: boolean; lower: boolean; nums: boolean; syms: boolean }

function generateSecret(opts: GenOpts): string {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const nums  = '0123456789'
  const syms  = '!@#$%^&*()_+-=[]{}|;:,.<>?'
  let chars = ''
  if (opts.upper) chars += upper
  if (opts.lower) chars += lower
  if (opts.nums)  chars += nums
  if (opts.syms)  chars += syms
  if (!chars) chars = lower + nums
  const arr = new Uint8Array(opts.length)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ value, size = 'sm' }: { value: string; size?: 'sm' | 'xs' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className={`flex items-center gap-1 rounded px-1.5 py-0.5 transition-all duration-150 font-mono border ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}
      style={{
        background: copied ? 'rgba(16,185,129,0.15)' : 'var(--jhq-surface2)',
        borderColor: copied ? 'rgba(16,185,129,0.5)' : 'var(--jhq-border)',
        color: copied ? '#10b981' : 'var(--jhq-text2)',
      }}
      title="Copy to clipboard"
    >
      {copied ? '✓ Copied' : '⎘ Copy'}
    </button>
  )
}

// ── PasswordGenerator popover ─────────────────────────────────────────────────
function PasswordGenerator({ onUse }: { onUse: (val: string) => void }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<GenOpts>({ length: 24, upper: true, lower: true, nums: true, syms: false })
  const [generated, setGenerated] = useState('')

  const gen = useCallback(() => setGenerated(generateSecret(opts)), [opts])
  useEffect(() => { if (open) gen() }, [open, gen])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all"
        style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-accent)' }}
      >
        ⚡ Generate
      </button>

      {open && (
        <div
          className="absolute z-50 top-full mt-2 right-0 w-80 rounded-xl border p-4 shadow-2xl"
          style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)' }}
        >
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--jhq-text)' }}>Password / Key Generator</p>

          {/* Length */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--jhq-text2)' }}>
              <span>Length</span>
              <span className="font-mono font-bold" style={{ color: 'var(--jhq-accent)' }}>{opts.length}</span>
            </div>
            <input type="range" min={8} max={64} value={opts.length}
              onChange={e => setOpts(o => ({ ...o, length: +e.target.value }))}
              className="w-full accent-emerald-500" />
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { key: 'upper', label: 'A–Z Uppercase' },
              { key: 'lower', label: 'a–z Lowercase' },
              { key: 'nums',  label: '0–9 Numbers' },
              { key: 'syms',  label: '!@# Symbols' },
            ].map(o => (
              <label key={o.key} className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'var(--jhq-text2)' }}>
                <input
                  type="checkbox"
                  checked={opts[o.key as keyof GenOpts] as boolean}
                  onChange={e => setOpts(prev => ({ ...prev, [o.key]: e.target.checked }))}
                  className="accent-emerald-500"
                />
                {o.label}
              </label>
            ))}
          </div>

          {/* Generated value */}
          <div
            className="rounded-lg p-2.5 mb-3 font-mono text-xs break-all border"
            style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-accent2)' }}
          >
            {generated || '—'}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={gen}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
              🔄 Regenerate
            </button>
            <CopyButton value={generated} />
            <button type="button"
              onClick={() => { onUse(generated); setOpen(false) }}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white transition-all"
              style={{ background: 'var(--jhq-accent)' }}>
              Use This
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SecretField (masked by default, reveal on click) ─────────────────────────
function SecretField({ label, value, icon }: { label: string; value: string; icon?: string }) {
  const [revealed, setRevealed] = useState(false)
  if (!value) return null
  const display = revealed ? value : '●'.repeat(Math.min(value.length, 32))
  return (
    <div className="flex items-start gap-2 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--jhq-border2)' }}>
      <span className="text-base shrink-0 mt-0.5">{icon ?? '🔑'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--jhq-text3)' }}>{label}</p>
        <p className="font-mono text-xs break-all" style={{ color: 'var(--jhq-text)' }}>{display}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => setRevealed(v => !v)}
          className="text-xs px-1.5 py-0.5 rounded border transition-all"
          style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
          {revealed ? '🙈' : '👁'}
        </button>
        <CopyButton value={value} size="xs" />
      </div>
    </div>
  )
}

// ── VaultCard ─────────────────────────────────────────────────────────────────
function VaultCard({ item, onEdit, onDelete }: { item: VaultItem; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const cat = CATEGORIES.find(c => c.value === item.category) ?? CATEGORIES[CATEGORIES.length - 1]
  const faviconUrl = item.url ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(item.url)}&sz=32` : null

  return (
    <div
      className="jhq-card rounded-xl overflow-hidden transition-all duration-200"
      style={{ boxShadow: expanded ? '0 0 0 1px var(--jhq-accent)' : 'none' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Favicon or category icon */}
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border text-lg"
          style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)' }}>
          {faviconUrl
            ? <img src={faviconUrl} alt="" className="w-5 h-5" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            : cat.icon
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--jhq-text)' }}>{item.name}</p>
            {item.project && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-mono border shrink-0"
                style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--jhq-accent)' }}>
                {item.project}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-xs truncate hover:underline"
                style={{ color: 'var(--jhq-text3)' }}>
                🔗 {item.url.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="text-xs shrink-0" style={{ color: 'var(--jhq-text3)' }}>{cat.icon} {cat.label}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs" style={{ color: 'var(--jhq-text3)' }}>
            {(item.fields?.length ?? 0) + (item.password ? 1 : 0)} fields
          </span>
          <span style={{ color: 'var(--jhq-text3)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Expanded fields */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--jhq-border)' }}>
            {/* Username */}
            {item.username && (
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: 'var(--jhq-border2)', background: 'var(--jhq-surface2)' }}>
                <span className="text-xs font-semibold w-24 shrink-0" style={{ color: 'var(--jhq-text3)' }}>👤 Username</span>
                <span className="font-mono text-xs flex-1 truncate" style={{ color: 'var(--jhq-text)' }}>{item.username}</span>
                <CopyButton value={item.username} size="xs" />
              </div>
            )}

            {/* Password */}
            {item.password && (
              <div className="px-3 py-2" style={{ background: 'var(--jhq-surface2)' }}>
                <SecretField label="Password" value={item.password} icon="🔐" />
              </div>
            )}

            {/* Dynamic fields */}
            {(item.fields ?? []).length > 0 && (
              <div className="px-3" style={{ background: 'var(--jhq-surface2)' }}>
                {item.fields.map(f => {
                  const ft = FIELD_TYPES.find(t => t.value === f.type)
                  const isSensitive = ['api_key','secret_key','service_key','token','pin','license'].includes(f.type)
                  return isSensitive
                    ? <SecretField key={f.id} label={f.label} value={f.value} icon={ft?.icon} />
                    : (
                      <div key={f.id} className="flex items-center gap-2 py-2 border-b last:border-b-0" style={{ borderColor: 'var(--jhq-border2)' }}>
                        <span className="text-base shrink-0">{ft?.icon ?? '📋'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--jhq-text3)' }}>{f.label}</p>
                          {f.type === 'webhook_url' || f.type === 'url'
                            ? <a href={f.value} target="_blank" rel="noreferrer" className="font-mono text-xs text-blue-400 hover:underline break-all">{f.value}</a>
                            : <p className="font-mono text-xs break-all" style={{ color: 'var(--jhq-text)' }}>{f.value}</p>
                          }
                        </div>
                        <CopyButton value={f.value} size="xs" />
                      </div>
                    )
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          {item.notes && (
            <p className="mt-3 text-xs italic" style={{ color: 'var(--jhq-text2)' }}>{item.notes}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            <button onClick={onEdit}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
              style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
              ✏️ Edit
            </button>
            <button onClick={onDelete}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium transition-all hover:border-red-500/50"
              style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: '#ef4444' }}>
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── VaultForm (slide-in panel) ────────────────────────────────────────────────
interface VaultFormProps {
  initial?: Partial<VaultItem>
  onSave: (item: Partial<VaultItem>) => Promise<void>
  onClose: () => void
}

function VaultForm({ initial, onSave, onClose }: VaultFormProps) {
  const [name,     setName]     = useState(initial?.name ?? '')
  const [project,  setProject]  = useState(initial?.project ?? '')
  const [url,      setUrl]      = useState(initial?.url ?? '')
  const [username, setUsername] = useState(initial?.username ?? '')
  const [password, setPassword] = useState(initial?.password ?? '')
  const [fields,   setFields]   = useState<VaultField[]>(initial?.fields ?? [])
  const [notes,    setNotes]    = useState(initial?.notes ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'general')
  const [showPw,   setShowPw]   = useState(false)
  const [saving,   setSaving]   = useState(false)

  const addField = () => setFields(f => [...f, { id: uid(), type: 'api_key', label: 'API Key', value: '' }])
  const removeField = (id: string) => setFields(f => f.filter(x => x.id !== id))
  const updateField = (id: string, patch: Partial<VaultField>) =>
    setFields(f => f.map(x => x.id === id ? { ...x, ...patch } : x))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave({ name, project: project || null, url: url || null, username: username || null, password: password || null, fields, notes: notes || null, category })
    setSaving(false)
  }

  const inputStyle = {
    background: 'var(--jhq-surface2)',
    border: '1px solid var(--jhq-border)',
    color: 'var(--jhq-text)',
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  }

  const labelStyle = { color: 'var(--jhq-text2)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className="w-full max-w-lg overflow-y-auto shadow-2xl"
        style={{ background: 'var(--jhq-bg)', borderLeft: '1px solid var(--jhq-border)' }}
      >
        {/* Panel header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
          style={{ background: 'var(--jhq-header-bg)', borderColor: 'var(--jhq-header-bdr)' }}>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--jhq-text)' }}>
              {initial?.id ? '✏️ Edit Vault Item' : '🏦 New Vault Item'}
            </h2>
            <p className="text-xs" style={{ color: 'var(--jhq-text3)' }}>All values are masked by default</p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: 'var(--jhq-text3)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label style={labelStyle}>Service / Site Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. OpenAI, Supabase, n8n" style={inputStyle} />
          </div>

          {/* Category + Project */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Project</label>
              <select value={project} onChange={e => setProject(e.target.value)} style={inputStyle}>
                <option value="">— None —</option>
                {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* URL */}
          <div>
            <label style={labelStyle}>Domain / URL</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)}
              placeholder="https://platform.openai.com" style={inputStyle} />
          </div>

          {/* Username */}
          <div>
            <label style={labelStyle}>Username / Email</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="bill@monomoystrategies.com" style={inputStyle} />
          </div>

          {/* Password */}
          <div>
            <label style={labelStyle}>Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter or generate a password"
                  style={{ ...inputStyle, paddingRight: '2.5rem' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'var(--jhq-text3)' }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              <PasswordGenerator onUse={val => setPassword(val)} />
            </div>
          </div>

          {/* ── Dynamic fields ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label style={{ ...labelStyle, marginBottom: 0 }}>Keys & Tokens</label>
              <button type="button" onClick={addField}
                className="text-xs px-2.5 py-1 rounded-lg border font-medium transition-all"
                style={{ background: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)', color: 'var(--jhq-accent)' }}>
                + Add Field
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((f, i) => {
                const ft = FIELD_TYPES.find(t => t.value === f.type)
                const isSensitive = ['api_key','secret_key','service_key','token','pin','license'].includes(f.type)
                return (
                  <div key={f.id} className="rounded-lg border p-3 space-y-2"
                    style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)' }}>
                    <div className="flex gap-2 items-center">
                      {/* Type select */}
                      <select
                        value={f.type}
                        onChange={e => {
                          const ft2 = FIELD_TYPES.find(t => t.value === e.target.value)
                          updateField(f.id, { type: e.target.value, label: ft2?.label ?? f.label })
                        }}
                        className="flex-1 text-xs rounded-lg px-2 py-1.5 border"
                        style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text)' }}
                      >
                        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                      </select>

                      {/* Custom label */}
                      <input
                        value={f.label}
                        onChange={e => updateField(f.id, { label: e.target.value })}
                        placeholder="Label"
                        className="flex-1 text-xs rounded-lg px-2 py-1.5 border"
                        style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text)' }}
                      />

                      <button type="button" onClick={() => removeField(f.id)}
                        className="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
                    </div>

                    {/* Value */}
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={isSensitive ? 'password' : 'text'}
                          value={f.value}
                          onChange={e => updateField(f.id, { value: e.target.value })}
                          placeholder={ft?.placeholder ?? 'value...'}
                          className="w-full text-xs rounded-lg px-2 py-1.5 border font-mono"
                          style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text)' }}
                        />
                      </div>
                      {['api_key','secret_key','service_key','token','pin'].includes(f.type) && (
                        <PasswordGenerator onUse={val => updateField(f.id, { value: val })} />
                      )}
                    </div>
                  </div>
                )
              })}

              {fields.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--jhq-text3)' }}>
                  No fields yet — click "+ Add Field" to add API keys, tokens, etc.
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any notes about this service..."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' as const }} />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all"
              style={{ background: 'var(--jhq-surface2)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text2)' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
              style={{ background: 'var(--jhq-accent)', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving...' : initial?.id ? '✓ Update' : '+ Save to Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main VaultTab ─────────────────────────────────────────────────────────────
export function VaultTab() {
  const [items,    setItems]    = useState<VaultItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [filterCat,setFilterCat]= useState('')
  const [editing,  setEditing]  = useState<Partial<VaultItem> | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vault')
      const d = await res.json()
      setItems(d.items ?? [])
    } catch { setItems([]) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async (data: Partial<VaultItem>) => {
    const method = editing?.id ? 'PUT' : 'POST'
    const url    = editing?.id ? `/api/vault/${editing.id}` : '/api/vault'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    setShowForm(false)
    setEditing(null)
    await load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vault item?')) return
    await fetch(`/api/vault/${id}`, { method: 'DELETE' })
    await load()
  }

  const filtered = items.filter(item => {
    const q = search.toLowerCase()
    const matchSearch = !q || item.name.toLowerCase().includes(q) || item.url?.toLowerCase().includes(q) || item.project?.toLowerCase().includes(q)
    const matchCat = !filterCat || item.category === filterCat
    return matchSearch && matchCat
  })

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--jhq-bg)' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: 'var(--jhq-text)' }}>🏦 Vault</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--jhq-text2)' }}>
            {items.length} item{items.length !== 1 ? 's' : ''} · API keys, passwords, and secrets
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:opacity-90"
          style={{ background: 'var(--jhq-accent)' }}
        >
          + Add to Vault
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search vault..."
          className="flex-1 px-4 py-2 rounded-xl border text-sm"
          style={{ background: 'var(--jhq-surface)', borderColor: 'var(--jhq-border)', color: 'var(--jhq-text)' }}
        />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterCat('')}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
            style={{
              background: !filterCat ? 'var(--jhq-accent)' : 'var(--jhq-surface)',
              borderColor: !filterCat ? 'var(--jhq-accent)' : 'var(--jhq-border)',
              color: !filterCat ? '#fff' : 'var(--jhq-text2)',
            }}>All</button>
          {CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setFilterCat(filterCat === c.value ? '' : c.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{
                background: filterCat === c.value ? 'var(--jhq-accent)' : 'var(--jhq-surface)',
                borderColor: filterCat === c.value ? 'var(--jhq-accent)' : 'var(--jhq-border)',
                color: filterCat === c.value ? '#fff' : 'var(--jhq-text2)',
              }}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-3 animate-pulse">🏦</div>
            <p className="text-sm" style={{ color: 'var(--jhq-text3)' }}>Loading vault...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-3">{search || filterCat ? '🔍' : '🔒'}</div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--jhq-text)' }}>
              {search || filterCat ? 'No matches found' : 'Your vault is empty'}
            </p>
            <p className="text-sm" style={{ color: 'var(--jhq-text3)' }}>
              {search || filterCat ? 'Try a different search or filter' : 'Add your first API key or credential'}
            </p>
            {!search && !filterCat && (
              <button onClick={() => { setEditing(null); setShowForm(true) }}
                className="mt-4 px-5 py-2 rounded-xl text-sm font-bold text-white"
                style={{ background: 'var(--jhq-accent)' }}>
                + Add First Item
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map(item => (
            <VaultCard
              key={item.id}
              item={item}
              onEdit={() => { setEditing(item); setShowForm(true) }}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}

      {/* Form panel */}
      {showForm && (
        <VaultForm
          initial={editing ?? undefined}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
