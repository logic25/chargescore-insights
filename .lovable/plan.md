

## Plan: EVpin Report Upload with Auto-Extract + Site Documents Section

### What this does

1. **Upload EVpin PDFs per site** — parse the PDF server-side, extract the EVpin score (e.g. "4.6/5"), and auto-populate the score field in the Stall Sizer
2. **Documents section** — a new "Documents" tab in the Portfolio Builder sidebar where all uploaded site documents (EVpin reports, leases, permits, utility bills, etc.) are stored, viewable, and linked to specific sites

### How it works

**A. Storage & Database**

- Create a `site-documents` storage bucket (public read for authenticated users)
- Create a `site_documents` table:
  - `id`, `user_id`, `site_name`, `address`, `file_name`, `file_path` (storage path), `doc_type` (enum: `evpin_report`, `lease`, `permit`, `utility_bill`, `other`), `extracted_data` (JSONB — parsed metrics from EVpin), `created_at`
- RLS: users can only CRUD their own documents

**B. EVpin PDF Parsing Edge Function**

- New edge function `parse-evpin-report` that:
  1. Receives the uploaded PDF (or storage path)
  2. Extracts text content from the PDF
  3. Uses regex to pull key metrics: Total Score (e.g. "4.6/5"), AADT, EV adoption %, L3 ports count, crime rates, purchasing power %
  4. Returns structured JSON with all extracted values
- This avoids needing an AI model — EVpin reports have a consistent format that regex can reliably parse

**C. Stall Sizer Integration**

- Add an "Upload EVpin Report" button next to the EVpin Score field
- On upload: store file to bucket → call parse edge function → auto-fill EVpin score + optionally cross-reference AADT/EV adoption values
- Show a small indicator when data came from an uploaded report vs. manual entry

**D. Documents Tab (Portfolio Sidebar)**

- New sidebar tab: "Documents" with a FileText icon
- Documents page shows:
  - Upload dropzone (drag & drop or click)
  - Document type selector (EVpin, Lease, Permit, Utility Bill, Other)
  - Site name/address association (dropdown of existing portfolio sites or free text)
  - Table of all uploaded documents with: name, type, site, date, download link
  - For EVpin docs: show extracted score badge inline

### Files to create/modify

| File | Change |
|------|--------|
| Migration SQL | `site_documents` table + `site-documents` storage bucket + RLS |
| `supabase/functions/parse-evpin-report/index.ts` | New edge function for PDF text extraction + regex parsing |
| `src/components/portfolio/DocumentsManager.tsx` | New — upload UI, document list, type selector |
| `src/components/portfolio/PortfolioSidebar.tsx` | Add "Documents" tab |
| `src/pages/PortfolioBuilder.tsx` | Render DocumentsManager when documents tab active |
| `src/components/portfolio/StallSizer.tsx` | Add upload button next to EVpin Score field, auto-fill on parse |

### Implementation order

1. Database migration (table + bucket + RLS)
2. Parse edge function
3. Documents tab UI
4. Wire upload flow in Stall Sizer EVpin field
5. Test end-to-end with the 1525 86th St report

