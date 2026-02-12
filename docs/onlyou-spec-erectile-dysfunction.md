# ONLYOU — ERECTILE DYSFUNCTION VERTICAL SPECIFICATION
## Condition-Specific Questionnaire, AI Logic, Protocols & Edge Cases

> **Prerequisite:** Read `onlyou-spec-master.md` (v3) first for shared infrastructure.
> Key master spec sections relevant to this vertical:
> - Section 7: Blood Work & Diagnostics (portal-based, no Thyrocare)
> - Section 8: Medication Fulfillment (local delivery, no Shiprocket)
> - Section 4: Patient Tracking Screens (status steppers for labs + delivery)
> - **ED-specific note:** NO photos in tracking — stepper shows questionnaire + delivery only.

---

# 1. CONDITION OVERVIEW

**Target:** Men 25-60
**Doctor type:** Urologist / Andrologist / Sexual Medicine specialist
**Consultation type:** Async (questionnaire only — NO photos required)
**Core treatments:** Sildenafil (Viagra generic), Tadalafil (Cialis generic), lifestyle counseling
**Key differentiator:** Maximum privacy — no photos, no video calls, no clinic visits. Pure text-based async consultation.
**Regulatory note:** Sildenafil and Tadalafil are Schedule H drugs in India — require prescription, can be prescribed via telemedicine.

---

# 2. PRICING

| Plan | Price | Includes |
|---|---|---|
| Monthly | ₹1,299/month | Consultation + medication + discreet delivery |
| Quarterly | ₹3,299/quarter (₹1,100/mo) | Same + 15% savings |
| Annual | ₹11,999/year (₹1,000/mo) | Same + 23% savings |

Higher pricing than hair loss because ED medications cost more and the stigma premium allows it.

---

# 3. QUESTIONNAIRE (28 Questions, ~6-8 minutes)

## Skip Logic Rules
- Q3 = "Never able to get an erection" → skip Q4, Q5 (already maximum severity)
- Q14 = "No medications" → skip Q15
- Q22 = "Never tried treatments" → skip Q23, Q24
- Q10 = "No cardiovascular conditions" → Q11 becomes optional

Most patients answer 22-25 questions after skip logic.

---

## SECTION 1: BASICS (3 questions)

**Q1: What is your age?**
- Type: Number input (18-80)
- Validation: <18 = blocked
- AI use: Age affects treatment approach. >65 = more conservative dosing.

**Q2: What is your biological sex?**
- Type: Single select — Male
- Note: This vertical is male-only. If user selects Female, redirect to PCOS or other appropriate vertical.

**Q3: Which best describes your situation?**
- Type: Single select
  - "I can get an erection but have trouble maintaining it"
  - "I have difficulty getting an erection at all"
  - "I sometimes get erections but they're not firm enough for sex"
  - "I get erections but only occasionally — it's inconsistent"
  - "I've never been able to get an erection adequate for sex"
  - "I'm experiencing reduced sex drive / low libido"
  - "I'm experiencing premature ejaculation" (future — redirect or note)
- AI use: Primary classification. "Never able" = may need in-person urology referral. "Reduced sex drive only" = may be hormonal, not vascular.

## SECTION 2: IIEF-5 SEVERITY ASSESSMENT (5 questions)

The International Index of Erectile Function (IIEF-5) is the gold standard screening tool. Include all 5 questions exactly:

**Q4: Over the past 6 months, how do you rate your confidence that you could get and keep an erection?**
- Type: Scale 1-5 — Very low (1) / Low (2) / Moderate (3) / High (4) / Very high (5)

**Q5: When you had erections with sexual stimulation, how often were your erections hard enough for penetration?**
- Type: Scale 1-5 — Almost never or never (1) / A few times (2) / Sometimes (3) / Most times (4) / Almost always or always (5)

**Q6: During sexual intercourse, how often were you able to maintain your erection after penetration?**
- Type: Scale 1-5 — Same scale as Q5

**Q7: During sexual intercourse, how difficult was it to maintain your erection to completion?**
- Type: Scale 1-5 — Extremely difficult (1) / Very difficult (2) / Difficult (3) / Slightly difficult (4) / Not difficult (5)

**Q8: When you attempted sexual intercourse, how often was it satisfactory?**
- Type: Scale 1-5 — Almost never or never (1) / A few times (2) / Sometimes (3) / Most times (4) / Almost always or always (5)

