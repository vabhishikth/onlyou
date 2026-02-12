# ONLYOU — PCOS (WOMEN'S HEALTH) VERTICAL SPECIFICATION
## Condition-Specific Questionnaire, AI Logic, Protocols & Edge Cases

> **Prerequisite:** Read `onlyou-spec-master.md` (v3) first for shared infrastructure.
> Key master spec sections relevant to this vertical:
> - Section 7: Blood Work & Diagnostics (portal-based, no Thyrocare)
> - Section 8: Medication Fulfillment (local delivery, no Shiprocket)
> - Section 4: Patient Tracking Screens (status steppers for labs + delivery)
> - **PCOS-specific notes:** Period tracking feature in patient app. Fertility intent changes entire treatment — tracked prominently in doctor dashboard.

---

# 1. CONDITION OVERVIEW

**Target:** Women 18-40 of reproductive age
**Doctor type:** Gynecologist / Endocrinologist / Reproductive Medicine specialist
**Consultation type:** Async initial + video follow-up recommended for complex cases
**Core treatments:** Hormonal birth control (cycle regulation), Metformin (insulin resistance), Spironolactone (anti-androgen for acne/hirsutism), lifestyle modification, nutritional supplements
**Key differentiator:** Holistic PCOS management addressing the root hormonal imbalance, not just individual symptoms. Covers periods, acne, excess hair, weight, and fertility planning — all under one subscription.
**Regulatory note:** PCOS diagnosis is clinical (based on 2 of 3 Rotterdam criteria: irregular periods, hyperandrogenism, polycystic ovaries on ultrasound). Onlyou can address the first two via telehealth. Ultrasound requires in-person referral.

---

# 2. PRICING

| Plan | Price | Includes |
|---|---|---|
| Monthly | ₹1,499/month | Consultation + medication + delivery |
| Quarterly | ₹3,799/quarter (₹1,266/mo) | Same + 16% savings |
| Annual | ₹13,999/year (₹1,167/mo) | Same + 22% savings |

---

# 3. QUESTIONNAIRE (32 Questions, ~8-10 minutes)

## Skip Logic Rules
- Q1 validates female sex (males redirected)
- Q5 = "Regular periods" → skip Q6, Q7, Q9
- Q19 = "No" (not trying to conceive) → skip Q20
- Q22 = "None" (no medical conditions) → skip Q23
- Q27 = "Never tried" → skip Q28, Q29

Most patients answer 25-28 questions after skip logic.

---

## SECTION 1: BASICS (3 questions)

**Q1: Biological sex?** — Auto-set Female. Males redirected.

**Q2: Age?** — Number (18-55). <18 blocked. >45 note: post-menopausal may need different evaluation.

**Q3: What brought you here? (Select all)**
- Type: Multi-select
  - Irregular or absent periods
  - Difficulty getting pregnant
  - Acne that won't clear up
  - Excess facial or body hair (hirsutism)
  - Weight gain or difficulty losing weight
  - Hair thinning on the scalp
  - Darkening of skin (neck, armpits, groin)
  - Mood swings, anxiety, or depression
  - Already diagnosed with PCOS, want treatment
  - I suspect I might have PCOS
- AI use: Symptom clustering. 2+ of (irregular periods, excess hair, acne, weight gain) = likely PCOS. "Already diagnosed" = skip screening, focus management.

## SECTION 2: MENSTRUAL CYCLE (6 questions)

