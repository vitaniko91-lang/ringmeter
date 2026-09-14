// Print-furniture layout of the A4 Ring Kit, mm from the top-left of the sheet. Shared by make-kit.ts (draws) and
// check-kit.ts (measures the render) so the two can never drift apart. Only the marker position and the zone are
// geometry the detector depends on (src/kit/kit-geometry.ts); everything here may move.
export const L = {
  title: 15, instruction: 21,
  markerCaption: 72, markerCaption2: 75,                       // two short lines under the marker, left of the zone
  scaleHeading: 100, coinX: 40, coinCol: 60, coinY: 117, coinLabel: 137, bar: 146, barLabel: 151,
  gaugeHeading: 160, gaugeX: 40, gaugeTop: 176, gaugeRow: 26, gaugeCol: 36,
  cutHeading: 250, cutX: 55, cutCol: 70, cutY: 264, cutLabel: 278, // 70 mm apart: the 50 mm labels must not collide
  rightMargin: 12,
} as const
