STANDARD_DRINK_GRAMS = 14
ELIMINATION_RATE = 0.015
GENDER_RATIO = {"male": 0.68, "female": 0.55}
LBS_TO_GRAMS = 453.592

DRINK_STANDARD_EQUIVALENTS = {
    "shot": 1.0,
    "beer": 1.0,
    "mixed": 1.5,
}


def calculate_bac(
    total_standard_drinks: float,
    weight_lbs: int,
    gender: str,
    hours_elapsed: float,
) -> float:
    alcohol_grams = total_standard_drinks * STANDARD_DRINK_GRAMS
    body_weight_grams = weight_lbs * LBS_TO_GRAMS
    r = GENDER_RATIO.get(gender, 0.68)
    bac = (alcohol_grams / (body_weight_grams * r)) - (ELIMINATION_RATE * hours_elapsed)
    return max(0.0, round(bac, 4))


def drinks_for_bac(
    target_bac: float,
    weight_lbs: int,
    gender: str,
    hours_elapsed: float = 1,
) -> int:
    body_weight_grams = weight_lbs * LBS_TO_GRAMS
    r = GENDER_RATIO.get(gender, 0.68)
    alcohol_grams = (target_bac + ELIMINATION_RATE * hours_elapsed) * body_weight_grams * r
    return max(1, round(alcohol_grams / STANDARD_DRINK_GRAMS))


def calculate_limits(weight_lbs: int, gender: str) -> dict:
    return {
        "low": drinks_for_bac(0.04, weight_lbs, gender),
        "med": drinks_for_bac(0.06, weight_lbs, gender),
        "high": drinks_for_bac(0.08, weight_lbs, gender),
    }
