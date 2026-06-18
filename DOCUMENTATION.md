# Proposal Generator — User Guide

This guide explains what the app does, how to use it end to end, what to expect, and where the tool has known limits.

For installation, environment variables, and database setup, see [README-STANDALONE.md](./README-STANDALONE.md).

---

## What this tool is

The **Proposal Generator** helps Prime Infoserv create client proposals from reusable **service templates** or manual inputs.

You define a service once (WAPT, VAPT, ISO, etc.) with standard sections such as methodology, deliverables, and prerequisites. When a new client engagement comes in, you run the **proposal wizard** to add client-specific details, scope, pricing, and an executive summary, then export a branded **DOCX** or **PDF**.

The app is built for internal sales and delivery teams — not as a full document-management or CRM replacement.

---

## Core concepts

| Concept | Description |
|--------|-------------|
| **Service** | A reusable template: service name, approach, objectives, deliverables, prerequisites, timeline defaults, etc. Stored in the **Services** library. |
| **Proposal** | A client-specific document built from one service plus client name, scope, commercials, milestones, and overrides. |
| **Review step** | Step 10 of the wizard shows the **final proposal layout** (same structure as DOCX/PDF). Edits there affect the generated document. |
| **Content overrides** | Per-proposal edits to service text (objectives, deliverables, etc.) without changing the master service template. |

---

## Typical workflow

### Phase 1 — Set up services (do once per offering)

1. Go to **Services → New service** (or edit an existing service).
2. Fill in **Basics** (name, type, short code).
3. Fill in **Approach & Methodology** (required).
4. Optionally enable **Add more sections** for executive summary template, objectives, benefits, deliverables, prerequisites, timeline, and custom sections.
5. **Save** the service.

Services are shared across all proposals when using Supabase. In local-only mode, they live in your browser.

### Phase 2 — Create a proposal (per client)

Open **Proposals → New proposal** and walk through the steps:

| Step | Name | What you do |
|------|------|-------------|
| 1 | **Client** | Client name, optional logo (PNG/JPG, max 600 KB), website (for better results, add the website link), proposal date. |
| 2 | **Research** | Auto-research runs when you continue (if configured). Review and edit industry, size, about, offerings, logo. |
| 3 | **Service** | Pick an existing service or create a new one inline. |
| 4 | **Scope** | Applications, tech stack, testing type, environment, user roles, scope notes. |
| 5 | **Executive Summary** | Write manually or use **AI draft** (uses service template + research + scope). |
| 6 | **Timeline** | Phase / activity / duration rows (pre-filled from service defaults). |
| 7 | **Commercials** | Line items, GST %, notes. |
| 8 | **Payment Milestones** | Label, %, trigger. |
| 9 | **Extras** | Optional custom sections for this proposal only. |
| 10 | **Review** | Preview the full document; edit sections inline before saving. |

3. Click **Save proposal** on the review step.
4. Open the saved proposal and use **Generate DOCX** or **Generate PDF** to download.

### Phase 3 — Export

- Generated files include a **cover page**, header/footer, and numbered sections.
- **Executive Summary** starts on a new page (when present).
- **Terms & Conditions** always starts on a new page.
- Empty sections are **omitted** from the final document (no blank headings).
- All sections and elements on the docx file are editable for flexibility.

---

## Importing a past proposal or template (new service)

On the **New service** form, expand **Import from past proposal or template**.

**Supported inputs:** `.docx`

**How it works:**

1. Upload or paste the document.
2. The app reads section **headings** and stores each section’s body as formatted HTML (bold, bullets, paragraphs where possible).
3. A **Sections read from document** list shows what was detected and which form field it maps to.
4. Click **Extract & fill form** to copy content into the rich-text fields.
5. **Review and edit every field** before saving — extraction is a starting point only.

**Headings that map automatically** (examples):

- Executive Summary → Executive Summary Template  
- Project Objectives → Project Objectives  
- Expected Benefits → Expected Benefits  
- Approach & Methodology → Approach & Methodology  
- Deliverables → Deliverables  
- Prerequisites → Prerequisites  
- Project Timeline → Default Timeline Phases  

**Skipped during import** (not copied into the service form): Statement of Confidentiality, Acknowledgment, Disclaimer, Terms & Conditions, Commercials, Payment Milestones, Project Overview, Scope of Engagement.

Unrecognized sections with enough content may appear under **Custom Sections**.

---

## Final proposal document structure

Fixed sections (always included when applicable):

- Cover page (client name, date, logos, service name)  
- Statement of Confidentiality  
- Acknowledgment  
- Disclaimer  
- Project Overview (client-specific scope table)  
- Commercials (pricing table)  
- Terms & Conditions (standard Prime Infoserv boilerplate)  

