

# ChargeScore — EV Charging Site Validator MVP

## Overview
A premium fintech/proptech-style tool that helps commercial property owners evaluate EV charging opportunities. Electric teal (#00D4AA) on dark navy (#1B2A4A), Bloomberg-meets-Zillow aesthetic.

## Phase 1: Landing Page & Core Analysis Tool (No Auth)

### 1. Landing Page (Light Mode)
- Hero: "Is your parking lot leaving money on the table?" with address search bar (Nominatim/OpenStreetMap geocoding)
- 3 value prop cards with icons: Site Score in 60 Seconds / Find Every Incentive / Full Revenue Projection
- Social proof section (placeholder stats)
- CTA button → triggers address search
- Footer: "Powered by Managed Squares LLC"
- Typography: Plus Jakarta Sans (headings), DM Sans (body), JetBrains Mono (data)

### 2. Site Analysis Dashboard (Dark Mode)
When an address is entered, navigate to a multi-panel dashboard:

**Panel 1 — Map View (Left, 50%)**
- Leaflet map with OpenStreetMap tiles showing the property location
- Mock nearby EV stations as colored markers (Green=L2, Red=DCFC, Blue=Tesla) within configurable radius
- Clickable markers with popups (station name, network, ports, type)
- Competition density indicator

**Panel 2 — ChargeScore Gauge (Right, Top)**
- Animated circular score gauge (0-100) with red→yellow→green gradient
- Animated count-up on load
- Score calculated from: competition gap (30%), traffic proxy (25%), electrical feasibility (20%), incentive availability (15%), EV adoption (10%)
- One-line verdict below the gauge

**Panel 3 — Property Inputs (Right, Collapsible)**
- Editable form with amber-highlighted inputs
- Fields: Property Type dropdown, Total Parking Spaces, Peak Utilization slider, Electrical Service dropdown, L2/DCFC charger steppers, Price per kWh, State (auto-filled)
- All changes instantly recalculate the financial model (no submit button)

**Panel 4 — Financial Projection (Full Width)**
- Revenue section: daily/monthly/annual calculations based on inputs
- Cost section: hardware, installation, electrical upgrade warnings, electricity, demand charges, networking, maintenance
- Incentive cards: Federal 30C Tax Credit, NEVI Program, state-specific programs (hardcoded top 10 states), utility placeholder
- Hover-to-expand incentive details
- Summary box (sticky): Total Cost, Incentives, Net Investment, Annual Net Revenue, Payback Period (months), 5-Year ROI
- Recharts bar chart: Year 1-5 cumulative cash flow

**Panel 5 — Demand Charge Analyzer (Expandable)**
- Peak demand estimate based on charger config
- Monthly demand charge estimate
- Donut chart: demand charges vs energy charges
- Smart recommendations (load management, battery storage, EV-specific utility rates)
- Pulsing warning icon animation

**Panel 6 — Parking Impact Analysis**
- Available spaces calculation with buffer
- Horizontal bar visualization: Total → Peak Used → Available → Recommended for EV
- Warning if chargers exceed available spaces

### 3. Report Generation
- "Generate Site Report" button creates a printable/PDF-style view
- Includes all panels: score, map, financials, incentives, parking impact, demand charges
- Branded footer with Managed Squares LLC contact CTA

### 4. Design & Polish
- Glassmorphism cards (backdrop-blur, semi-transparent)
- Skeleton loading states
- Smooth number-tick animations on financial figures
- Mobile responsive (panels stack vertically)
- Dark mode dashboard, light mode landing page

## Phase 2: Auth & Saved Sites (Follow-Up)
- Supabase Auth (email/password + Google OAuth)
- Profiles table + site_analyses table + nearby_stations table
- Save/load site analyses
- Dashboard with saved site cards
- Free tier: 3 saved sites

