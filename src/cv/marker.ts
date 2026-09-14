import type { CV } from './opencv'
import type { Quad } from './types'
import { MARKER_ID } from '../kit/kit-geometry'

/** Detect ArUco 4x4_50 id 0 on an 8-bit gray Mat. Corners in Mat px, order TL,TR,BR,BL. */
export function detectMarker(cv: CV, gray: any): Quad | null {
  const dict = cv.getPredefinedDictionary(cv.DICT_4X4_50)
  const params = new cv.aruco_DetectorParameters()
  params.cornerRefinementMethod = cv.CORNER_REFINE_SUBPIX
  const refine = new cv.aruco_RefineParameters(10, 3, true)
  const det = new cv.aruco_ArucoDetector(dict, params, refine)
  const corners = new cv.MatVector(), ids = new cv.Mat(), rejected = new cv.MatVector()
  try {
    det.detectMarkers(gray, corners, ids, rejected)
    for (let i = 0; i < ids.rows; i++) {
      if (ids.data32S[i] !== MARKER_ID) continue
      const c = corners.get(i).data32F
      return [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]]
    }
    return null
  } finally {
    corners.delete(); ids.delete(); rejected.delete(); det.delete(); refine.delete(); params.delete(); dict.delete()
  }
}
