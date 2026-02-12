# ONLYOU — HAIR LOSS VERTICAL SPECIFICATION
## Condition-Specific Questionnaire, AI Logic, Protocols & Edge Cases

> **Prerequisite:** Read `onlyou-spec-master.md` (v3) first for shared infrastructure.
> Key master spec sections relevant to this vertical:
> - Section 7: Blood Work & Diagnostics (portal-based, no Thyrocare)
> - Section 8: Medication Fulfillment (local delivery, no Shiprocket)
> - Section 4: Patient Tracking Screens (status steppers for labs + delivery)

---

# 1. CONDITION OVERVIEW

**Target:** Men 18-45, Women with androgenetic alopecia (AGA)
**Doctor type:** Dermatologist / Trichologist
**Consultation type:** Async (text + photos)
**Core treatments:** Finasteride, Minoxidil, Ketoconazole shampoo, nutritional supplements
**Key differentiator:** Photo-based progress tracking with side-by-side comparison over time

---

# 2. PRICING

| Plan | Price | Includes |
|---|---|---|
| Monthly | ₹999/month | Consultation + medication + delivery |
| Quarterly | ₹2,499/quarter (₹833/mo) | Same + 17% savings |
| Annual | ₹8,999/year (₹750/mo) | Same + 25% savings |

---

# 3. QUESTIONNAIRE (25 Questions, ~5-7 minutes)

## Skip Logic Rules
- Q2 = Female → add Q2b (pregnancy/breastfeeding)
- Q10 = "None" → Q11 becomes optional
- Q17 = "None" → skip Q18, Q19
- Q10 includes scalp condition → add Q10b

Most male patients answer 20-22 questions after skip logic.

---

## SECTION 1: BASICS (3-4 questions)

**Q1: What is your age?**
- Type: Number input (18-80)
- Validation: <18 = blocked
- AI use: Age-appropriate treatment. <25 = more conservative.

**Q2: What is your biological sex?**
- Type: Single select — Male / Female
- AI use: Finasteride contraindicated in women of childbearing age.

**Q2b: [IF FEMALE] Are you currently pregnant, breastfeeding, or planning pregnancy in next 12 months?**
- Type: Single select — Yes / No
- AI use: Yes = ABSOLUTE finasteride block.

**Q3: What is your primary concern?**
- Type: Single select
  - "My hair is thinning gradually"
  - "My hairline is receding"
  - "I have bald patches/spots"
  - "I'm shedding a lot of hair suddenly"
  - "I have scalp itching/flaking along with hair loss"
  - "Not sure — I want professional guidance"
- AI use: "Bald patches" = possible alopecia areata. "Sudden shedding" = possible telogen effluvium.

## SECTION 2: HAIR LOSS PATTERN (6 questions)

**Q4: When did you first notice hair loss?**
- Type: Single select — <3 months / 3-6 months / 6-12 months / 1-3 years / 3-5 years / 5+ years
- AI use: <6 months + sudden = red flag for TE.

**Q5: How would you describe the progression?**
- Type: Single select
  - Slow and gradual
  - Steady — noticeable every few months
  - Rapid — significant change recently
  - Comes and goes
- AI use: "Rapid" or "comes and goes" = NOT typical AGA.

**Q6: Where are you losing hair? (Select all)**
- Type: Multi-select with visual head diagram
  - Hairline/forehead receding
  - Crown/top thinning
  - Temples thinning
  - Overall thinning everywhere
  - Specific patches/spots
  - Sides of head
  - Back of head
- AI use: Hairline + Crown + Temples = AGA. Patches = alopecia areata. Sides/Back = unusual.

**Q7: Which image best matches your hair loss?**
- Type: Visual select — Norwood-Hamilton scale (I through VII + "None match")
- AI use: Severity assessment. Cross-referenced with photos.

**Q8: Does anyone in your family have hair loss?**
- Type: Multi-select — Father / Maternal grandfather / Maternal uncles / Brothers / No one / Not sure
- AI use: Both sides = high AGA likelihood. Maternal grandfather strongest predictor.

**Q9: Has hair loss affected your confidence?**
- Type: Single select — Not at all / Slightly / Moderately / Significantly
- AI use: Helps doctor personalize message. Not clinical.

## SECTION 3: MEDICAL SCREENING (8 questions)

