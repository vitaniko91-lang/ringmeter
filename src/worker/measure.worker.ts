/// <reference lib="webworker" />
import { loadCv } from '../cv/opencv'
import { measure } from '../cv/pipeline'
import { REJECT_HINT, type Outcome, type Photo, type Timings } from '../cv/types'

export type WorkerIn = { seq: number; file: File }
export type WorkerOut =
  | { ready: true; engineInitMs: number }
  | { seq: number; stage: string }
  | { seq: number; outcome: Outcome; photo?: Photo; fileTimings: Timings }

const MAX_SIDE = 4000
const scope = self as unknown as DedicatedWorkerGlobalScope
const post = (m: WorkerOut, transfer: Transferable[] = []) => scope.postMessage(m, transfer)

// Engine init starts as soon as the worker boots, not on the first photo; the main thread learns when it is usable.
const cvp = loadCv().then((cv) => { post({ ready: true, engineInitMs: +performance.now().toFixed(1) }); return cv })

const reject = (seq: number, code: 'BAD_FILE' | 'INTERNAL_ERROR', detail: string, fileTimings: Timings) =>
  post({ seq, outcome: { ok: false, code, hint: REJECT_HINT[code], detail, overlay: {}, timings: {}, totalMs: 0 }, fileTimings })

scope.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const { seq, file } = e.data
  const fileTimings: Timings = {}
  try {
    const cv = await cvp
    const t = performance.now()
    post({ seq, stage: 'decoding photo' })
    let bmp: ImageBitmap
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
    catch (err) { reject(seq, 'BAD_FILE', (err as Error).message ?? String(err), fileTimings); return }   // only a decode failure is the file's fault
    const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * k), h = Math.round(bmp.height * k)
    const canvas = new OffscreenCanvas(w, h)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bmp, 0, 0, w, h); bmp.close()
    const img = ctx.getImageData(0, 0, w, h)
    fileTimings['file decode'] = +(performance.now() - t).toFixed(1)
    post({ seq, stage: 'measuring' })
    const outcome = measure(cv, { data: img.data, width: w, height: h })
    const preview = await createImageBitmap(canvas)
    post({ seq, outcome, photo: { width: w, height: h, bitmap: preview }, fileTimings }, [preview])
  } catch (err) {
    reject(seq, 'INTERNAL_ERROR', String(err), fileTimings)
  }
}
