# ONLYOU — WEIGHT MANAGEMENT VERTICAL SPECIFICATION
## Condition-Specific Questionnaire, AI Logic, Protocols & Edge Cases

> **Prerequisite:** Read `onlyou-spec-master.md` (v3) first for shared infrastructure.
> Key master spec sections relevant to this vertical:
> - Section 7: Blood Work & Diagnostics (portal-based, no Thyrocare)
> - Section 8: Medication Fulfillment (local delivery, no Shiprocket)
> - Section 4: Patient Tracking Screens (status steppers for labs + delivery)
> - **Weight-specific note:** Most weight patients need baseline blood work — blood work flow will be very common for this vertical.

---

# 1. CONDITION OVERVIEW

**Target:** Men & Women 18-55 with BMI ≥25 (overweight) or ≥30 (obese)
**Doctor type:** Endocrinologist / Internal Medicine / Bariatric Medicine
**Consultation type:** Async initial + periodic video check-ins recommended
**Core treatments:** Orlistat, Metformin (if insulin resistant), lifestyle modification plan, nutritional supplements. Future: GLP-1 agonists when available/affordable in India.
**Key differentiator:** Medically supervised weight loss, not just a diet app. Blood work-driven approach addressing root causes (thyroid, insulin resistance, PCOS-related weight gain).
**Note:** GLP-1 medications (semaglutide/Ozempic, liraglutide/Saxenda) are available in India but expensive (₹5,000-15,000/month). Onlyou offers them as a premium tier. Standard tier uses Orlistat + Metformin + lifestyle.

---

# 2. PRICING

| Plan | Price | Includes |
|---|---|---|
| Standard Monthly | ₹2,999/month | Consultation + Orlistat/Metformin + diet plan + delivery |
| Standard Quarterly | ₹7,999/quarter (₹2,666/mo) | Same + 11% savings |
| Premium Monthly (GLP-1) | ₹9,999/month | Consultation + GLP-1 medication + diet plan + delivery |
| Premium Quarterly (GLP-1) | ₹24,999/quarter (₹8,333/mo) | Same + 17% savings |

---

# 3. QUESTIONNAIRE (30 Questions, ~7-10 minutes)

## Skip Logic Rules
- Q2 = Male → skip Q8 (menstrual cycle)
- Q2 = Female → add Q8, Q8b
- Q11 = "No medical conditions" → skip Q12
- Q20 = "Never tried" → skip Q21, Q22
- Q9 = BMI <25 → show message: "Based on your BMI, you may not need a medical weight management program. Would you like to continue for a general health assessment?"

---

## SECTION 1: BASICS (4 questions)

**Q1: Age?** — Number (18-80). <18 blocked.

**Q2: Biological sex?** — Male / Female. Affects treatment (metformin dosing, GLP-1 pregnancy contraindications).

**Q3: What is your primary weight concern?**
- Type: Single select
  - "I want to lose weight for health reasons"
  - "I want to lose weight for appearance/confidence"
  - "I've been told by a doctor I need to lose weight"
  - "I keep gaining weight despite trying to control it"
  - "I gained weight after a medication, pregnancy, or life change"
  - "I have difficulty losing weight and suspect a medical reason"
- AI use: "Suspect medical reason" or "can't lose despite trying" = potential thyroid, insulin resistance, PCOS.

**Q4: What is your weight loss goal?**
- Type: Single select
  - Lose 5-10 kg
  - Lose 10-20 kg
  - Lose 20-30 kg
  - Lose 30+ kg
  - Not sure — want professional guidance
- AI use: Goals >30kg may need bariatric referral discussion. Sets realistic timeline expectations.

## SECTION 2: BODY MEASUREMENTS (4 questions)

**Q5: What is your height?** — cm or feet/inches (toggle)

**Q6: What is your current weight?** — kg

**Q7: What is your waist circumference?** (optional but encouraged)
- Instructions: "Measure around your belly button with a tape measure. Stand straight, breathe normally."
- Type: cm input
- AI use: Waist >102cm (men) or >88cm (women) = central obesity, higher metabolic risk.

**Q8: [WOMEN ONLY] Are your periods regular?**
- Type: Single select — Yes, regular / Irregular (vary a lot) / Very infrequent (every few months) / I don't get periods / Post-menopausal
- AI use: Irregular + weight gain + other symptoms = possible PCOS (redirect to PCOS vertical or flag).

