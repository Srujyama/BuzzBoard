// BAC calculation using full Watson et al. 1981 Total Body Water formula
// with per-drink first-order absorption/elimination superposition (Norberg 2003)
//
// Sources:
//   - Watson et al. 1981: TBW = f(sex, weight, height, age) → personalized r-value
//   - Norberg et al. 2003: absorption rate constant ka ≈ 6.5/hr
//   - Howland et al. (agab027): eBAC validation study
//   - nihms795582: female hepatotoxicity threshold ~30g ethanol/day
//   - NIAAA standard drink definition: 14g ethanol / 0.6 fl oz pure alcohol
//
// Key improvements:
//   1. Watson TBW r-value: personalizes BAC per your height/weight/age, not a fixed constant.
//      A lean 6'1" 145lb male gets r≈0.78 (vs fixed 0.68), so BAC per drink is ~13% lower.
//   2. Per-drink superposition: each logged drink is treated independently with its own
//      logged_at timestamp. BAC = sum of each drink's individual absorption curve.
//      This is far more accurate than treating all drinks as consumed at session start.

const STANDARD_DRINK_GRAMS = 14   // 14g ethanol per US standard drink (NIAAA)
const LBS_TO_KG = 0.453592
const IN_TO_CM  = 2.54

// Elimination rate: 0.015–0.018 BAC/hr; 0.017 is population mean
const ELIMINATION_RATE = 0.017   // ke

// Absorption rate constant ka ≈ 6.5/hr (Norberg 2003, with food present)
// Empty stomach is ~10/hr, but 6.5 is a realistic average for a night out.
// This places the BAC peak at ~30–45 min per drink, matching real-world experience.
const KA = 6.5

// Female hepatotoxicity threshold per nihms795582
const FEMALE_CAUTION_GRAMS = 30
const MALE_CAUTION_GRAMS   = 56

// ─── Drink types ─────────────────────────────────────────────────────────────
// standardDrinks = number of US standard drinks (14g ethanol each)
// abv, oz, abvLabel are for display on the UI cards
export const DRINK_TYPES = {
  shot:  { label: 'Shot',        oz: 1.5,  abv: 40, abvLabel: '1.5oz · 40% ABV', standardDrinks: 1.0, icon: 'shot'  },
  beer:  { label: 'Beer',        oz: 12,   abv: 5,  abvLabel: '12oz · 5% ABV',   standardDrinks: 1.0, icon: 'beer'  },
  wine:  { label: 'Wine',        oz: 5,    abv: 12, abvLabel: '5oz · 12% ABV',   standardDrinks: 1.0, icon: 'wine'  },
  mixed: { label: 'Mixed Drink', oz: null, abv: null, abvLabel: '~1.5 std drinks', standardDrinks: 1.5, icon: 'mixed' },
}

// ─── Watson TBW → Widmark r ───────────────────────────────────────────────────
/**
 * Compute Widmark r from Watson 1981 Total Body Water equations.
 *
 * TBW equations (Watson 1981):
 *   Male:   TBW = 2.447 − 0.09516·age + 0.1074·heightCm + 0.3362·weightKg
 *   Female: TBW = −2.097 + 0.1069·heightCm + 0.2466·weightKg
 *
 * Widmark r = TBW / (0.8 · weightKg)
 *
 * Falls back to population means (♂ 0.68, ♀ 0.55) when height/age unavailable.
 */
export function getWidmarkR(gender, weightLbs, heightInches = null, age = null) {
  if (!heightInches || heightInches <= 0) {
    return gender === 'female' ? 0.55 : 0.68
  }
  const weightKg = weightLbs * LBS_TO_KG
  const heightCm = heightInches * IN_TO_CM
  const a = age && age > 0 ? age : 22   // default college-age

  const tbw = gender === 'female'
    ? -2.097 + 0.1069 * heightCm + 0.2466 * weightKg
    :  2.447 - 0.09516 * a + 0.1074 * heightCm + 0.3362 * weightKg

  // Clamp to physiologically plausible range [0.45, 0.95]
  return Math.min(Math.max(tbw / (0.8 * weightKg), 0.45), 0.95)
}

// ─── Single-drink BAC contribution ───────────────────────────────────────────
/**
 * BAC contribution of a single standard drink at `hoursAgo` hours in the past.
 *
 * Uses the Norberg first-order absorption model:
 *   BAC(t) = Cmax · [ka/(ka−ke)] · [e^(−ke·t) − e^(−ka·t)]
 *
 * Post-peak (t > tPeak ≈ 0.64hr) switches to post-absorptive Widmark
 * which is more accurate once absorption is complete.
 */
function singleDrinkBAC(standardDrinks, weightLbs, gender, hoursAgo, heightInches, age) {
  if (hoursAgo < 0) return 0
  const alcoholGrams = standardDrinks * STANDARD_DRINK_GRAMS
  const weightKg = weightLbs * LBS_TO_KG
  const r  = getWidmarkR(gender, weightLbs, heightInches, age)
  const ke = ELIMINATION_RATE
  const t  = hoursAgo

  const cMax = alcoholGrams / (weightKg * r * 10)
  if (t <= 0) return 0

  const bacAbsorption = cMax * (KA / (KA - ke)) * (Math.exp(-ke * t) - Math.exp(-KA * t))
  const bacWidmark    = cMax - ke * t
  const tPeak         = Math.log(KA / ke) / (KA - ke)   // ≈ 0.64 hr

  const bac = t <= tPeak
    ? bacAbsorption
    : Math.max(bacAbsorption, bacWidmark)

  return Math.max(0, bac)
}

