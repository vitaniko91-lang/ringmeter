import { useEffect, useRef } from 'react'
import { useMeasure } from './useMeasure'
import { Landing } from './screens/Landing'
import { Instructions } from './screens/Instructions'
import { Upload } from './screens/Upload'
import { Processing } from './screens/Processing'
import { Result } from './screens/Result'
import { Reject } from './screens/Reject'
import { Limits } from './screens/Limits'

export default function App() {
  const { state, ready, measureFile, reset } = useMeasure()
  const outcomeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (state.phase !== 'result' && state.phase !== 'reject') return
    // Move keyboard / screen-reader focus to the outcome heading, then bring the card into view.
    document.getElementById(state.phase === 'result' ? 'result-h' : 'reject-h')?.focus({ preventScroll: true })
    outcomeRef.current?.scrollIntoView({ block: 'start' })
  }, [state.phase])
  return (
    <div className="mx-auto max-w-md px-4 py-8 md:max-w-lg">
      <Landing />
      <main>
        <Instructions />
        <Upload onFile={measureFile} busy={state.phase === 'processing'} />
        <div ref={outcomeRef} aria-live="polite" className="scroll-mt-4">
          {state.phase === 'processing' && <Processing stage={state.stage} ready={ready} />}
          {state.phase === 'result' && <Result outcome={state.outcome} photo={state.photo} fileTimings={state.fileTimings} wallMs={state.wallMs} engineInitMs={state.engineInitMs} onReset={reset} />}
          {state.phase === 'reject' && <Reject outcome={state.outcome} photo={state.photo} onReset={reset} />}
        </div>
        <Limits />
      </main>
    </div>
  )
}
