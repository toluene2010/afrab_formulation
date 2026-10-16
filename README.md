Here's a complete user guide you can drop into your `README.md`. It's written for pharmacists and formulators who'll actually use the app — no code jargon.

---

# AFRAB Formulation Studio — User Guide

A web application for pharmaceutical formulation trials, from first ingredient pick to printed Batch Manufacturing Record.

## What this app is for

The app tracks every step of formulation development:

- **Raw materials** — a searchable database of every ingredient you use
- **Products** — every formulation you're working on, across tablets, capsules, syrups, suspensions, creams, dry powders, injections
- **Formulation recipes** — pick ingredients, enter quantities, see the real yield, %, cost per unit, cost per pack
- **Trial versions** — record every attempt (V1.0, V1.1, V2.0…), with mandatory CAPA when something fails
- **Production steps** — the compounding procedure for each version
- **Batch Manufacturing Record (BMR)** — printable A4 document with sign-off block
- **BMR Archive** — permanent log of every BMR ever issued

Everything reads from and writes to a Google Sheet. **You never edit the sheet directly** once the app is set up.

## Getting started

### 1. Open the app

Go to: `https://toluene2010.github.io/<your-repo>/`

Bookmark it. On mobile, tap "Add to Home Screen" — it works like a native app.

### 2. Set up your team (one time)

The BMR sign-off block reads from the **User & Personnel Directory** tab in your sheet.

You need at least three people:

| Role | What it does in the app |
|---|---|
| **Formulator** | Signs as Lead Formulator on the BMR |
| **QA Signatory** | Signs as QA Reviewer |
| **Authorizing Director** | Signs as final approver |

Each row needs:
- **USR-###** in column B
- **Full Name** in column C
- **Job Title** in column D
- **Role** in column F — must contain "Formulator", "QA", or "Director"
- **Sign-off Identity** in column H — the initials that appear on printed BMRs (e.g. "T. Dada")

### 3. Add your raw materials

Go to **Raw Materials** → **+ New Material**.

For each ingredient, enter:

| Field | Example |
|---|---|
| Material ID | Leave blank — auto-generated as RM-001, RM-002… |
| Name | "Dill Oil (Terpeneless)" |
| Chemical Form | "Anethum graveolens Seed Oil BP" |
| Category | "Active Botanical / Carminative" |
| Max Limit | "50 mg/day" or "0.2% v/v" |
| Density | "0.91" (g/mL, optional) |
| Cost | "65.00" (per kg, in Naira) |
| Storage | "Store below 25°C in airtight container" |

The **Max Limit** field matters — the app checks each formulation against it and flags any ingredient that exceeds its daily limit.

## The daily workflow

### Step 1 — Create a product

Go to **Product Master** → **+ New Product**.

| Field | What it means | Example |
|---|---|---|
| Product ID | Auto-generated | PRD-043 |
| Name | Product name | "GRIPE WATER" |
| Category | Therapeutic category | "Pediatric & Gastrointestinal Care" |
| **Dosage Form** | Drives all the math | "Oral Liquid / Syrup" |
| **Unit Weight (mg)** | For tablets/capsules — weight of ONE tablet | 500 |
| **Fill Volume (mL)** | For liquids — volume of ONE bottle | 100 |
| **Fill Weight (g)** | For creams/sachets — weight of ONE tube/sachet | 30 |
| **Pack Size** | Units per commercial pack | 12 (bottles/box) |
| Container Type | What it's packed in | "100 mL Flint bottle" |
| Shelf Life | Months | 24 |
| Storage | Storage conditions | "Store below 25°C, protect from light" |
| Status | Where it is in development | "Pilot Trial / Formulation" |

**You only fill the physical attribute that matches the dosage form:**

| Dosage form | Fill which field |
|---|---|
| Tablets, Caplets, Capsules | Unit Weight (mg) |
| Syrups, Suspensions, Drops, Injections | Fill Volume (mL) |
| Creams, Ointments, Gels, Sachets | Fill Weight (g) |

