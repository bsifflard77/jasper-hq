'use client'

import { useState, useEffect } from 'react'

interface WeatherData {
  temp_f: number
  condition: string
  icon: string
}

export function StatusBar() {
  const [time, setTime] = useState('')
  const [date, setDate] = useState('')
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [uptime, setUptime] = useState(0) // seconds since mount

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }))
      setDate(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setUptime(u => u + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    fetch('https://wttr.in/Hudson,NH?format=j1')
      .then(r => r.json())
      .then(d => {
        const cur = d.current_condition?.[0]
        if (cur) {
          setWeather({
            temp_f: parseInt(cur.temp_F),
            condition: cur.weatherDesc?.[0]?.value || '',
            icon: getWeatherIcon(cur.weatherCode),
          })
        }
      })
      .catch(() => {})
  }, [])

  function getWeatherIcon(code: string): string {
    const n = parseInt(code)
    if (n === 113) return '☀️'
    if (n === 116) return '⛅'
    if ([119, 122].includes(n)) return '☁️'
    if ([143, 248, 260].includes(n)) return '🌫️'
    if (n >= 176 && n <= 263) return '🌧️'
    if (n >= 293 && n <= 321) return '🌦️'
    if (n >= 323 && n <= 377) return '❄️'
    if (n >= 386 && n <= 395) return '⛈️'
    return '🌤️'
  }

  const formatUptime = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  return (
    <div className="w-full border-b backdrop-blur-sm px-4 py-1.5 flex items-center justify-between text-[11px] font-mono" style={{ letterSpacing: '0.05em', background: 'var(--jhq-status-bg)', borderColor: 'var(--jhq-status-bdr)', color: 'var(--jhq-text2)' }}>
      {/* Left: system status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/60" />
          <span className="text-emerald-400 font-bold tracking-widest">JASPER ONLINE</span>
        </div>
        <span className="text-slate-600">|</span>
        <span className="text-slate-500">UPTIME {formatUptime(uptime)}</span>
      </div>

      {/* Center: date + time */}
      <div className="flex items-center gap-3">
        <span className="text-slate-400">{date}</span>
        <span className="text-emerald-300 font-bold tabular-nums">{time}</span>
      </div>

      {/* Right: weather + model */}
      <div className="flex items-center gap-4">
        {weather && (
          <span className="text-slate-400">
            {weather.icon} Hudson, NH · <span className="text-white">{weather.temp_f}°F</span> {weather.condition}
          </span>
        )}
        <span className="text-slate-600">|</span>
        <span className="text-slate-500">claude-sonnet-4.6</span>
        <span className="text-slate-600 border border-slate-700 px-1.5 py-0.5 rounded text-[9px]">MONOMOY-1</span>
      </div>
    </div>
  )
}