**IIEF-5 Scoring (calculated by system):**
- Sum of Q4-Q8 scores (5-25)
- 22-25: No ED
- 17-21: Mild ED
- 12-16: Mild to moderate ED
- 8-11: Moderate ED
- 5-7: Severe ED
- AI use: Primary severity measure. Severe = higher attention, may need in-person evaluation.

## SECTION 3: ONSET & PATTERN (4 questions)

**Q9: When did you first notice erectile difficulty?**
- Type: Single select — <3 months / 3-6 months / 6-12 months / 1-3 years / 3+ years / As long as I can remember
- AI use: Sudden onset (<3 months) = possible vascular event, medication side effect, or psychological trigger. Gradual = likely organic/vascular.

**Q10: How did the problem start?**
- Type: Single select
  - Gradually got worse over time
  - Suddenly — it was fine and then it wasn't
  - After starting a new medication
  - After a stressful life event
  - After surgery or injury
- AI use: "Suddenly" = possible psychological or medication cause. "After medication" = review meds. "After surgery" = may need in-person.

**Q11: Do you get erections at other times?**
- Type: Multi-select
  - Morning erections (wake up with erection)
  - Erections when masturbating (but not during sex)
  - Erections from visual stimulation but lose them during sex
  - Rarely/never get erections in any situation
- AI use: CRITICAL. Morning erections present = likely psychological cause (the plumbing works, the issue is situational). No erections at all = likely organic/vascular. Erections during masturbation but not sex = performance anxiety.

**Q12: Is the problem consistent or situational?**
- Type: Single select
  - Every time — regardless of partner or situation
  - Situational — works sometimes but not others
  - Only with a specific partner
  - Only during intercourse (fine during foreplay/oral)
- AI use: Situational/partner-specific = likely significant psychological component.

## SECTION 4: MEDICAL SCREENING — CARDIOVASCULAR (7 questions)

This section is CRITICAL because PDE5 inhibitors (sildenafil, tadalafil) affect blood pressure and are contraindicated with nitrates.

**Q13: Do you have any of these conditions? (Select all)**
- Type: Multi-select
  - Heart disease / history of heart attack
  - Stroke / history of stroke
  - High blood pressure (hypertension)
  - Low blood pressure (hypotension)
  - Irregular heartbeat (arrhythmia)
  - Chest pain (angina)
  - Heart failure
  - Diabetes (Type 1 or Type 2)
  - High cholesterol
  - Peyronie's disease (curved penis)
  - Prostate problems (BPH, prostatitis, prostate cancer treatment)
  - Kidney disease
  - Liver disease
  - Sickle cell disease
  - Blood disorder (leukemia, multiple myeloma)
  - None of these
- AI use: Heart disease + nitrates = ABSOLUTE block for PDE5 inhibitors. Diabetes = very common co-factor. Peyronie's = may need specialist. Low BP = dose adjustment needed.

**Q14: Do you currently take any of these medications? (Select all)**
- Type: Multi-select — THIS IS THE MOST CRITICAL QUESTION
  - **Nitrates** (nitroglycerin, isosorbide mononitrate/dinitrate, amyl nitrite "poppers")
  - Blood pressure medications (name if possible)
  - Alpha-blockers (tamsulosin, alfuzosin — for prostate)
  - HIV protease inhibitors (ritonavir, saquinavir)
  - Antifungals (ketoconazole, itraconazole)
  - Antidepressants (SSRIs, SNRIs — name if possible)
  - Anti-anxiety medications
  - Blood thinners (warfarin)
  - Other erectile dysfunction medications (already using another)
  - Recreational drugs (cocaine, marijuana, MDMA)
  - None
  - Other: [free text]
- AI use: **NITRATES = ABSOLUTE CONTRAINDICATION.** Combining nitrates with PDE5 inhibitors can cause fatal hypotension. Alpha-blockers = need dose adjustment and timing separation. SSRIs commonly cause ED as side effect. Recreational drugs = discuss.

**Q15: [IF on blood pressure meds] Do you know your most recent blood pressure reading?**
- Type: Free text — systolic/diastolic or "don't know"
- AI use: BP <90/50 = PDE5 inhibitors risky. BP >180/110 = needs stabilization first.

**Q16: Have you been hospitalized for a heart-related issue in the last 6 months?**
- Type: Single select — Yes / No
- AI use: Recent cardiac event = BLOCK PDE5 inhibitors. Needs cardiology clearance.

**Q17: Do you experience chest pain during physical activity or sexual activity?**
- Type: Single select — Yes / No / Sometimes
- AI use: Yes = unstable angina risk. MUST be evaluated before prescribing. Possible referral.