Leave the other two fields blank. The app will compute yields correctly based on what you filled.

**Why these matter:** without Unit Weight, the app cannot tell you how many tablets a 50 kg batch produces. Without Fill Volume, it cannot tell you how many bottles a 100 L batch fills. It will warn you and show the yield in kg instead of units until you fill them in.

**Development Status controls the stage tiles on the Dashboard and Pipeline:**

| Status | Appears under |
|---|---|
| Pilot Trial / Formulation | LAB |
| Pilot Batch Trial | PLT (Pilot) |
| Stability Testing | STB (Stability) |
| Commercial / Active | COM (Commercial) |

Update the status as your product moves through development.

### Step 2 — Build the formulation

Go to **BMR Tracking & Compose**.

1. **Pick the product** from the dropdown
2. **Set the version** — leave as V1.0 for the first attempt
3. **Choose batch mode:**
   - **By Mass / Volume** — you know how much to make (e.g. 100 kg, 50 L)
   - **By Unit Count** — you know how many tablets/bottles (e.g. 100,000 tablets)
4. **Enter the batch value**
5. Click **+ Add Ingredients**

A picker opens listing every raw material:

- **Tick** each ingredient you need
- Enter **unit qty** for each — this is **per tablet** for solids, **per 5 mL** for syrups, **% w/w** for creams
- Set the **unit** (mg, g, mL, IU, mcg)
- Enter **overage %** if you use one (e.g. 5% overage for manufacturing loss)
- **Purified Water (q.s.)** — tick it too if your formula needs it, and the app will auto-compute how much to add
- Select the **default phase** at the top (Phase A, B, C, D)
- Click **💾 Save All Selected**

The formulation table appears with live calculations:

| Column | What it shows |
|---|---|
| Unit Qty | What you entered (per tablet / per 5 mL) |
| Over % | Your overage |
| % w/w or % w/v | Percent of the total formula (auto) |
| Batch kg | How much to weigh out for this batch (auto) |
| Cost ₦ | Cost of this ingredient for this batch (auto) |
| Daily Dose | Calculated daily dose |
| Limit | The material's max limit |
| Check | OK, or OVER if it exceeds the limit |

**The q.s. row is auto-computed:** the water or vehicle fills the remaining amount to reach 100%. It's marked "(q.s. — auto)" in green.

### Step 3 — Log a trial version

Go to **BMR Trials Log** → **+ New Version**.

For a formulation that worked:

| Field | Value |
|---|---|
| Stage | Lab Bench / Pilot Scale / Stability / Commercial |
| Status | PASS |
| Failure fields | Leave blank (they unlock only when you select FAIL) |

For a formulation that failed, you **must** fill all five:

| Field | Example |
|---|---|
| Failure Category | Phase Separation |
| Failure Reason | "Two-phase system observed after 48h at 40°C/75% RH" (min 20 chars) |
| Observed Value | "~15% oil layer at top" |
| Expected Value | "Single-phase, clear to opalescent" |
| CAPA (Corrective Action) | "Increase Polysorbate 80 to 20 mg; retrial as V1.1" (min 10 chars) |

The app won't let you save a FAIL without these. That's deliberate — it enforces cGMP deviation documentation.

**Stage gates:** you cannot advance to Pilot Scale, Stability, or Commercial without at least one prior PASS.

### Step 4 — Write the production steps

Go to **Production Steps** → **+ Add Step**.

For each compounding step, record:

| Field | Example |
|---|---|
| Step # | 1, 2, 3… (auto-incremented) |
| Stage | "Phase A (Aqueous Base)" |
| Instruction | "Charge Purified Water into SS-316L tank. Add preservatives; agitate 450 RPM until clear." |
| Equipment | "SS-316L Tank (TK-04)" |
| Target Spec | "Clear, uniform solution; 0 pH shift" |
| IPC Check | "Visual: clear, no particulate" |
| Duration | "30 min" |

Steps appear in the BMR in order.

### Step 5 — Print the BMR