**Q10: Do you have any of these conditions? (Select all)**
- Type: Multi-select — Thyroid disorder / Diabetes / Autoimmune condition / Iron deficiency/anemia / Scalp psoriasis or eczema / Liver disease / Kidney disease / Depression or anxiety / Heart condition / None
- AI use: Thyroid + iron = independent hair loss causes. Liver = finasteride caution. Depression = mood risk flag.

**Q10b: [IF scalp condition] How severe?**
- Type: Single select — Mild / Moderate / Severe
- AI use: Severe may need treatment before hair loss protocol.

**Q11: Any of these in last 6 months? (Select all)**
- Type: Multi-select — Major surgery / Severe illness or high fever / Weight loss >10kg / Major stress / New medication / Crash diet / None
- AI use: ANY = telogen effluvium risk. Combined with sudden onset = likely TE, not AGA.

**Q12: Current medications? (Select all + free text)**
- Type: Multi-select — Blood thinners / BP meds / Antidepressants / Steroids / Isotretinoin / Testosterone/anabolic steroids / Thyroid meds / Diabetes meds / Statins / None / Other
- AI use: Drug interactions. Isotretinoin = wait. Testosterone = may worsen AGA.

**Q13: Drug allergies?**
- Type: Multi-select + free text — Minoxidil / Finasteride / Propylene glycol / Sulfa drugs / None / Other
- AI use: Minoxidil allergy = alternative formulation. Propylene glycol = foam instead of solution.

**Q14: Have you experienced any of these? (Select all)**
- Type: Multi-select — Decreased sex drive / Erectile difficulty / Breast tenderness / Mood changes from medication / None
- AI use: CRITICAL for finasteride safety. Existing issues = finasteride may worsen.

**Q15: Planning children in next 12 months?**
- Type: Single select — Yes / No / Not sure
- AI use: Finasteride affects sperm. Not absolute block but doctor must discuss.

**Q16: Blood work in last 12 months?**
- Type: Single select — Yes / No
- Sub: If yes, any abnormal results? Yes / No / Not sure
- AI use: No recent blood work + suspected thyroid/nutritional = recommend panel.

## SECTION 4: TREATMENT HISTORY (4 questions)

**Q17: Previous treatments? (Select all)**
- Type: Multi-select — Minoxidil / Finasteride / Dutasteride / Hair oils / Ayurvedic / Biotin supplements / PRP / Hair transplant / Ketoconazole shampoo / LLLT / None
- AI use: Prior response informs protocol.

**Q18: [IF tried minoxidil/finasteride] How long?**
- Type: Single select per treatment — <1 month / 1-3 months / 3-6 months / 6-12 months / >1 year
- AI use: <6 months = insufficient trial.

**Q19: [IF tried treatments] Side effects?**
- Type: Multi-select + text — Scalp irritation / Unwanted facial hair / Initial shedding / Sexual side effects / Mood changes / Breast tenderness / No side effects / Other
- AI use: Previous finasteride side effects = minoxidil-only protocol.

**Q20: Expectations from treatment?**
- Type: Single select — Stop further loss / Regrow some / Full restoration / Want guidance
- AI use: Norwood V+ wanting "full restoration" = expectations need adjustment.

## SECTION 5: LIFESTYLE (5 questions)

**Q21: Do you smoke?**
- Type: Single select — Yes daily / Occasionally / No / Quit recently
- AI use: Reduces scalp blood flow, affects minoxidil efficacy.

**Q22: Alcohol?**
- Type: Single select — Never / Occasionally / Regularly / Daily
- AI use: Daily = liver flag for finasteride.

**Q23: Diet?**
- Type: Single select — Balanced / Mostly vegetarian / Strictly vegetarian/vegan / Irregular/fast food / Restrictive diet
- AI use: Vegetarian/vegan in India = iron, zinc, B12 deficiency risk. Restrictive = TE trigger.

**Q24: Stress level?**
- Type: Single select — Low / Moderate / High / Very high
- AI use: Chronic high stress = TE risk factor.

**Q25: Sleep hours?**
- Type: Single select — <5 / 5-6 / 6-7 / 7-8 / >8
- AI use: Chronic sleep deprivation affects hair growth cycle.

---

# 4. PHOTO UPLOAD (4 Required)

| Photo | Guide | Why |
|---|---|---|
| Front hairline | Forehead visible, hair pulled back, eye level | Frontal recession assessment |
| Crown / top | From above, someone else takes or front camera + tilt | Vertex thinning |
| Left side | Profile showing temple | Temporal recession |
| Right side | Profile showing temple | Symmetry check |

