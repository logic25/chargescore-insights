// State-level EV registrations estimate (per 100K population, scaled to ~5-mile radius proxy)
// Source: Atlas EV Hub / DOE AFDC registration data, approximate values for MVP
const STATE_EV_ESTIMATES: Record<string, number> = {
  CA: 4500, WA: 2800, CO: 1800, MA: 1600, NJ: 1500,
  NY: 1400, FL: 1200, TX: 1100, IL: 1000, PA: 900,
  OR: 2200, CT: 1300, MD: 1200, VA: 1100, AZ: 1000,
  MN: 900, GA: 800, NC: 800, MI: 700, OH: 600,
  HI: 1800, VT: 1400, RI: 1100, NH: 900, ME: 700,
  NV: 1100, UT: 1000, DC: 1500, NM: 600, DE: 800,
  // Default for unlisted states
};

export function getEstimatedEvRegistrations(state: string): number {
  return STATE_EV_ESTIMATES[state] || 500;
}