Go to **BMR Tracking & Compose**. Scroll past the calculation table.

The **Batch Manufacturing Record** appears as a formal A4 document:

1. **Header** — AFRAB CHEM LIMITED, cGMP compliant
2. **Document Control** — product, version, stage, container, storage, shelf life
3. **Batch Scale** — batch size, theoretical yield in units, packs
4. **Master Bill of Materials** — every ingredient, phase, % w/w, batch kg, cost
5. **Compounding Process Instructions** — your production steps
6. **Three-Party Sign-Off** — Formulator, QA, Director

Click **🖨 Print** (top right of the page) to print on A4 or save as PDF.

**The signature block fills automatically** from the User & Personnel Directory:
- Formulator signs as Lead Formulator
- QA Signatory signs as QA Reviewer
- Authorizing Director signs as final approver

**Disposition shows APPROVED / RELEASED only if the trial version status is PASS.** FAIL or IN PROGRESS shows PENDING.

### Step 6 — Save to archive

After printing the BMR, click **💾 Save BMR** on the compose page.

This appends an immutable record to the **BMR Archive** tab:
- Document reference
- Version
- Batch number
- Who issued it
- When
- Yield achieved
- **Trial outcome:**
  - APPROVED FOR NEXT STAGE
  - REWORK REQUIRED
  - REJECTED AT TRIAL
  - ON HOLD
  - ARCHIVED

The Archive is append-only. It's your audit trail.

## Understanding the numbers

### Theoretical yield

For a **tablet** product with Unit Weight = 500 mg, batch = 100 kg:

```
100 kg × 1,000,000 mg/kg ÷ 500 mg/tablet = 200,000 tablets
```

For a **syrup** with Fill Volume = 100 mL, batch = 20 L:

```
20 L × 1000 mL/L ÷ 100 mL/bottle = 200 bottles
```

For a **cream** with Fill Weight = 30 g, batch = 5 kg:

```
5 kg × 1000 g/kg ÷ 30 g/tube = 166 tubes
```

### Percentage

For **solids**: mg per unit ÷ total mg per unit × 100 = % w/w
For **liquids**: mg per 5 mL ÷ 5000 mg (mass of 5 mL dose) × 100 = % w/v
For **semi-solids**: direct % w/w you entered

### Q.S. (quantum satis)

Anything named with "q.s." or "make-up" or "qs" is auto-computed:

- **Liquids:** Q.S. = 5000 mg per 5 mL − sum of all other ingredients
- **Semi-solids:** Q.S. = 100% − sum of other %
- **Solids:** Q.S. = unit weight − sum of other mg per unit

The app then shows the actual quantity to weigh out per batch.

### Batch cost

Each ingredient's batch kg × its cost per kg = ingredient cost.
Sum = total batch cost.
Divide by unit count = cost per tablet / per bottle / per tube.

## Common tasks

### "How do I change a product's dosage form?"

Product Master → find the product → click Edit → change Dosage Form → Save.

Or in Compose, click the dosage-form chip at the top (TABLET, CAPSULE, SYRUP, etc.) — the app updates the product immediately.

### "How do I check the yield for a bigger batch?"

On the Compose page, change the batch value (e.g. from 1 L to 20 L) → click Recalculate. The unit count and pack count update instantly.

### "What happens if I try to advance stage without a PASS?"

The app blocks it. You'll see: "Cannot advance to Pilot Scale — no PASSing prior version."

Log at least one PASS at Lab Bench first.

### "How do I record a failed trial?"

In the New Version form, set Status = FAIL. The five failure fields unlock and become required:
- Failure Category (dropdown)
- Failure Reason (min 20 characters)
- Observed Value
- Expected Value
- Corrective Action / CAPA (min 10 characters)

Then bump to the next minor version (V1.1) and try again.

### "How do I see failure patterns?"

**Dashboard → Failure Trend Analysis** shows a bar chart of top failure categories across all trials.

