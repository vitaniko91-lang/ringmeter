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
  const { state, measureFile, reset } = useMeasure()
  const outcomeRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (state.phase === 'result' || state.phase === 'reject') outcomeRef.current?.scrollIntoView({ block: 'start' }) }, [state.phase])
  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <Landing />
      <Instructions />
      <Upload onFile={measureFile} busy={state.phase === 'processing'} />
      <div ref={outcomeRef}>
        {state.phase === 'processing' && <Processing stage={state.stage} />}
        {state.phase === 'result' && <Result outcome={state.outcome} photo={state.photo} fileTimings={state.fileTimings} onReset={reset} />}
        {state.phase === 'reject' && <Reject outcome={state.outcome} photo={state.photo} onReset={reset} />}
      </div>
      <Limits />
    </main>
  )
}
