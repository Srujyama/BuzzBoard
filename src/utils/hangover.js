export function predictHangover(totalStandardDrinks, weightLbs, gender, hoursDrinking) {
  const weightFactor = gender === 'female' ? 140 / weightLbs : 180 / weightLbs
  const adjustedDrinks = totalStandardDrinks * weightFactor
  const paceMultiplier = hoursDrinking > 0
    ? Math.min(2, totalStandardDrinks / hoursDrinking)
    : 1
  const score = adjustedDrinks * (0.7 + 0.3 * paceMultiplier)

  if (score < 3) return { severity: 'none', message: 'You should feel fine! Stay hydrated just in case.' }
  if (score < 5) return { severity: 'mild', message: 'Mild: slight headache possible. Drink water before bed.' }
  if (score < 8) return { severity: 'moderate', message: 'Moderate: expect headache, fatigue, nausea. Hydrate well!' }
  return { severity: 'severe', message: 'Severe: rough morning ahead. Water, electrolytes, rest.' }
}

export function getHangoverColor(severity) {
  const colors = {
    none: 'text-buzz-safe',
    mild: 'text-buzz-primary',
    moderate: 'text-buzz-warning',
    severe: 'text-buzz-danger',
  }
  return colors[severity] || 'text-gray-400'
}
