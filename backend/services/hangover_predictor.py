def predict_hangover(
    total_standard_drinks: float,
    weight_lbs: int,
    gender: str,
    hours_drinking: float,
) -> dict:
    weight_factor = (140 / weight_lbs) if gender == "female" else (180 / weight_lbs)
    adjusted_drinks = total_standard_drinks * weight_factor
    pace_multiplier = (
        min(2, total_standard_drinks / hours_drinking) if hours_drinking > 0 else 1
    )
    score = adjusted_drinks * (0.7 + 0.3 * pace_multiplier)

    if score < 3:
        return {"severity": "none", "message": "You should feel fine! Stay hydrated just in case."}
    if score < 5:
        return {"severity": "mild", "message": "Mild: slight headache possible. Drink water before bed."}
    if score < 8:
        return {"severity": "moderate", "message": "Moderate: expect headache, fatigue, nausea. Hydrate well!"}
    return {"severity": "severe", "message": "Severe: rough morning ahead. Water, electrolytes, rest."}
