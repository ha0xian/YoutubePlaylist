import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useAuth } from '../auth/useAuth'
import { analyzeVideo, getAISettings, saveAISettings } from '../api/ai'
import { RECOMMENDED_PROMPTS } from '../lib/recommendedPrompts'

export interface AIAnalysisPanelProps {
  videoId?: string
  onAppendToNotes: (generatedMarkdown: string) => void
  onReplaceNotes: (generatedMarkdown: string) => void
}

export default function AIAnalysisPanel({ videoId, onAppendToNotes, onReplaceNotes }: AIAnalysisPanelProps) {
  const { token } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [savedPrompt, setSavedPrompt] = useState('')
  const [result, setResult] = useState('')
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [copyStatus, setCopyStatus] = useState<string | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(true)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const requestRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!token) return
    let active = true
    getAISettings(token)
      .then((settings) => {
        if (!active) return
        setSavedPrompt(settings.defaultPrompt)
        setPrompt(settings.defaultPrompt || RECOMMENDED_PROMPTS[0].prompt)
        setSettingsError(null)
      })
      .catch((error) => active && setSettingsError(error instanceof Error ? error.message : 'Could not load your saved prompt.'))
      .finally(() => active && setIsLoadingSettings(false))
    return () => { active = false }
  }, [token])

  useEffect(() => () => requestRef.current?.abort(), [videoId])

  const renderedResult = useMemo(() => ({
    __html: DOMPurify.sanitize(marked.parse(result) as string),
  }), [result])
  const trimmedPrompt = prompt.trim()
  const canAnalyze = Boolean(token && videoId && trimmedPrompt && prompt.length <= 5000 && !isAnalyzing)

  const persistPrompt = async (value: string) => {
    if (!token) return
    setIsSavingSettings(true)
    try {
      const settings = await saveAISettings(token, value)
      setSavedPrompt(settings.defaultPrompt)
      setSettingsError(null)
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Could not save your prompt.')
    } finally {
      setIsSavingSettings(false)
    }
  }

  const runAnalysis = async () => {
    if (!token || !videoId || !canAnalyze) return
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setIsAnalyzing(true)
    setAnalysisError(null)
    try {
      const response = await analyzeVideo(token, videoId, trimmedPrompt, controller.signal)
      if (requestRef.current === controller) setResult(response.content)
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setAnalysisError(error instanceof Error ? error.message : 'Analysis failed. Please try again.')
      }
    } finally {
      if (requestRef.current === controller) setIsAnalyzing(false)
    }
  }

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  return (
    <div className="ai-panel scrollbar-thin h-full overflow-y-auto p-4">
      <section aria-labelledby="ai-prompt-heading">
        <div className="flex items-start justify-between gap-3">
          <div><h3 id="ai-prompt-heading" className="text-sm font-semibold text-main">Analyze this video</h3><p className="mt-1 text-xs text-muted">Choose a starting point or write your own prompt.</p></div>
          {savedPrompt && <span className="rounded-full bg-muted px-2 py-1 text-[10px] text-success">Default saved</span>}
        </div>
        <div className="ai-prompt-grid mt-3">
          {RECOMMENDED_PROMPTS.map((item) => <button key={item.id} type="button" className="ai-prompt-card" onClick={() => setPrompt(item.prompt)}><strong>{item.name}</strong><span>{item.description}</span></button>)}
        </div>
        <label htmlFor="ai-prompt" className="mt-4 block text-xs font-medium text-main">Prompt</label>
        <textarea id="ai-prompt" className="control mt-2 min-h-32 w-full resize-y rounded-lg p-3 text-sm" value={prompt} maxLength={5001} onChange={(event) => setPrompt(event.target.value)} disabled={isLoadingSettings} />
        <div className={`mt-1 text-right text-[11px] ${prompt.length > 5000 ? 'text-danger' : 'text-muted'}`}>{prompt.length} / 5,000</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-secondary rounded-lg px-3 py-2 text-xs" disabled={!token || isSavingSettings || prompt.length > 5000} onClick={() => persistPrompt(prompt)}>Save as default</button>
          <button type="button" className="btn-ghost rounded-lg px-3 py-2 text-xs" disabled={!token || isSavingSettings || !savedPrompt} onClick={() => persistPrompt('')}>Clear default</button>
          <button type="button" className="btn-primary ml-auto rounded-lg px-4 py-2 text-xs font-semibold" disabled={!canAnalyze} onClick={runAnalysis}>{isAnalyzing ? 'Analyzing…' : result ? 'Regenerate' : 'Analyze video'}</button>
        </div>
        {settingsError && <p role="status" className="mt-3 text-xs text-danger">{settingsError}</p>}
        {analysisError && <p role="alert" className="mt-3 text-xs text-danger">{analysisError}</p>}
        {!videoId && <p className="mt-3 text-xs text-muted">Select a video to start analysis.</p>}
      </section>
      {result && <section className="mt-5 border-t border-line pt-4" aria-labelledby="ai-result-heading"><div className="flex items-center justify-between"><h3 id="ai-result-heading" className="text-sm font-semibold text-main">AI result</h3><span aria-live="polite" className="text-[11px] text-muted">{copyStatus}</span></div><div className="markdown-preview ai-result mt-3 rounded-lg border border-line bg-muted p-4" dangerouslySetInnerHTML={renderedResult} /><div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-secondary rounded-lg px-3 py-2 text-xs" onClick={copyResult}>Copy</button><button type="button" className="btn-secondary rounded-lg px-3 py-2 text-xs" onClick={() => onAppendToNotes(result)}>Append to Notes</button><button type="button" className="btn-ghost rounded-lg px-3 py-2 text-xs text-danger" onClick={() => { if (window.confirm('Replace your current note with this AI analysis?')) onReplaceNotes(result) }}>Replace Notes</button></div></section>}
    </div>
  )
}