Use it to spot systemic issues (e.g. "60% of our failures are Phase Separation — investigate our emulsifier system").

## Print/PDF instructions

1. Open **BMR Tracking & Compose**
2. Pick the product and version
3. Verify the batch value
4. Click **Recalculate**
5. Scroll down to see the BMR document
6. Click **🖨 Print** in the top-right corner
7. In the print dialog:
   - **Destination:** Save as PDF (or your printer)
   - **Paper size:** A4
   - **Margins:** Default
   - **Background graphics:** ON (to keep the header bar)
8. Click Save/Print

The print layout hides the app navigation and shows only the BMR document.

## Data safety

Everything is stored in your Google Sheet. The app reads from and writes to the sheet only — it never deletes data.

**To back up:**
1. Open your sheet
2. File → Make a copy
3. Rename the copy "AFRAB BACKUP <date>"

Do this weekly or before major changes.

**To restore from backup:**
Rename the backup sheet's ID into the app config. This requires a code change — contact the maintainer.

## What the app does NOT do

- It doesn't talk to your ERP or LIMS
- It doesn't do spectral analysis or dissolution modeling
- It doesn't manage inventory
- It doesn't replace your QA release process — the "APPROVED" label on a printed BMR is a rendering, not an authorized signature

The signed paper BMR is still the official record. This app generates it faster.

## Glossary

| Term | Meaning |
|---|---|
| **BMR** | Batch Manufacturing Record — the master document for making a batch |
| **cGMP** | Current Good Manufacturing Practice |
| **Q.S.** | Quantum satis — "as much as needed to make the volume" |
| **API** | Active Pharmaceutical Ingredient |
| **CAPA** | Corrective and Preventive Action |
| **IPC** | In-Process Control |
| **ICH** | International Council for Harmonisation (pharma guidelines) |
| **Stage** | Development phase: Lab Bench → Pilot → Stability → Commercial |
| **Version** | A specific formulation attempt: V1.0, V1.1, V2.0 |

## Support

Report issues or request features by opening an issue on the GitHub repository, or by contacting the maintainer.

---

**Save this as `README.md` in your GitHub repo.** Anyone who visits `github.com/toluene2010/<repo>` will see it rendered automatically.

# AFRAB Formulation Studio — User Guide

A web application for pharmaceutical formulation trials, from first ingredient pick to printed Batch Manufacturing Record.

## What this app is for

The app tracks every step of formulation development:

- **Raw materials** — a searchable database of every ingredient you use
- **Products** — every formulation you're working on, across tablets, capsules, syrups, suspensions, creams, dry powders, injections
- **Formulation recipes** — pick ingredients, enter quantities, see the real yield, %, cost per unit, cost per pack
- **Trial versions** — record every attempt (V1.0, V1.1, V2.0…), with mandatory CAPA when something fails
- **Production steps** — the compounding procedure for each version
- **Batch Manufacturing Record (BMR)** — printable A4 document with sign-off block
- **BMR Archive** — permanent log of every BMR ever issued

Everything reads from and writes to a Google Sheet. **You never edit the sheet directly** once the app is set up.

## Getting started

### 1. Open the app

Go to: `https://toluene2010.github.io/<your-repo>/`

Bookmark it. On mobile, tap "Add to Home Screen" — it works like a native app.

### 2. Set up your team (one time)

The BMR sign-off block reads from the **User & Personnel Directory** tab in your sheet.

You need at least three people:

| Role | What it does in the app |
|---|---|
| **Formulator** | Signs as Lead Formulator on the BMR |
| **QA Signatory** | Signs as QA Reviewer |
| **Authorizing Director** | Signs as final approver |

Each row needs:
- **USR-###** in column B
- **Full Name** in column C
- **Job Title** in column D
- **Role** in column F — must contain "Formulator", "QA", or "Director"
- **Sign-off Identity** in column H — the initials that appear on printed BMRs (e.g. "T. Dada")

### 3. Add your raw materials

Go to **Raw Materials** → **+ New Material**.

For each ingredient, enter:

| Field | Example |
|---|---|
| Material ID | Leave blank — auto-generated as RM-001, RM-002… |
| Name | "Dill Oil (Terpeneless)" |
| Chemical Form | "Anethum graveolens Seed Oil BP" |
| Category | "Active Botanical / Carminative" |
| Max Limit | "50 mg/day" or "0.2% v/v" |
| Density | "0.91" (g/mL, optional) |
| Cost | "65.00" (per kg, in Naira) |
| Storage | "Store below 25°C in airtight container" |

The **Max Limit** field matters — the app checks each formulation against it and flags any ingredient that exceeds its daily limit.

## The daily workflow

### Step 1 — Create a product

Go to **Product Master** → **+ New Product**.

| Field | What it means | Example |
|---|---|---|
| Product ID | Auto-generated | PRD-043 |
| Name | Product name | "GRIPE WATER" |
| Category | Therapeutic category | "Pediatric & Gastrointestinal Care" |
| **Dosage Form** | Drives all the math | "Oral Liquid / Syrup" |
| **Unit Weight (mg)** | For tablets/capsules — weight of ONE tablet | 500 |
| **Fill Volume (mL)** | For liquids — volume of ONE bottle | 100 |
| **Fill Weight (g)** | For creams/sachets — weight of ONE tube/sachet | 30 |
| **Pack Size** | Units per commercial pack | 12 (bottles/box) |
| Container Type | What it's packed in | "100 mL Flint bottle" |
| Shelf Life | Months | 24 |
| Storage | Storage conditions | "Store below 25°C, protect from light" |
| Status | Where it is in development | "Pilot Trial / Formulation" |

**You only fill the physical attribute that matches the dosage form:**

| Dosage form | Fill which field |
|---|---|
| Tablets, Caplets, Capsules | Unit Weight (mg) |
| Syrups, Suspensions, Drops, Injections | Fill Volume (mL) |
| Creams, Ointments, Gels, Sachets | Fill Weight (g) |

Leave the other two fields blank. The app will compute yields correctly based on what you filled.

**Why these matter:** without Unit Weight, the app cannot tell you how many tablets a 50 kg batch produces. Without Fill Volume, it cannot tell you how many bottles a 100 L batch fills. It will warn you and show the yield in kg instead of units until you fill them in.

**Development Status controls the stage tiles on the Dashboard and Pipeline:**

| Status | Appears under |
|---|---|
| Pilot Trial / Formulation | LAB |
| Pilot Batch Trial | PLT (Pilot) |
| Stability Testing | STB (Stability) |
| Commercial / Active | COM (Commercial) |

Update the status as your product moves through development.

### Step 2 — Build the formulation

Go to **BMR Tracking & Compose**.

1. **Pick the product** from the dropdown
2. **Set the version** — leave as V1.0 for the first attempt
3. **Choose batch mode:**
   - **By Mass / Volume** — you know how much to make (e.g. 100 kg, 50 L)
   - **By Unit Count** — you know how many tablets/bottles (e.g. 100,000 tablets)
4. **Enter the batch value**
5. Click **+ Add Ingredients**

A picker opens listing every raw material:

- **Tick** each ingredient you need
- Enter **unit qty** for each — this is **per tablet** for solids, **per 5 mL** for syrups, **% w/w** for creams
- Set the **unit** (mg, g, mL, IU, mcg)
- Enter **overage %** if you use one (e.g. 5% overage for manufacturing loss)
- **Purified Water (q.s.)** — tick it too if your formula needs it, and the app will auto-compute how much to add
- Select the **default phase** at the top (Phase A, B, C, D)
- Click **💾 Save All Selected**

The formulation table appears with live calculations:

| Column | What it shows |
|---|---|
| Unit Qty | What you entered (per tablet / per 5 mL) |
| Over % | Your overage |
| % w/w or % w/v | Percent of the total formula (auto) |
| Batch kg | How much to weigh out for this batch (auto) |
| Cost ₦ | Cost of this ingredient for this batch (auto) |
| Daily Dose | Calculated daily dose |
| Limit | The material's max limit |
| Check | OK, or OVER if it exceeds the limit |

