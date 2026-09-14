import cvReady from '@techstark/opencv-js'
// The package's typings do not cover ArUco; the awaited module is a different object from the import.
export type CV = Awaited<typeof cvReady> & Record<string, any>
let ready: Promise<CV> | null = null
export function loadCv(): Promise<CV> { return (ready ??= (async () => (await cvReady) as CV)()) }
