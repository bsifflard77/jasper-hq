'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  Send,
  Loader2,
  Sparkles,
  Check
} from 'lucide-react'
// Uses server-side API route instead of direct Supabase

interface QuickNoteInputProps {
  onSubmit?: (content: string) => Promise<void>
  placeholder?: string
}

export function QuickNoteInput({ onSubmit, placeholder = "Drop a note for Jasper..." }: QuickNoteInputProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [content])

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      if (onSubmit) {
        await onSubmit(content.trim())
      } else {
        const res = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: content.trim() }),
        })
        if (!res.ok) throw new Error('Failed to save note')
      }
      setContent('')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2000)
    } catch (error) {
      console.error('Failed to submit note:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <Card className="border-dashed border-2 border-amber-500/30 bg-gradient-to-r from-amber-900/10 to-transparent hover:border-amber-500/50 transition-colors">
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-900/20 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent p-0 focus-visible:ring-0 placeholder:text-slate-400 text-white"
              rows={1}
              disabled={isSubmitting}
            />
            
            {content.length > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-[10px]">⌘</kbd> + <kbd className="px-1 py-0.5 bg-slate-700 rounded text-[10px]">Enter</kbd> to send
              </p>
            )}
          </div>

          <Button
            size="sm"
            variant={showSuccess ? 'default' : 'ghost'}
            className={`
              shrink-0 transition-all text-white hover:text-white
              ${showSuccess 
                ? 'bg-emerald-600 hover:bg-emerald-600' 
                : 'bg-transparent hover:bg-amber-900/20'
              }
            `}
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : showSuccess ? (
              <Check className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}