**The q.s. row is auto-computed:** the water or vehicle fills the remaining amount to reach 100%. It's marked "(q.s. — auto)" in green.

### Step 3 — Log a trial version

Go to **BMR Trials Log** → **+ New Version**.

For a formulation that worked:

| Field | Value |
|---|---|
| Stage | Lab Bench / Pilot Scale / Stability / Commercial |
| Status | PASS |
| Failure fields | Leave blank (they unlock only when you select FAIL) |

For a formulation that failed, you **must** fill all five:

| Field | Example |
|---|---|
| Failure Category | Phase Separation |
| Failure Reason | "Two-phase system observed after 48h at 40°C/75% RH" (min 20 chars) |
| Observed Value | "~15% oil layer at top" |
| Expected Value | "Single-phase, clear to opalescent" |
| CAPA (Corrective Action) | "Increase Polysorbate 80 to 20 mg; retrial as V1.1" (min 10 chars) |

The app won't let you save a FAIL without these. That's deliberate — it enforces cGMP deviation documentation.

**Stage gates:** you cannot advance to Pilot Scale, Stability, or Commercial without at least one prior PASS.

### Step 4 — Write the production steps

Go to **Production Steps** → **+ Add Step**.

For each compounding step, record:

| Field | Example |
|---|---|
| Step # | 1, 2, 3… (auto-incremented) |
| Stage | "Phase A (Aqueous Base)" |
| Instruction | "Charge Purified Water into SS-316L tank. Add preservatives; agitate 450 RPM until clear." |
| Equipment | "SS-316L Tank (TK-04)" |
| Target Spec | "Clear, uniform solution; 0 pH shift" |
| IPC Check | "Visual: clear, no particulate" |
| Duration | "30 min" |

Steps appear in the BMR in order.

### Step 5 — Print the BMR

Go to **BMR Tracking & Compose**. Scroll past the calculation table.

The **Batch Manufacturing Record** appears as a formal A4 document:

1. **Header** — AFRAB CHEM LIMITED, cGMP compliant
2. **Document Control** — product, version, stage, container, storage, shelf life
3. **Batch Scale** — batch size, theoretical yield in units, packs
4. **Master Bill of Materials** — every ingredient, phase, % w/w, batch kg, cost
5. **Compounding Process Instructions** — your production steps
6. **Three-Party Sign-Off** — Formulator, QA, Director

Click **🖨 Print** (top right of the page) to print on A4 or save as PDF.

**The signature block fills automatically** from the User & Personnel Directory:
- Formulator signs as Lead Formulator
- QA Signatory signs as QA Reviewer
- Authorizing Director signs as final approver

**Disposition shows APPROVED / RELEASED only if the trial version status is PASS.** FAIL or IN PROGRESS shows PENDING.

### Step 6 — Save to archive

After printing the BMR, click **💾 Save BMR** on the compose page.

This appends an immutable record to the **BMR Archive** tab:
- Document reference
- Version
- Batch number
- Who issued it
- When
- Yield achieved
- **Trial outcome:**
  - APPROVED FOR NEXT STAGE
  - REWORK REQUIRED
  - REJECTED AT TRIAL
  - ON HOLD
  - ARCHIVED

The Archive is append-only. It's your audit trail.

## Understanding the numbers

### Theoretical yield

For a **tablet** product with Unit Weight = 500 mg, batch = 100 kg:

```
100 kg × 1,000,000 mg/kg ÷ 500 mg/tablet = 200,000 tablets
```

For a **syrup** with Fill Volume = 100 mL, batch = 20 L:

```
20 L × 1000 mL/L ÷ 100 mL/bottle = 200 bottles
```

For a **cream** with Fill Weight = 30 g, batch = 5 kg:

```
5 kg × 1000 g/kg ÷ 30 g/tube = 166 tubes
```

### Percentage