**Q18: Have you ever been told your heart is not strong enough for sexual activity?**
- Type: Single select — Yes / No
- AI use: Yes = BLOCK. Needs cardiology clearance.

**Q19: Do you have any drug allergies?**
- Type: Multi-select + free text — Sildenafil / Tadalafil / Vardenafil / No known allergies / Other
- AI use: Direct treatment safety.

## SECTION 5: PSYCHOLOGICAL & LIFESTYLE (5 questions)

**Q20: Are you currently experiencing any of these? (Select all)**
- Type: Multi-select
  - Stress at work or home
  - Relationship problems
  - Performance anxiety about sex
  - Depression
  - Anxiety disorder
  - Low self-esteem / body image issues
  - Pornography-related concerns
  - Sleep problems
  - None of these
- AI use: Psychological causes are VERY common in younger men. If multiple psych factors + morning erections present = primarily psychological ED. May benefit from counseling in addition to/instead of medication.

**Q21: Do you smoke?**
- Type: Single select — Yes daily / Occasionally / No / Quit recently
- AI use: Smoking is a major risk factor for vascular ED. Cessation counseling.

**Q22: Alcohol consumption?**
- Type: Single select — Never / Occasionally / Regularly (2-3 times/week) / Daily / Heavy (>4 drinks/session)
- AI use: Heavy drinking causes ED. Also interacts with PDE5 inhibitors (increased side effects).

**Q23: Exercise frequency?**
- Type: Single select — Never / 1-2 times/week / 3-4 times/week / 5+ times/week
- AI use: Sedentary lifestyle = ED risk factor. Exercise improves ED outcomes.

**Q24: BMI or weight/height?**
- Type: Height (cm) + Weight (kg) — system calculates BMI
- AI use: BMI >30 = obesity is significant ED risk factor. May recommend weight management alongside ED treatment.

## SECTION 6: TREATMENT HISTORY (4 questions)

**Q25: Have you tried any ED treatments before? (Select all)**
- Type: Multi-select — Sildenafil (Viagra) / Tadalafil (Cialis) / Vardenafil (Levitra) / Herbal/ayurvedic supplements / Vacuum pump / Counseling/therapy / None
- AI use: Prior medication response informs dosing.

**Q26: [IF tried PDE5 inhibitors] What happened?**
- Type: Single select
  - Worked well — I want to continue with it
  - Worked but gave me side effects (headache, flushing, stuffy nose)
  - Didn't work at all
  - Didn't work at first but I only tried once or twice
  - Worked initially but stopped working over time
- AI use: "Didn't work" = may need higher dose or different medication. "Only tried 1-2 times" = insufficient trial (need 6-8 attempts). "Stopped working" = may need evaluation for progression.

**Q27: [IF tried treatments] Any side effects?**
- Type: Multi-select + text — Headache / Facial flushing / Nasal congestion / Vision changes (blue tint) / Back pain / Muscle pain / Dizziness / Priapism (erection >4 hours) / Hearing changes / None / Other
- AI use: Vision or hearing changes = flag for doctor (rare but serious). Priapism history = extra caution. Common side effects (headache, flushing) = may switch to different medication.