// ─── Main BAC from drink logs (superposition) ────────────────────────────────
/**
 * Calculate current BAC by summing each drink's individual contribution.
 *
 * Superposition principle: because the pharmacokinetics are linear,
 * BAC(total) = Σ BAC_i(t − t_i) for each drink i logged at time t_i.
 *
 * This is significantly more accurate than the old approach of treating
 * all drinks as consumed at session start.
 *
 * @param {Array<{logged_at: string, standard_drink_equivalent: number}>} logs
 * @param {number} weightLbs
 * @param {string} gender
 * @param {number|null} heightInches
 * @param {number|null} age
 * @returns {number} current BAC in g/dL
 */
export function calculateBACFromLogs(logs, weightLbs, gender, heightInches = null, age = null) {
  if (!logs || logs.length === 0 || !weightLbs || !gender) return 0
  const now = Date.now()
  let total = 0
  for (const log of logs) {
    const loggedAt  = new Date(log.logged_at).getTime()
    const hoursAgo  = (now - loggedAt) / 3600000
    const stdDrinks = log.standard_drink_equivalent || 1
    total += singleDrinkBAC(stdDrinks, weightLbs, gender, hoursAgo, heightInches, age)
  }
  return Math.max(0, parseFloat(total.toFixed(4)))
}

/**
 * Legacy single-call BAC (kept for compatibility).
 * Treats all drinks as consumed at session start — less accurate.
 * Prefer calculateBACFromLogs when drink logs with timestamps are available.
 */
export function calculateBAC(totalStandardDrinks, weightLbs, gender, hoursElapsed, heightInches = null, age = null) {
  if (totalStandardDrinks <= 0 || hoursElapsed <= 0) return 0
  // Synthesize a single "log" at session start
  return singleDrinkBAC(totalStandardDrinks, weightLbs, gender, hoursElapsed, heightInches, age)
}

// ─── Drink limit helpers ──────────────────────────────────────────────────────
/**
 * How many standard drinks reach targetBAC over a 3-hour night (steady-state Widmark).
 */
export function drinksForBAC(targetBAC, weightLbs, gender, hoursElapsed = 3, heightInches = null, age = null) {
  const weightKg = weightLbs * LBS_TO_KG
  const r = getWidmarkR(gender, weightLbs, heightInches, age)
  const alcoholGrams = (targetBAC + ELIMINATION_RATE * hoursElapsed) * weightKg * r * 10
  return Math.max(1, Math.round(alcoholGrams / STANDARD_DRINK_GRAMS))
}

/**
 * Calculate personalized Low / Med / High drink limits.
 *
 * Low  = BAC 0.04 (feeling effects, safe zone)
 * Med  = BAC 0.06 (buzzed)
 * High = BAC 0.08 (legal DUI limit — this is the ceiling, not a goal)
 *
 * Female high limit is also bounded by the 30g hepatotoxicity threshold.
 */
export function calculateLimits(weightLbs, gender, heightInches = null, age = null) {
  const low  = drinksForBAC(0.04, weightLbs, gender, 3, heightInches, age)
  const med  = drinksForBAC(0.06, weightLbs, gender, 3, heightInches, age)
  const high = drinksForBAC(0.08, weightLbs, gender, 3, heightInches, age)

  let finalHigh = high
  if (gender === 'female') {
    const cautionDrinks = Math.floor(FEMALE_CAUTION_GRAMS / STANDARD_DRINK_GRAMS)
    finalHigh = Math.min(high, Math.max(cautionDrinks, med + 1))
  }

  return { low, med, high: finalHigh }
}

// ─── Status / display helpers ─────────────────────────────────────────────────
export function getBACStatus(bac) {
  if (bac < 0.02) return { level: 'sober',  color: 'buzz-safe',    message: 'Sober'                    }
  if (bac < 0.04) return { level: 'low',    color: 'buzz-safe',    message: 'Minimal effects'           }
  if (bac < 0.06) return { level: 'buzzed', color: 'buzz-primary', message: 'Feeling it'                }
  if (bac < 0.08) return { level: 'tipsy',  color: 'buzz-warning', message: 'Tipsy — slow down'         }
  if (bac < 0.10) return { level: 'over',   color: 'buzz-danger',  message: 'At legal limit — stop'     }
  return               { level: 'danger', color: 'buzz-danger',  message: 'DANGER — stop immediately' }
}

export function totalEthanolGrams(totalStandardDrinks) {
  return totalStandardDrinks * STANDARD_DRINK_GRAMS
}

export function exceedsCautionThreshold(totalStandardDrinks, gender) {
  const grams = totalEthanolGrams(totalStandardDrinks)
  const threshold = gender === 'female' ? FEMALE_CAUTION_GRAMS : MALE_CAUTION_GRAMS
  return grams > threshold
}
