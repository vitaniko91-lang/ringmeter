/// <reference lib="webworker" />
import { loadCv } from '../cv/opencv'
import { measure } from '../cv/pipeline'
import { REJECT_HINT, type Outcome, type Timings } from '../cv/types'

export type WorkerIn = { seq: number; file: File }
export type WorkerOut =
  | { seq: number; stage: string }
  | { seq: number; outcome: Outcome; photo?: { width: number; height: number; bitmap: ImageBitmap }; fileTimings: Timings }

const MAX_SIDE = 4000
const scope = self as unknown as DedicatedWorkerGlobalScope
const post = (m: WorkerOut, transfer: Transferable[] = []) => scope.postMessage(m, transfer)

scope.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const { seq, file } = e.data
  const fileTimings: Timings = {}
  try {
    let t = performance.now()
    post({ seq, stage: 'loading OpenCV' })
    const cv = await loadCv()
    fileTimings['opencv load'] = +(performance.now() - t).toFixed(1); t = performance.now()
    post({ seq, stage: 'decoding photo' })
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
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
    post({ seq, outcome: { ok: false, code: 'BAD_FILE', hint: REJECT_HINT.BAD_FILE, detail: (err as Error).message, overlay: {}, timings: {}, totalMs: 0 }, fileTimings })
  }
}