**Tips:** Natural light, dry unstyled hair, no oil/gel/product, no flash, no hats. Minimum 1024x768.

**Quality checks:** Brightness, blur detection, head/scalp presence, resolution.

**Storage:** `s3://onlyou-patient-photos/patients/{id}/consultations/{cid}/{type}_{timestamp}.jpg`

---

# 5. AI PRE-ASSESSMENT — HAIR LOSS SPECIFIC

## Classification Categories

| Classification | Description | Attention | Action |
|---|---|---|---|
| `androgenetic_alopecia` | Pattern baldness | LOW | Prescribe standard |
| `telogen_effluvium_suspected` | Temporary shedding | HIGH | Blood work first |
| `alopecia_areata_suspected` | Autoimmune patchy loss | HIGH | Refer out |
| `scalp_condition_suspected` | Dermatitis, psoriasis, fungal | MEDIUM | May treat or refer |
| `medication_induced_suspected` | From current meds | HIGH | Discuss alternatives |
| `nutritional_deficiency_suspected` | Iron, zinc, B12, D | MEDIUM | Blood work first |
| `hormonal_suspected` | Thyroid imbalance | HIGH | Blood work first |
| `traction_alopecia_suspected` | From hairstyling | MEDIUM | Lifestyle change + possible treatment |
| `unclear_needs_examination` | Cannot determine | HIGH | Refer video/in-person |

## Red Flags (any = HIGH attention)
- Age <20 with rapid loss
- Onset <6 months AND "sudden/rapid"
- Patchy pattern
- Loss on sides/back
- On isotretinoin, chemo, blood thinners
- Existing sexual dysfunction
- Planning children
- Depression history + considering finasteride
- Weight loss >10kg recently
- Recent surgery/illness
- Scalp pain/itching/burning
- Female of childbearing age

## Contraindication Matrix for Finasteride

| Check | Source | Action |
|---|---|---|
| Female childbearing age | Q2, Q2b | BLOCK finasteride |
| Age <18 | Q1 | BLOCK all treatment |
| Pregnant/breastfeeding | Q2b | ABSOLUTE BLOCK |
| Liver disease | Q10 | Flag for doctor |
| Already on 5-ARI | Q12 | Flag duplicate |
| Previous finasteride side effects | Q19 | Suggest minoxidil-only |
| Planning children <12 months | Q15 | Flag for discussion |
| Current sexual dysfunction | Q14 | Flag, doctor decides |
| On blood thinners | Q12 | Flag interaction |
| Depression + on SSRIs | Q10, Q12 | Flag mood risk |
| Daily alcohol | Q22 | Flag liver concern |

## AI Prompt Template

```
You are a clinical pre-screening AI for a hair loss telehealth platform in India.
You are NOT a doctor. You screen, classify, and flag. The doctor makes all decisions.

Given the patient's questionnaire and photo descriptions:
1. Classify hair loss type (androgenetic_alopecia, telogen_effluvium_suspected, alopecia_areata_suspected, scalp_condition_suspected, medication_induced_suspected, nutritional_deficiency_suspected, hormonal_suspected, traction_alopecia_suspected, unclear_needs_examination)
2. Detect red flags
3. Check finasteride and minoxidil contraindications
4. Identify risk factors
5. Suggest protocol: conservative / standard / minoxidil_only / combination_plus / custom
6. Rate doctor_attention_level: low/medium/high

Be conservative. When in doubt, flag for doctor.
Never classify as androgenetic_alopecia with high confidence if onset is sudden (<6 months), pattern is patchy, or patient has recent major health events.

Patient data: {questionnaire_json}
Photo analysis: {photo_descriptions}

Respond ONLY with valid JSON: {schema}
```

---

# 6. PRESCRIPTION TEMPLATES

| Template | Medications | When to use |
|---|---|---|
| **Standard** | Finasteride 1mg daily + Minoxidil 5% twice daily | Typical AGA, no contraindications |
| **Minoxidil Only** | Minoxidil 5% twice daily | Finasteride contraindicated or patient declines |
| **Conservative** | Minoxidil 5% only for 3 months | Young (<22), mild, cautious |
| **Combination Plus** | Finasteride 1mg + Minoxidil 5% + Ketoconazole 2% shampoo 2x/week | AGA with dandruff/seborrheic component |
| **Advanced** | Finasteride 1mg + Minoxidil 5% + oral Minoxidil 2.5mg | Aggressive loss, doctor's discretion |
| **Female AGA** | Minoxidil 2% twice daily + Spironolactone 50-100mg (if appropriate) | Female pattern hair loss |
| **Custom** | Doctor builds from scratch | Unusual cases |