**Q8b: [IF irregular] Do you also experience excess facial/body hair or acne?**
- Type: Single select — Yes / No
- AI use: Yes = likely PCOS. Suggest PCOS vertical instead.

**System calculates and displays:**
- BMI = weight / (height in m)²
- BMI category: Underweight (<18.5) / Normal (18.5-24.9) / Overweight (25-29.9) / Obese Class I (30-34.9) / Obese Class II (35-39.9) / Obese Class III (≥40)
- Note: For Indian population, WHO Asian criteria apply: Overweight ≥23, Obese ≥25

## SECTION 3: WEIGHT HISTORY (4 questions)

**Q9: What has your weight been like over the past few years?**
- Type: Single select
  - Steadily increasing year over year
  - Went up sharply in the last 6-12 months
  - Goes up and down (yo-yo)
  - Been overweight since childhood/adolescence
  - Was normal weight until a specific event
- AI use: "Sharp increase" = possible medication, thyroid, hormonal cause. "Since childhood" = genetic/metabolic, needs comprehensive approach.

**Q10: What's the most you've ever weighed, and when?**
- Type: Weight (kg) + approximate timeframe (free text)
- AI use: Trend data for doctor.

**Q11: Have you lost and regained weight multiple times (yo-yo dieting)?**
- Type: Single select — Yes, many times / Once or twice / No
- AI use: Yo-yo = metabolic adaptation, may need different approach. Important for setting expectations.

**Q12: What triggered your weight gain? (Select all)**
- Type: Multi-select
  - Nothing specific — it just happened gradually
  - Started a new medication
  - Pregnancy / postpartum
  - Quit smoking
  - Stressful life event (job, relationship, bereavement)
  - Injury/illness that reduced activity
  - Work/lifestyle change (sedentary job, WFH)
  - COVID lockdown
  - None of these
- AI use: Medication-induced = review meds. Post-pregnancy + irregular periods = PCOS screen. Stress = cortisol-driven weight gain.

## SECTION 4: MEDICAL SCREENING (6 questions)

**Q13: Do you have any of these conditions? (Select all)**
- Type: Multi-select
  - Type 2 diabetes
  - Pre-diabetes / insulin resistance
  - Thyroid disorder (hypo/hyperthyroidism)
  - PCOS (women)
  - High blood pressure
  - High cholesterol
  - Sleep apnea
  - Fatty liver disease
  - Heart disease
  - Kidney disease
  - Gallbladder disease / gallstones
  - History of pancreatitis
  - Eating disorder (current or past: anorexia, bulimia, binge eating)
  - Depression or anxiety
  - None of these
- AI use: Diabetes/pre-diabetes = Metformin candidate. Thyroid = blood work first. Pancreatitis = GLP-1 CONTRAINDICATED. Eating disorder = CAREFUL — may not be appropriate for medication-based weight loss. Gallstones = Orlistat caution.

**Q14: Are you currently taking any medications? (Select all + free text)**
- Type: Multi-select
  - Diabetes medication (Metformin, insulin, sulfonylureas)
  - Thyroid medication
  - Blood pressure medication
  - Antidepressants (SSRIs, SNRIs, TCAs)
  - Antipsychotics
  - Steroids (prednisone)
  - Birth control (hormonal)
  - Anticonvulsants/mood stabilizers
  - None
  - Other: [free text]
- AI use: Many psych meds cause weight gain (antipsychotics, TCAs, some SSRIs). Steroids = significant weight gain. Already on Metformin = different dosing approach.

**Q15: [IF FEMALE] Are you pregnant, breastfeeding, or planning pregnancy in next 12 months?**
- Type: Single select — Yes / No
- AI use: Yes = ABSOLUTE BLOCK for Orlistat and GLP-1 medications. Lifestyle modification only.

**Q16: Do you have a history of pancreatitis?**
- Type: Single select — Yes / No / Not sure
- AI use: Yes = GLP-1 medications CONTRAINDICATED (can cause pancreatitis).

**Q17: Do you have a personal or family history of thyroid cancer (medullary thyroid carcinoma) or MEN2 syndrome?**
- Type: Single select — Yes / No / Not sure
- AI use: Yes = GLP-1 medications CONTRAINDICATED (warning from clinical trials).

**Q18: Drug allergies?**
- Type: Free text / None

## SECTION 5: DIET & LIFESTYLE (5 questions)

