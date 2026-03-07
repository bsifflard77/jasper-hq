'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Loader2, ChevronDown } from 'lucide-react'
import Image from 'next/image'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

const QUICK_ACTIONS = [
  { label: '🔐 Add a credential', message: 'I want to add a new API key or secret. How do I do it?' },
  { label: '📋 What keys do I have?', message: 'What credentials are stored?' },
  { label: '🚀 Project status', message: "What's the status of my main projects?" },
  { label: '⚡ Which APIs are active?', message: 'Which API services are currently configured?' },
]

const STORAGE_KEY = 'jasper_hq_chat'

export function JasperChatWidget() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [loading, setLoading] = useState(false)
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
  }, [open])

  useEffect(() => {
    if (messages.length > 0) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))) } catch {}
    }
    if (!open && messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      setUnread(n => n + 1)
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages, open])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return
    const userMsg: Message = { role: 'user', content: text.trim(), ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/jasper-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.message, ts: Date.now() }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble connecting. Try again!", ts: Date.now() }])
    } finally {
      setLoading(false)
    }
  }, [messages])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function clearHistory() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg, #1e3a2f 0%, #0f5132 50%, #1a4a2e 100%)', border: '2px solid rgba(52, 211, 153, 0.4)' }}
        title="Chat with Jasper"
      >
        {open ? (
          <ChevronDown className="w-6 h-6 text-emerald-300" />
        ) : (
          <span className="text-2xl leading-none select-none">🦞</span>
        )}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{ height: '480px', background: 'var(--jhq-surface, #1e293b)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0f172a' }}>
            <div className="w-9 h-9 rounded-full bg-emerald-900 border border-emerald-700 flex items-center justify-center text-lg shrink-0">🦞</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-white">Jasper</div>
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Online
              </div>
            </div>
            <button onClick={clearHistory} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded">Clear</button>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-800 text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <div className="text-3xl mb-2">🦞</div>
                <p className="text-sm text-slate-400 font-medium">Hey, it's Jasper.</p>
                <p className="text-xs text-slate-500 mt-1">What do you need?</p>
                {/* Quick actions */}
                <div className="mt-4 space-y-1.5">
                  {QUICK_ACTIONS.map(a => (
                    <button key={a.label} onClick={() => sendMessage(a.message)}
                      className="w-full text-left text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-2 rounded-lg transition-colors">
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-900 border border-emerald-800 flex items-center justify-center text-sm shrink-0 mt-0.5">🦞</div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-violet-600 text-white rounded-tr-sm'
                    : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-900 border border-emerald-800 flex items-center justify-center text-sm shrink-0">🦞</div>
                <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-2.5">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex gap-2 items-center bg-slate-800 rounded-xl px-3 py-1.5 border border-slate-700 focus-within:border-violet-500 transition-colors">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask Jasper anything..."
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                disabled={loading}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="p-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