Conditional sections (included **only if they have content**):

- Executive Summary  
- Project Objectives  
- Expected Benefits  
- Scope of Engagement  
- Deliverables  
- Approach & Methodology  
- OWASP coverage table (if configured on service)  
- Project Timeline  
- Prerequisites  
- Payment Milestones  
- Commercial notes  
- Custom / extra sections  

Section numbering adjusts automatically when sections are skipped.

---

## Limitations and boundaries

Read this before relying on the tool for client-facing documents.

### Template / file import is not fully accurate

- Heading detection is **heuristic** (numbered headings, Word heading styles, short bold lines). Unusual formatting may split sections incorrectly or miss headings.
- **`.docx` import** uses HTML conversion; complex Word layout (tables, text boxes, columns, unusual fonts) may not transfer faithfully.
- **Mapping is by heading text**, not AI understanding. A section titled “Our approach” might not map to Approach & Methodology unless the title matches expected patterns.
- **Timeline** import stores phases as rich text, not structured phase/activity/duration rows — you may need to re-enter the timeline table in the wizard.
- **Commercials, milestones, and scope** from an uploaded proposal are **not** imported into the service form; they are proposal-specific and must be entered in the wizard.
- Imported content can land in **Custom Sections** if the heading is unrecognized.
- **Always proofread** imported content before saving a service or sending a proposal.

### Client research

- Depends on publicly available web content; niche or private companies may return little or no data.
- Research results can be outdated or incomplete. Treat as a draft, not verified fact.
- Logo pulled from the web may not be the official asset the client wants on the cover page.

### Executive summary AI draft

- May generalize or miss nuance if research is thin.
- Does not replace human review for accuracy, tone, or commercial commitments.

### Document export (DOCX / PDF)

- Export aims for a **clean, consistent Prime Infoserv layout**, not a pixel-perfect copy of an original Word template.
- Rich text is simplified for export (e.g. some formatting may flatten to plain paragraphs or bullets).
- OWASP coverage and large tables may paginate differently than in Word.
- Generated files are produced on demand; there is no built-in version history beyond what you save in the database.

### Data and access

- **Supabase mode:** Services and proposals sync across devices using the same project keys. There is no per-user permissions model in the standalone app — anyone with app access shares the same data.
- **Local mode (`VITE_LOCAL_DEV`):** Data exists only in that browser; clearing site data deletes it.
- Client logos are stored as data URLs in the database; very large images are rejected (600 KB cap).

### Authentication

- The standalone build assumes a simple authenticated shell. It is not a full enterprise SSO or role-based access product.

### What this app is not

- Not a contract or e-signature tool  
- Not a guarantee of legal/commercial accuracy  
- Not a replacement for subject-matter review of technical scope and pricing  
- Not optimized for importing arbitrary proposal formats without manual cleanup  

---

## Expectations — what works well

- Maintaining a **library of service templates** reused across clients.  
- Fast **first drafts** of proposals with consistent branding and terms.  
- **Hiding empty sections** so the final PDF/DOCX does not show blank headings.  
- **Shared database** (Supabase) so the team sees the same services and proposals.  
- **Editable rich text** everywhere — imported, AI-generated, or template text should always be reviewed and adjusted.

---

## Tips for best results

1. **Build services manually first** for your main offerings; use import only to speed up initial content entry.  
2. Use **clear, consistent section titles** in Word templates (e.g. `1. Executive Summary`, `4. Deliverables`) to improve import mapping.  
3. Complete **client research** before drafting the executive summary.  
4. Use the **Review** step as the final QA pass before save and export.  
5. Keep **Approach & Methodology** and **Prerequisites** in the service template; keep **scope and commercials** in the proposal wizard.  
6. Re-export DOCX/PDF after any edit on a saved proposal if you need an updated file.

---

## Quick reference — environment

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` | Shared database across devices |
| `ANTHROPIC_API_KEY` | AI executive summary (+ optional research enrichment) |
| `FIRECRAWL_API_KEY` | Web client research |
| `VITE_LOCAL_DEV=true` | Browser-only storage when Supabase is not configured |

See [README-STANDALONE.md](./README-STANDALONE.md) for setup commands and the one-time `supabase/setup.sql` step.

---

## Getting help / reporting issues

When reporting a bad import or export, include:

- The original `.docx` or a paste sample (redact client names if needed)  
- Which sections mapped incorrectly  
- Whether you used Supabase or local mode  

That makes it easier to improve heading detection and mapping over time.