**Q4: When was your last period?** — Date picker or approximate (last week / 2-3 weeks / 1-2 months / 3+ months / can't remember)

**Q5: How would you describe your periods?**
- Regular (24-35 days, predictable)
- Somewhat irregular (varies by a week+)
- Very irregular (sometimes skip months)
- Infrequent (few times a year)
- Absent (3+ months, not pregnant)
- On birth control so hard to tell
- AI use: Irregular/infrequent/absent = Rotterdam criterion #1.

**Q6: [IF irregular] How long have they been irregular?**
- Since puberty / Last 1-2 years / Last 6-12 months / Recently / N/A
- AI use: "Since puberty" = classic PCOS. "Recently" = may be stress or other cause.

**Q7: Are your periods heavy or painful?**
- Light / Normal / Heavy / Very heavy with large clots / Varies
- AI use: Very heavy = possible endometrial issues (PCOS patients at higher risk for endometrial hyperplasia).

**Q8: [IF irregular/absent] Have you been evaluated for the cause?**
- Yes, diagnosed PCOS / Yes, no diagnosis / No / Not sure
- AI use: Already diagnosed = focus on management.

**Q9: [IF irregular] Symptoms around period? (Select all)**
- Severe cramps / Bloating / Mood swings / Heavy bleeding / Spotting between periods / None

## SECTION 3: HYPERANDROGENISM SYMPTOMS (5 questions)

**Q10: Excess hair growth in which areas? (Select all)**
- Multi-select with body diagram: Upper lip/chin / Cheeks/sideburns / Chest / Abdomen / Back / Upper arms/thighs / None
- AI use: Hirsutism = hyperandrogenism signal. Multiple areas = more severe. Rotterdam criterion #2.

**Q11: Rate unwanted hair growth?**
- None / Mild / Moderate / Severe
- AI use: Modified Ferriman-Gallwey approximation.

**Q12: Current acne?**
- No / Mild / Moderate / Severe (deep/cystic) / Currently treating
- AI use: Cystic acne + irregular periods = strong PCOS signal.

**Q13: Scalp hair thinning?**
- No / Mild at part line / Noticeable / Significant/bald patches
- AI use: Female AGA = PCOS hyperandrogenism sign.

**Q14: Skin darkening (acanthosis nigricans)?**
- Multi-select: Back of neck / Armpits / Under breasts / Groin/thighs / None
- AI use: Strong insulin resistance marker. Suggests Metformin benefit.

## SECTION 4: WEIGHT & METABOLISM (4 questions)

**Q15: Height + Weight?** — System calculates BMI.

**Q16: Recent weight gain?**
- No / 5-10 kg last year / 10+ kg / Always overweight / Struggle to lose
- AI use: "Struggle to lose" + PCOS = insulin resistance likely.

**Q17: Where do you carry weight?**
- Evenly / Mainly belly (apple) / Mainly hips/thighs (pear) / Not overweight
- AI use: Central/apple = higher metabolic risk.

**Q18: Waist circumference?** — Optional, cm. >88cm = elevated risk.

## SECTION 5: FERTILITY & REPRODUCTIVE (3 questions)

**Q19: Currently trying to get pregnant?**
- Yes / No / Planning in next 12 months / Not sure
- AI use: CRITICAL. Changes entire treatment. Trying = NO spironolactone, NO combined BC.

**Q20: [IF trying] How long?**
- <6 months / 6-12 months / 1-2 years / 2+ years
- AI use: >12 months = infertility. May need fertility specialist.

**Q21: Pregnant or breastfeeding?**
- Yes pregnant / Yes breastfeeding / No
- AI use: Pregnant = BLOCK most medications.

## SECTION 6: MEDICAL SCREENING (5 questions)

**Q22: Medical conditions? (Select all)**
- Type 2 diabetes/pre-diabetes / Thyroid disorder / Endometriosis / High BP / High cholesterol / Blood clot history (DVT/PE) / Liver disease / Migraine with aura / Epilepsy / Depression/anxiety / Eating disorder / None
- AI use: Blood clots or migraine with aura = combined BC CONTRAINDICATED. Thyroid must be ruled out.

**Q23: Current medications? (Select all + text)**
- Birth control (type?) / Metformin / Thyroid meds / Antidepressants / BP meds / Spironolactone / None / Other

**Q24: Drug allergies?** — Free text / None

**Q25: Family history of PCOS, diabetes, or thyroid?**
- Mother PCOS / Sister PCOS / Family diabetes / Family thyroid / None / Not sure

**Q26: Blood work in last 12 months?**
- Yes / No. If yes, abnormal? Hormones / Blood sugar / Thyroid / Cholesterol / None / Don't know

## SECTION 7: TREATMENT HISTORY (3 questions)

**Q27: Previous PCOS treatments? (Select all)**
- Combined BC pills / Progesterone-only / Metformin / Spironolactone / Letrozole/Clomiphene / Anti-acne / Laser hair removal / Supplements (inositol, berberine) / Lifestyle changes / None

**Q28: [IF tried] Side effects?** — Free text

**Q29: What concerns you MOST? (Rank top 3)**
- Irregular periods / Fertility / Acne / Excess hair / Weight / Hair thinning / Mood / Long-term health
- AI use: Prioritizes treatment approach entirely.

## SECTION 8: LIFESTYLE (3 questions)

**Q30: Exercise?** — Sedentary / Light / Moderate / Active
**Q31: Diet?** — Balanced / Vegetarian / Vegan / Irregular / Low-carb
**Q32: Stress?** — Low / Moderate / High / Very high

---

# 4. PHOTO UPLOAD (Optional)

Not required. Doctor can REQUEST specific photos during review:
- Facial acne close-up (if acne primary concern)
- Hirsutism areas (if excess hair primary)
- Acanthosis nigricans (if dark patches reported)

---

# 5. AI PRE-ASSESSMENT — PCOS SPECIFIC

## Classification Categories

| Classification | Attention | Action |
|---|---|---|
| `pcos_classic` (irregular periods + androgen signs) | LOW-MED | Standard protocol |
| `pcos_lean` (normal BMI + cycle/androgen issues) | MEDIUM | Less insulin focus |
| `pcos_metabolic` (PCOS + insulin resistance + weight) | MEDIUM | Metformin + lifestyle |
| `pcos_fertility_focused` (trying to conceive) | HIGH | Different meds. Consider specialist. |
| `thyroid_suspected` | HIGH | Blood work FIRST |
| `not_pcos_suspected` | HIGH | Further evaluation |
| `endometriosis_possible` | HIGH | May need ultrasound/in-person |
| `needs_blood_work` | MEDIUM | Order comprehensive panel |

## Rotterdam Criteria Check
1. **Oligo/anovulation:** Q5 = irregular/infrequent/absent
2. **Hyperandrogenism:** Q10-11 (hirsutism), Q12 (acne), Q13 (hair loss) — clinical signs. OR biochemical (blood test)
3. **Polycystic ovaries:** Cannot assess via telehealth — refer for ultrasound if needed

2 of 3 criteria = PCOS likely.

## Red Flags
- Pregnant + requesting PCOS meds
- Blood clot history + requesting combined BC
- Migraine with aura + requesting combined BC
- Trying to conceive (completely different pathway)
- Very rapid virilization (deep voice, muscle mass, clitoromegaly) → possible tumor, URGENT referral
- Age >45 new-onset → may be perimenopause
- Severe depression + eating disorder
- Amenorrhea >6 months without evaluation (endometrial hyperplasia risk)

## Contraindication Matrix

| Medication | Contraindications |
|---|---|
| Combined OCP | Blood clots, migraine with aura, smoker >35, liver disease, breast cancer, uncontrolled HTN, pregnant/breastfeeding |
| Spironolactone | Pregnancy (teratogenic!), renal impairment, hyperkalemia |
| Metformin | Severe kidney/liver disease, alcohol abuse |
| Letrozole/Clomiphene | Only for fertility, requires monitoring |

## AI Output Extensions

```typescript
interface PCOSAssessment extends AIAssessment {
  rotterdam_criteria_met: number;
  criteria_details: {
    oligo_anovulation: boolean;
    hyperandrogenism_clinical: boolean;
    polycystic_ovaries: 'unknown';
  };
  pcos_phenotype: 'classic' | 'lean' | 'metabolic' | 'unclear';
  primary_concerns_ranked: string[];
  fertility_intent: 'trying' | 'planning_soon' | 'not_planning' | 'unsure';
  insulin_resistance_likely: boolean;
  blood_work_recommended: boolean;
  ultrasound_recommended: boolean;
}
```

---

# 6. PRESCRIPTION TEMPLATES

## NOT Trying to Conceive

| Template | Medications | When |
|---|---|---|
| **Cycle Regulation** | Combined OCP (Drospirenone/EE) | Irregular periods, no BC contraindications |
| **Anti-Androgen** | Spironolactone 50-100mg + Combined OCP | Acne/hirsutism primary, reliable contraception |
| **Insulin Focused** | Metformin 500→1500-2000mg + lifestyle | Insulin resistance, weight, acanthosis |
| **Comprehensive** | Combined OCP + Spironolactone + Metformin | Multiple symptoms, metabolic PCOS |
| **Lean PCOS** | Combined OCP + lifestyle | Normal BMI, cycle/androgen issues |
| **Natural/Supplement** | Myo-inositol 4g/day, Vitamin D, Omega-3, lifestyle | Prefers minimal medication |
| **Progestin Only** | Cyclical progesterone or POP | BC contraindications |

## Trying to Conceive

| Template | When |
|---|---|
| **Lifestyle First** (weight loss 5-10%, diet, supplements) | Mild, recently started trying, overweight |
| **Ovulation Induction** (Letrozole 2.5-5mg day 3-7) | First-line for PCOS infertility |
| **Metformin + Lifestyle** (3-6 months prep) | Insulin resistant, preparing for conception |
| **Refer to Fertility Specialist** | Trying >12 months or complex |

---

# 7. DOCTOR REVIEW — PCOS SPECIFIC

## Center Panel Additions
- **Rotterdam Criteria Checklist:** 3-checkbox visual
- **Symptom Severity Dashboard:** Gauges for periods, acne, hirsutism, weight, hair, mood
- **Fertility Intent Banner:** "⚠️ TRYING TO CONCEIVE — Adjust treatment"
- **Menstrual Calendar:** Timeline of reported cycles
- **Photos Tab:** If submitted

## Follow-Up Cadence
- Initial → 4 weeks (tolerating meds?) → monthly × 3 → quarterly
- Period tracking in app (patient reports each period)
- Acne/hirsutism photo check-in every 3 months
- Blood work: baseline + 3 months + annual
- Spironolactone: potassium check at 1 and 3 months

## Blood Work Panels

> **All blood work ordered via doctor dashboard, tracked through portal system.** See master spec Section 7. PCOS patients almost always need diagnostic blood work — this vertical will be the heaviest user of the blood work system.

| Panel | Tests | Cost | When |
|---|---|---|---|
| PCOS Diagnostic | Total/Free Testosterone, DHEA-S, LH, FSH, TSH, Fasting glucose, Fasting insulin, HbA1c | ₹3,000 | All new patients |
| Metabolic Add-On | Lipid panel, Liver function, Vitamin D, B12 | ₹1,200 | Overweight, Metformin candidates |
| Fertility Panel | Above + AMH, Prolactin, Estradiol, Progesterone day 21 | ₹4,500 | Trying to conceive |
| Follow-Up | Testosterone, Glucose, HbA1c, Potassium (if spironolactone) | ₹1,500 | Every 3-6 months |

---

# 8. REFERRAL EDGE CASES

| Scenario | Action | Message |
|---|---|---|
| Needs ultrasound | Refer to imaging center | "To confirm diagnosis, we recommend a pelvic ultrasound." |
| Trying >12 months | Refer fertility specialist | "A fertility specialist can offer monitored treatments." |
| Rapid virilization | URGENT endocrinologist referral | "Symptoms need urgent in-person evaluation." |
| Blood clots + wants BC | Progestin-only options | "Combined BC isn't safe. Here are alternatives." |
| Severe cystic acne | Refer dermatologist | "May need isotretinoin (requires in-person)." |
| Eating disorder | Counseling referral | "Let's connect you with a counselor alongside PCOS care." |
| Endometriosis suspected | Gynecologist in-person | "Additional condition needs in-person evaluation." |
| Amenorrhea >6 months | Blood work + endometrial protection discussion | "Long gaps can affect uterine health." |

---

# 9. MEDICATION FULFILLMENT

| Medication | Quantity (30 days) | Cost |
|---|---|---|
| Combined OCP | 1 pack | ₹200-500 |
| Spironolactone 50mg | 30-60 tablets | ₹150-300 |
| Metformin 500mg | 60-120 tablets | ₹100-300 |
| Myo-inositol 2g sachets | 60 sachets | ₹400-700 |
| Vitamin D 60,000 IU weekly | 4-8 sachets | ₹100-200 |

**Packaging:** Maximum discretion. "Onlyou" only, no condition/medication names visible.
**Delivery:** Local delivery (Rapido/Dunzo/own delivery person). OTP-verified. See master spec Section 8 for full flow.

---

# 10. SPECIAL CONSIDERATIONS

## Cross-Vertical Awareness
PCOS patients may overlap with Hair Loss and Weight verticals. The system should detect multi-vertical subscriptions and flag overlap for the doctor. PCOS doctor should manage hair loss and weight as part of PCOS, not duplicate consultations.

## Indian Cultural Sensitivity
- Many young women unaware of PCOS until trying to conceive
- Family fertility pressure is common — sensitive messaging
- Hirsutism stigma particularly high
- Unmarried patients may be uncomfortable with sexual health questions — keep neutral
- Period tracking may be new — provide guidance

## Long-Term Health Monitoring
PCOS increases risk of: Type 2 diabetes (annual HbA1c), cardiovascular disease (annual lipids), endometrial hyperplasia/cancer (ensure ≥4 periods/year), depression/anxiety (regular screening), sleep apnea (screen if overweight). Build automated reminders into care plan.

---

*For shared infrastructure, see `onlyou-spec-master.md`.*