**Q19: How would you describe your eating habits?**
- Type: Single select
  - I eat regular meals but large portions
  - I skip meals and then overeat
  - I snack frequently throughout the day
  - I eat late at night
  - I eat due to stress/emotions
  - I eat a fairly healthy diet but still gain weight
  - I eat a lot of processed/fast food
- AI use: Identifies behavioral patterns. Emotional eating = may need counseling. "Healthy but still gaining" = possible metabolic/hormonal cause.

**Q20: How many meals/snacks do you typically eat per day?**
- Type: Single select — 1-2 / 3 / 4-5 / 6+ / Very irregular

**Q21: Diet type?**
- Type: Single select — Balanced non-veg / Mostly vegetarian / Strictly vegetarian / Vegan / No specific pattern
- AI use: Nutritional planning for the diet plan included in subscription.

**Q22: Physical activity?**
- Type: Single select — Sedentary (no exercise) / Light (1-2x/week walking) / Moderate (3-4x/week) / Active (5+ times/week) / Physically demanding job
- AI use: Sedentary + high BMI = exercise prescription important alongside medication.

**Q23: Sleep?**
- Type: Single select — <5 hours / 5-6 / 6-7 / 7-8 / >8
- AI use: <6 hours = affects weight loss hormones (leptin, ghrelin). Sleep apnea screening.

## SECTION 6: TREATMENT HISTORY (4 questions)

**Q24: Previous weight loss attempts? (Select all)**
- Type: Multi-select
  - Diet changes (calorie counting, keto, intermittent fasting, etc.)
  - Exercise programs
  - Weight loss medications (Orlistat/Alli, Sibutramine, others)
  - GLP-1 medications (Ozempic, Wegovy, Saxenda)
  - Ayurvedic/herbal weight loss products
  - Bariatric surgery
  - Commercial programs (HealthifyMe, Cult.fit, etc.)
  - None
- AI use: Prior medication response. Prior GLP-1 experience = valuable. Bariatric surgery history = very different approach needed.

**Q25: [IF tried medications] How long and what happened?**
- Type: Free text
- AI use: Duration, efficacy, side effects of previous treatments.

**Q26: [IF tried medications] Side effects?**
- Type: Multi-select — Nausea/vomiting / Diarrhea / Constipation / Stomach pain / Headache / Gallbladder issues / None / Other
- AI use: GI side effects from prior weight meds = dose titration needed. Gallbladder issues = Orlistat caution.

**Q27: Have you had blood work in the last 12 months?**
- Type: Yes / No
- Sub: Any abnormal results? — HbA1c / Thyroid / Cholesterol / Liver / Other / None / Don't know
- AI use: Determines if blood work needed before starting. Most weight management patients SHOULD get baseline labs.

## SECTION 7: MOTIVATION & EXPECTATIONS (3 questions)

**Q28: What's your biggest challenge with weight management?**
- Type: Single select
  - Controlling hunger/cravings
  - Staying motivated long-term
  - Finding time for exercise
  - Emotional/stress eating
  - Medical condition making it harder
  - Don't know what's working against me
- AI use: Personalizes approach and doctor messaging.

**Q29: Are you interested in medication-assisted weight loss?**
- Type: Single select
  - Yes — I've struggled with lifestyle changes alone
  - Open to it if the doctor recommends
  - Prefer lifestyle-only approach
  - Specifically interested in GLP-1 medications
- AI use: Respects patient preference. "GLP-1 specifically" = discuss pricing and availability.

**Q30: Timeline expectations?**
- Type: Single select
  - I want quick results (1-3 months)
  - Steady progress over 6-12 months
  - Long-term sustainable change
  - No specific timeline
- AI use: "Quick results" = manage expectations. Safe weight loss is 0.5-1 kg/week.

---

# 4. PHOTO UPLOAD (2 Required, 1 Optional)

| Photo | Guide | Why |
|---|---|---|
| Full body — front | Standing straight, arms at sides, wearing fitted clothes | Baseline body composition reference |
| Full body — side | Same position, 90° angle | Abdominal fat distribution |
| Waist measurement (optional) | Close-up of tape measure around waist at navel | Verify waist circumference if provided |

**Tips:** Consistent lighting, same clothes for follow-ups, plain background.
**These are for doctor reference and progress tracking only, not for AI analysis.**

---

# 5. AI PRE-ASSESSMENT — WEIGHT MANAGEMENT SPECIFIC

## Classification Categories