**Q28: What are you hoping for from treatment?**
- Type: Single select
  - Reliable erections for intercourse
  - Improved confidence and reduced anxiety about performance
  - Better spontaneity (don't want to plan around taking a pill)
  - Overall sexual health improvement including libido
- AI use: "Spontaneity" = suggest daily low-dose tadalafil (works 24/7) instead of on-demand sildenafil.

---

# 4. PHOTO UPLOAD

**NO PHOTOS REQUIRED for ED consultations.**

This is a critical privacy feature. ED is the most stigmatized condition on the platform. Requiring photos would dramatically reduce conversion. The questionnaire + IIEF-5 score provides sufficient clinical data for safe prescribing.

---

# 5. AI PRE-ASSESSMENT — ED SPECIFIC

## Classification Categories

| Classification | Description | Attention | Action |
|---|---|---|---|
| `vascular_ed` | Most common. Blood flow issue. | LOW | PDE5 inhibitor |
| `psychological_ed` | Performance anxiety, stress, depression | MEDIUM | Medication + counseling recommendation |
| `mixed_ed` | Both vascular and psychological | LOW-MEDIUM | PDE5 inhibitor + counseling |
| `medication_induced_ed` | Side effect of current meds (SSRIs, BP meds) | HIGH | Discuss medication adjustment with prescriber |
| `hormonal_ed_suspected` | Low testosterone suspected | HIGH | Blood work (testosterone) first |
| `neurological_ed_suspected` | Post-surgery, spinal injury, diabetes neuropathy | HIGH | May need in-person evaluation |
| `peyronie_related` | Curved penis causing functional difficulty | HIGH | Refer to urologist in-person |
| `cardiovascular_risk` | Heart condition makes PDE5 risky | HIGH | Cardiology clearance needed |
| `nitrate_contraindication` | On nitrates — ABSOLUTE block | CRITICAL | Cannot prescribe. Refer to cardiologist. |
| `premature_ejaculation_primary` | Main issue is PE, not ED | MEDIUM | Different treatment pathway |

## Red Flags (any = HIGH or CRITICAL)
- Currently taking nitrates (CRITICAL — fatal interaction)
- Recent heart attack or stroke (<6 months)
- Chest pain during sexual activity
- Told heart not strong enough for sex
- BP <90/50 (severe hypotension)
- Priapism history
- Sudden onset + no psychological triggers (possible vascular event)
- Age <25 with severe ED + no psychological factors
- Vision or hearing changes from prior PDE5 use
- Peyronie's disease
- Blood pressure unknown + on multiple cardiac meds

## Contraindication Matrix

| Check | Source | Action |
|---|---|---|
| **Nitrates (ANY form)** | Q14 | **ABSOLUTE BLOCK. Cannot prescribe ANY PDE5 inhibitor.** |
| Recent cardiac event (<6 months) | Q16 | BLOCK. Cardiology clearance required. |
| Chest pain during activity | Q17 | BLOCK. Refer for cardiac evaluation. |
| Heart not strong enough for sex | Q18 | BLOCK. Cardiology clearance. |
| Severe hypotension (<90/50) | Q15 | BLOCK. Too risky. |
| Alpha-blockers | Q14 | CAUTION. Needs 4-hour separation, start lowest dose. |
| HIV protease inhibitors | Q14 | CAUTION. Reduce PDE5 dose significantly. |
| Severe liver disease | Q13 | CAUTION. Lower dose, monitor. |
| Severe kidney disease | Q13 | CAUTION. Lower dose. |
| Sickle cell disease | Q13 | CAUTION. Priapism risk. |
| Priapism history | Q27 | CAUTION. Start lowest dose, warn patient. |
| Heavy alcohol use | Q22 | CAUTION. Increases hypotension risk. |

## AI Output Extensions for ED

```typescript
interface EDAssessment extends AIAssessment {
  iief5_score: number;           // 5-25
  iief5_severity: string;        // none/mild/mild-moderate/moderate/severe
  likely_etiology: string;       // vascular/psychological/mixed/hormonal/medication/neurological
  cardiovascular_risk: 'low' | 'moderate' | 'high' | 'contraindicated';
  nitrate_check: 'clear' | 'BLOCKED';
  morning_erections: boolean;    // strong signal for etiology
  psychological_component: 'none' | 'mild' | 'significant' | 'primary';
}
```

---

# 6. PRESCRIPTION TEMPLATES

| Template | Medications | When |
|---|---|---|
| **On-Demand Sildenafil** | Sildenafil 50mg, take 30-60min before sexual activity, max once daily | Standard first-line. Works 4-6hrs. |
| **On-Demand Sildenafil (High)** | Sildenafil 100mg | Previous 50mg insufficient after 6-8 attempts |
| **On-Demand Tadalafil** | Tadalafil 10mg, take 30min before, effective up to 36hrs | Patient wants longer window / spontaneity |
| **On-Demand Tadalafil (High)** | Tadalafil 20mg | Previous 10mg insufficient |
| **Daily Tadalafil** | Tadalafil 5mg daily (every day, regardless of activity) | Patient wants spontaneity, frequent sexual activity, also has BPH symptoms |
| **Conservative Start** | Sildenafil 25mg | Older patient, on alpha-blockers, liver/kidney concerns |
| **Custom** | Doctor builds from scratch | Complex cases |

**All prescriptions include standard counseling text:**
- Take on empty stomach for faster effect (sildenafil) / can take with food (tadalafil)
- Sexual stimulation still required — medication does not cause automatic erection
- Do NOT combine with nitrates, recreational "poppers," or other PDE5 inhibitors
- Seek emergency help if erection lasts >4 hours
- Common side effects: headache, flushing, nasal congestion — usually mild and temporary
- Avoid grapefruit juice (affects metabolism)

---

# 7. DOCTOR REVIEW — ED SPECIFIC

## Center Panel Additions
- **IIEF-5 Score Badge:** Large display — "Score: 14/25 — Mild to Moderate ED"
- **Etiology Indicators:** Morning erections (Yes/No), onset pattern (sudden/gradual), situational factors
- **Cardiovascular Risk Panel:** Red/Yellow/Green based on cardiac history + medications
- **Nitrate Check Banner:** If nitrates detected → LARGE RED BANNER: "⚠️ PATIENT ON NITRATES — PDE5 INHIBITORS CONTRAINDICATED"
- **No photo gallery** — replaced with expanded questionnaire display

## Follow-Up Cadence
- Initial prescription → 4-week check-in (how's it working?) → adjust dose if needed → 3-month review → 6-month review → annual
- Check-ins are questionnaire-based (abbreviated IIEF-5 + side effects report)
- No photos needed

## Canned Messages (ED)
- "I've prescribed [medication] for you. Take it [instructions]. Give it 6-8 attempts before judging effectiveness."
- "Based on your responses, I'd recommend trying daily low-dose tadalafil for more spontaneity."
- "Your symptoms suggest a significant stress/anxiety component. I recommend combining medication with counseling."
- "I need to check your testosterone levels before prescribing. Please complete the blood panel."
- "Please see your cardiologist for clearance before I can safely prescribe ED medication."
- "I've adjusted your dose to [new dose]. Let me know how it works at the next check-in."

---

# 8. REFERRAL EDGE CASES — ED SPECIFIC

| Scenario | Action | Patient Message |
|---|---|---|
| Patient on nitrates | CANNOT prescribe. Full refund. | "ED medications interact dangerously with your nitrate medication. Please discuss alternatives with your cardiologist." |
| Recent heart attack/stroke | Refer to cardiologist for clearance | "For your safety, we need your cardiologist's clearance before prescribing." |
| Peyronie's disease | Refer to urologist in-person | "Your condition benefits from an in-person urology evaluation." |
| Low testosterone suspected | Order blood work (testosterone, LH, FSH, prolactin) | "Let's check your hormone levels first." |
| Severe ED (IIEF 5-7) + young (<30) + no psychological factors | Refer for in-person urology evaluation | "Given the severity, I recommend an in-person evaluation." |
| Primary psychological ED | Prescribe + strongly recommend counseling | "Medication will help in the short term, but addressing the underlying anxiety will give lasting results." |
| Patient requesting specific brand/dose | Doctor evaluates, may accommodate or recommend alternative | Clinical judgment prevails |
| PE primary (not ED) | Future: separate PE pathway. For now, note and refer if needed. | "Your primary concern seems to be premature ejaculation rather than erectile difficulty. I'll adjust your treatment plan accordingly." |
| Priapism from prior PDE5 use | Do NOT prescribe same medication. Consider different class or lower dose. Refer if recurring. | "Given your history, we'll take a very cautious approach." |

## Blood Work Panels (ED)

> **All blood work ordered via doctor dashboard, tracked through portal system.** See master spec Section 7. Patient books home collection slot, phlebotomist visits, lab processes, results uploaded to portal.

| Panel | Tests | Cost | When |
|---|---|---|---|
| Hormonal Basic | Total Testosterone, Free Testosterone | ₹800 | Suspected low T, low libido primary complaint |
| Hormonal Comprehensive | Testosterone, LH, FSH, Prolactin, TSH, Estradiol | ₹2,000 | Young patient, severe ED, hormonal suspected |
| Metabolic | Fasting glucose, HbA1c, Lipid panel | ₹600 | Diabetes/cardiovascular risk assessment |
| Combined | Hormonal + Metabolic | ₹2,500 | Comprehensive evaluation |

---

# 9. MEDICATION FULFILLMENT

| Medication | Quantity (30 days) | Approx. Cost |
|---|---|---|
| Sildenafil 50mg (on-demand, 8 tablets) | 8 tablets | ₹200-400 |
| Sildenafil 100mg (on-demand, 8 tablets) | 8 tablets | ₹300-500 |
| Tadalafil 10mg (on-demand, 8 tablets) | 8 tablets | ₹400-700 |
| Tadalafil 5mg daily | 30 tablets | ₹500-900 |

**Packaging:** MAXIMUM DISCRETION. Plain box, "Onlyou" only. No medication names, no condition names. Generic "Health & Wellness" on shipping label.
**Delivery:** Local delivery (Rapido/Dunzo/own delivery person). Same-day or next-day in launch city. OTP-verified. See master spec Section 8 for full flow. ED packaging gets EXTRA discretion — no condition hints anywhere.

---

*This file covers everything specific to the ED vertical. For shared infrastructure, see `onlyou-spec-master.md`.*