---

# 7. DOCTOR REVIEW — HAIR LOSS SPECIFIC

## Center Panel Additions
- **Norwood Scale Selector:** Visual chart with 7 stages, click to select. Required before action.
- **Photo Gallery:** 2x2 grid, click-to-zoom lightbox. For follow-ups: side-by-side comparison with date labels.
- **AI Pre-Assessment Tab:** Classification, red flags, contraindications, recommended protocol.

## Follow-Up Cadence
- Initial assessment → 6-8 week check-in → 3-month reassessment → 6-month evaluation → annual reviews
- Patient uploads new 4 photos at each check-in
- Doctor compares baseline vs current
- Typical follow-up: 2-3 minutes (compare photos, continue or adjust)

## Canned Messages (Hair Loss)
- "Your treatment plan is ready! Apply minoxidil twice daily to dry scalp and take finasteride once daily with or without food."
- "I need clearer photos. Please retake in natural light with dry, unstyled hair."
- "Please get the following blood tests: TSH, CBC, Ferritin, Vitamin D."
- "Great progress! Hair density is improving. Continue current treatment."
- "I'd like to adjust your treatment. Adding ketoconazole shampoo twice weekly."
- "Based on my assessment, your hair loss appears to be [condition]. I recommend [action]."

---

# 8. REFERRAL EDGE CASES — HAIR LOSS SPECIFIC

| Scenario | Doctor Action | Patient Experience |
|---|---|---|
| Alopecia areata (patchy loss) | Refer to partner clinic or video specialist | "Your hair loss pattern needs a specialist evaluation" |
| Telogen effluvium (stress/illness) | Order blood work, address root cause | "Let's check your blood levels first" |
| Scalp psoriasis causing hair loss | May treat (dermatologist can handle) or refer | "Treating your scalp condition first will help" |
| Thyroid suspected | Order thyroid panel via partner diagnostic centre (see master spec Section 7) | "Blood test needed before we can start treatment" |
| Iron deficiency suspected | Order CBC + Ferritin + TIBC | "Let's check your iron levels" |
| Norwood VI-VII wanting full regrowth | Set realistic expectations | "Medication can help maintain and potentially regrow some hair, but for significant restoration at this stage, a hair transplant consultation may be more appropriate" |
| Female patient wanting finasteride | Absolutely blocked | "Finasteride is not safe for women. We have other effective options for you" |
| Patient on isotretinoin | Postpone treatment | "Complete your acne treatment first, then we'll start hair loss treatment" |
| Patient returns after thyroid treatment | Reassess, may now qualify for standard protocol | "Welcome back! Let's see how your hair is doing now" |

## Blood Work Panels (Hair Loss)

> **All blood work is ordered via doctor dashboard and tracked through the portal system.** See master spec Section 7 for complete flow (patient books slot → phlebotomist collects at home → lab portal processes → results uploaded → doctor reviews).

| Panel | Tests | Cost (est.) | When |
|---|---|---|---|
| Hair Loss Basic | TSH, CBC, Ferritin, Vitamin D | ₹1,100 | Suspected nutritional/hormonal |
| Hair Loss Comprehensive | Basic + B12, Zinc, Hormonal (Testosterone, DHEA-S, Prolactin) | ₹2,500 | Female patients, unusual presentation |
| Thyroid Only | TSH, Free T3, Free T4 | ₹350 | Thyroid symptoms only |

---

# 9. MEDICATION FULFILLMENT

## Standard Kit Contents

| Medication | Quantity (30 days) | Approx. Cost |
|---|---|---|
| Finasteride 1mg tablets | 30 tablets | ₹150-250 |
| Minoxidil 5% solution/foam | 1 bottle (60ml) | ₹300-500 |
| Ketoconazole 2% shampoo (if prescribed) | 1 bottle (100ml) | ₹200-300 |
| Biotin supplement (if recommended) | 30 capsules | ₹100-150 |

**Packaging:** Discreet — "Onlyou" branding only. No "HAIR LOSS" or medication names visible.
**Delivery:** Local delivery (Rapido/Dunzo/own delivery person). Same-day or next-day in launch city. OTP-verified delivery. See master spec Section 8 for full flow.

---

*This file covers everything specific to the Hair Loss vertical. For shared infrastructure, see `onlyou-spec-master.md`.*