| Classification | Description | Attention | Action |
|---|---|---|---|
| `lifestyle_obesity` | Overweight/obese, no significant medical factors | LOW | Standard protocol: Orlistat + lifestyle |
| `insulin_resistant` | Signs of insulin resistance/pre-diabetes | MEDIUM | Metformin + lifestyle. Blood work if no recent HbA1c. |
| `thyroid_suspected` | Symptoms suggest hypothyroidism | HIGH | Blood work (TSH, T3, T4) BEFORE starting any weight meds |
| `pcos_related` | Female + irregular periods + weight gain | HIGH | Redirect to PCOS vertical or co-manage |
| `medication_induced` | Weight gain correlates with starting medication | HIGH | Cannot change their other meds — discuss with their doctor |
| `eating_disorder_flag` | History or current eating disorder | CRITICAL | May not be appropriate for medication. Needs careful approach. |
| `binge_eating` | Emotional/stress eating pattern primary driver | MEDIUM | Counseling + possibly medication |
| `bariatric_candidate` | BMI ≥40 or ≥35 with comorbidities, failed other attempts | HIGH | Discuss bariatric surgery referral alongside medication |
| `glp1_candidate` | Meets criteria for GLP-1 therapy | MEDIUM | Offer premium tier, check contraindications |
| `underweight_concern` | BMI <18.5 requesting weight loss | CRITICAL | DO NOT prescribe. Screen for eating disorder. Refer. |

## Red Flags
- BMI <18.5 requesting weight loss (eating disorder concern)
- Active or recent eating disorder (anorexia, bulimia)
- History of pancreatitis (GLP-1 contraindicated)
- Family history of medullary thyroid carcinoma (GLP-1 contraindicated)
- Pregnant/breastfeeding
- Suicidal ideation (some weight loss meds linked to mood changes)
- Very rapid weight gain (>5kg in 1 month without explanation)
- Unexplained weight loss (could indicate cancer, hyperthyroidism)
- Gallstones + requesting Orlistat

## Contraindication Matrix

| Medication | Contraindications | Source |
|---|---|---|
| **Orlistat** | Chronic malabsorption, cholestasis, pregnancy, breastfeeding. Caution: gallstones, oxalate kidney stones | Q13, Q15 |
| **Metformin** | Severe kidney disease (eGFR <30), liver disease, alcohol abuse, pregnancy | Q13, Q15, Q22 |
| **GLP-1 (semaglutide/liraglutide)** | Pancreatitis history, personal/family MTC or MEN2, pregnancy, breastfeeding, eating disorder | Q13, Q15, Q16, Q17 |

## AI Output Extensions

```typescript
interface WeightAssessment extends AIAssessment {
  bmi: number;
  bmi_category: string;           // WHO Asian criteria
  waist_circumference_risk: string; // normal/elevated/high
  metabolic_risk_level: 'low' | 'moderate' | 'high';
  insulin_resistance_likely: boolean;
  thyroid_check_recommended: boolean;
  pcos_screening_recommended: boolean;   // women only
  eating_disorder_flag: boolean;
  glp1_eligible: boolean;
  bariatric_discussion_warranted: boolean;
  recommended_blood_panels: string[];
}
```

---

# 6. PRESCRIPTION TEMPLATES

| Template | Medications | Eligibility |
|---|---|---|
| **Lifestyle Only** | Diet plan + exercise plan + supplements (Vitamin D, fiber) | BMI 25-29.9, no comorbidities, patient prefers no meds |
| **Standard (Orlistat)** | Orlistat 120mg with each main meal (3x daily) + multivitamin | BMI ≥28 or ≥25 with comorbidities |
| **Metformin Add-On** | Metformin 500mg → titrate to 1000-2000mg + above | Pre-diabetes, insulin resistance, PCOS co-management |
| **GLP-1 Standard** | Semaglutide 0.25mg weekly → titrate up to 2.4mg over 16-20 weeks | BMI ≥30 or ≥27 with comorbidities, premium tier |
| **GLP-1 + Metformin** | Semaglutide + Metformin | Insulin resistant + premium tier |
| **Custom** | Doctor builds | Complex cases |

**All prescriptions include:**
- Personalized calorie target (based on BMR calculation)
- Macronutrient guidelines (protein emphasis for muscle preservation)
- Exercise recommendation (frequency, type, duration)
- Behavioral tips matching their identified challenge (Q28)

---

# 7. DOCTOR REVIEW — WEIGHT SPECIFIC

