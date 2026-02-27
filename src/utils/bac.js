const STANDARD_DRINK_GRAMS = 14
const ELIMINATION_RATE = 0.015
const GENDER_RATIO = { male: 0.68, female: 0.55 }
const LBS_TO_GRAMS = 453.592

export const DRINK_TYPES = {
  shot: { label: 'Shot (1.5oz)', standardDrinks: 1.0, icon: 'shot' },
  beer: { label: 'Beer (12oz)', standardDrinks: 1.0, icon: 'beer' },
  mixed: { label: 'Mixed Drink', standardDrinks: 1.5, icon: 'mixed' },
}

export function calculateBAC(totalStandardDrinks, weightLbs, gender, hoursElapsed) {
  const alcoholGrams = totalStandardDrinks * STANDARD_DRINK_GRAMS
  const bodyWeightGrams = weightLbs * LBS_TO_GRAMS
  const r = GENDER_RATIO[gender] || 0.68
  const bac = (alcoholGrams / (bodyWeightGrams * r)) - (ELIMINATION_RATE * hoursElapsed)
  return Math.max(0, parseFloat(bac.toFixed(4)))
}

export function drinksForBAC(targetBAC, weightLbs, gender, hoursElapsed = 1) {
  const bodyWeightGrams = weightLbs * LBS_TO_GRAMS
  const r = GENDER_RATIO[gender] || 0.68
  const alcoholGrams = (targetBAC + ELIMINATION_RATE * hoursElapsed) * bodyWeightGrams * r
  return Math.max(1, Math.round(alcoholGrams / STANDARD_DRINK_GRAMS))
}

export function calculateLimits(weightLbs, gender) {
  return {
    low: drinksForBAC(0.04, weightLbs, gender),
    med: drinksForBAC(0.06, weightLbs, gender),
    high: drinksForBAC(0.08, weightLbs, gender),
  }
}

export function getBACStatus(bac) {
  if (bac < 0.02) return { level: 'sober', color: 'buzz-safe', message: 'Sober' }
  if (bac < 0.04) return { level: 'low', color: 'buzz-safe', message: 'Minimal effects' }
  if (bac < 0.06) return { level: 'buzzed', color: 'buzz-primary', message: 'Feeling it' }
  if (bac < 0.08) return { level: 'tipsy', color: 'buzz-warning', message: 'Tipsy - slow down' }
  if (bac < 0.10) return { level: 'over', color: 'buzz-danger', message: 'At legal limit - stop' }
  return { level: 'danger', color: 'buzz-danger', message: 'DANGER - stop immediately' }
}