For **solids**: mg per unit ÷ total mg per unit × 100 = % w/w
For **liquids**: mg per 5 mL ÷ 5000 mg (mass of 5 mL dose) × 100 = % w/v
For **semi-solids**: direct % w/w you entered

### Q.S. (quantum satis)

Anything named with "q.s." or "make-up" or "qs" is auto-computed:

- **Liquids:** Q.S. = 5000 mg per 5 mL − sum of all other ingredients
- **Semi-solids:** Q.S. = 100% − sum of other %
- **Solids:** Q.S. = unit weight − sum of other mg per unit

The app then shows the actual quantity to weigh out per batch.

### Batch cost

Each ingredient's batch kg × its cost per kg = ingredient cost.
Sum = total batch cost.
Divide by unit count = cost per tablet / per bottle / per tube.

## Common tasks

### "How do I change a product's dosage form?"

Product Master → find the product → click Edit → change Dosage Form → Save.

Or in Compose, click the dosage-form chip at the top (TABLET, CAPSULE, SYRUP, etc.) — the app updates the product immediately.

### "How do I check the yield for a bigger batch?"

On the Compose page, change the batch value (e.g. from 1 L to 20 L) → click Recalculate. The unit count and pack count update instantly.

### "What happens if I try to advance stage without a PASS?"

The app blocks it. You'll see: "Cannot advance to Pilot Scale — no PASSing prior version."

Log at least one PASS at Lab Bench first.

### "How do I record a failed trial?"

In the New Version form, set Status = FAIL. The five failure fields unlock and become required:
- Failure Category (dropdown)
- Failure Reason (min 20 characters)
- Observed Value
- Expected Value
- Corrective Action / CAPA (min 10 characters)

Then bump to the next minor version (V1.1) and try again.

### "How do I see failure patterns?"

**Dashboard → Failure Trend Analysis** shows a bar chart of top failure categories across all trials.

Use it to spot systemic issues (e.g. "60% of our failures are Phase Separation — investigate our emulsifier system").

## Print/PDF instructions

1. Open **BMR Tracking & Compose**
2. Pick the product and version
3. Verify the batch value
4. Click **Recalculate**
5. Scroll down to see the BMR document
6. Click **🖨 Print** in the top-right corner
7. In the print dialog:
   - **Destination:** Save as PDF (or your printer)
   - **Paper size:** A4
   - **Margins:** Default
   - **Background graphics:** ON (to keep the header bar)
8. Click Save/Print

The print layout hides the app navigation and shows only the BMR document.

## Data safety

Everything is stored in your Google Sheet. The app reads from and writes to the sheet only — it never deletes data.

**To back up:**
1. Open your sheet
2. File → Make a copy
3. Rename the copy "AFRAB BACKUP <date>"

Do this weekly or before major changes.

**To restore from backup:**
Rename the backup sheet's ID into the app config. This requires a code change — contact the maintainer.

## What the app does NOT do

- It doesn't talk to your ERP or LIMS
- It doesn't do spectral analysis or dissolution modeling
- It doesn't manage inventory
- It doesn't replace your QA release process — the "APPROVED" label on a printed BMR is a rendering, not an authorized signature

The signed paper BMR is still the official record. This app generates it faster.

## Glossary

| Term | Meaning |
|---|---|
| **BMR** | Batch Manufacturing Record — the master document for making a batch |
| **cGMP** | Current Good Manufacturing Practice |
| **Q.S.** | Quantum satis — "as much as needed to make the volume" |
| **API** | Active Pharmaceutical Ingredient |
| **CAPA** | Corrective and Preventive Action |
| **IPC** | In-Process Control |
| **ICH** | International Council for Harmonisation (pharma guidelines) |
| **Stage** | Development phase: Lab Bench → Pilot → Stability → Commercial |
| **Version** | A specific formulation attempt: V1.0, V1.1, V2.0 |

## Support

Report issues or request features by opening an issue on the GitHub repository, or by contacting the maintainer.

---