## Center Panel Additions
- **BMI Calculator Display:** Large — "BMI: 32.4 — Obese Class I (WHO Asian Criteria)"
- **Metabolic Risk Panel:** Color-coded based on BMI + waist + comorbidities
- **Weight Trend Chart:** (follow-ups) — graph showing weight over time
- **Blood Work Results Tab:** If labs ordered, display inline
- **Body Photos:** Side-by-side comparison for follow-ups

## Follow-Up Cadence
- Initial → 2-week check-in (tolerating medication?) → monthly weigh-ins → 3-month blood work → 6-month comprehensive review
- Expected: 0.5-1 kg/week loss on standard tier, 1-2 kg/week on GLP-1
- If not losing after 3 months → reassess, adjust protocol, consider upgrade or referral

## Blood Work Panels (Weight)

> **All blood work ordered via doctor dashboard, tracked through portal system.** See master spec Section 7. Most weight management patients SHOULD get baseline labs — this vertical will use the blood work system heavily.

| Panel | Tests | Cost | When |
|---|---|---|---|
| Metabolic Basic | Fasting glucose, HbA1c, Lipid panel, TSH | ₹1,200 | All new patients (recommended) |
| Metabolic Comprehensive | Basic + Insulin (fasting), Liver function (ALT, AST), Kidney function (creatinine, eGFR), Vitamin D, B12 | ₹2,800 | Suspected insulin resistance, on Metformin |
| GLP-1 Baseline | Comprehensive + Amylase, Lipase | ₹3,200 | Before starting GLP-1 (pancreas check) |
| Follow-Up | HbA1c, Lipid panel, Liver function | ₹800 | Every 3-6 months |

---

# 8. REFERRAL EDGE CASES — WEIGHT SPECIFIC

| Scenario | Action | Message |
|---|---|---|
| BMI ≥40 (Class III obesity) | Offer medication + discuss bariatric surgery referral | "Medication can help, but at your BMI, bariatric surgery may offer more significant, lasting results. We can refer you to a surgeon while also starting medication." |
| Active eating disorder | DO NOT prescribe weight loss meds. Refer to mental health professional. | "We want to help you with your weight goals safely. Given your history, I recommend working with a counselor who specializes in eating and body image before starting medication." |
| Thyroid suspected | Order TSH panel BEFORE any weight meds | "Let's check your thyroid first — it could be the main reason for weight gain." |
| PCOS suspected (women) | Redirect to PCOS vertical or co-manage | "Your symptoms suggest PCOS may be contributing to weight gain. Our PCOS program addresses both hormones and weight together." |
| Pancreatitis history + wants GLP-1 | BLOCK GLP-1. Offer Orlistat/Metformin instead. | "GLP-1 medications aren't safe with your history. We have other effective options." |
| Patient not losing weight after 3 months | Reassess: check medication adherence, diet, consider blood work for underlying cause | "Let's figure out what's blocking progress." |
| Patient wants GLP-1 but BMI <27 | Not medically indicated for weight loss | "At your current BMI, GLP-1 medication isn't recommended. Our lifestyle program would be more appropriate." |
| Medication-induced weight gain | Cannot change their other meds from Onlyou. Refer back to prescriber. Support with lifestyle. | "Your weight gain may be related to [medication]. I'd recommend discussing alternatives with your prescribing doctor. Meanwhile, we can support you with lifestyle strategies." |

---

# 9. MEDICATION FULFILLMENT

| Medication | Quantity (30 days) | Approx. Cost |
|---|---|---|
| Orlistat 120mg (90 capsules) | 90 capsules (3/day) | ₹800-1,200 |
| Metformin 500mg (60 tablets) | 60 tablets (2/day) | ₹100-200 |
| Multivitamin (Orlistat patients) | 30 tablets | ₹150-300 |
| Semaglutide injection (premium) | 4 pens/month | ₹5,000-12,000 |
| Fiber supplement | 30 sachets | ₹200-400 |

**Packaging:** Discreet. "Onlyou" branding only.
**Delivery:** Local delivery (Rapido/Dunzo/own delivery person). OTP-verified. See master spec Section 8 for full flow.
**Orlistat patients get a "starter guide":** How to manage GI side effects (take with meals, reduce fat intake, start gradually).
**GLP-1 patients (future):** May need temperature-controlled delivery for injectables — flagged for when scaling.

---

*This file covers everything specific to the Weight Management vertical. For shared infrastructure, see `onlyou-spec-master.md`.*
