# Product Requirements Document: Undergraduate Business Student Hobbies Survey

## Overview

Build a short web-based survey targeted at undergraduate business students that collects information about their background and leisure hobbies. The app has two pages: a survey form and a results page showing aggregated responses. Responses are stored in a Supabase PostgreSQL database.

---

## Survey Questions

The survey must include the following four questions, using the specified input types:

| # | Question | Input Type |
|---|----------|------------|
| 1 | What is your hometown? | Text input box |
| 2 | What state are you from? | Dropdown list (all 50 U.S. states) |
| 3 | What year are you in college? | Radio buttons |
| 4 | What hobbies do you do to relax? | Checkboxes + conditional text input |

### Question Details

**Q1 — Hometown**
- Free-text input
- Placeholder: "e.g. Springfield"
- Required field

**Q2 — State**
- Dropdown list containing all 50 U.S. states in alphabetical order
- Required field

**Q3 — Year in College**
- Radio button group with the following options (select one):
  - 1st Year
  - 2nd Year
  - 3rd Year
  - 4th Year
  - 5th Year or More
- Required field

**Q4 — Hobbies (select all that apply)**
- Checkboxes with the following options:
  - Read
  - Run
  - Hike
  - Bike
  - Swim
  - Other
- If "Other" is checked, display a text input box asking the user to describe their other hobby
- At least one checkbox must be selected (required)
- The "Other" text box is required if "Other" is checked

---

## Form Behavior

- All fields are required; display inline validation error messages if the user submits without completing a field
- The "Other" hobby text box appears dynamically only when "Other" is checked
- On successful submission, display a thank-you confirmation screen showing a summary of the user's answers
- The thank-you screen includes two buttons:
  - "Submit Another Response" — resets the form
  - "View Results" — navigates to the results page
- The submit button shows "Submitting..." while the request is in flight
- If the database insert fails, display an error message and keep the form intact

---

## Results Page

A separate `/results` route displays aggregated, anonymized data from all submissions. Individual responses are never shown — only group-level summaries.

### Charts / Visualizations

1. **Total Responses** — a large number prominently displayed at the top
2. **Year in College** — vertical bar chart, one bar per year option, ordered chronologically
3. **Most Popular Hobbies** — horizontal bar chart, sorted by count descending
4. **Top States Represented** — pie chart showing up to the top 10 states by response count, with percentage labels

Use a charting library (e.g. Recharts) for all visualizations.

### Navigation

- The results page has a "Take the Survey" button linking back to the survey form
- The survey form has a "View Results" button in the header linking to the results page

---

## Tech Stack

- **Frontend**: React with Vite (TypeScript)
- **UI Components**: shadcn/ui component library (Button, Input, Label, Card, RadioGroup, Checkbox, Select)
- **Routing**: Wouter (client-side routing)
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Supabase client**: `@supabase/supabase-js`

---

## Database

### Supabase Table: `survey_responses`

Run the following SQL in the Supabase SQL Editor to create the table and configure access:

```sql
CREATE TABLE survey_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  hometown text NOT NULL,
  state text NOT NULL,
  college_year text NOT NULL,
  hobbies text[] NOT NULL,
  other_hobby text
);

-- Allow anonymous users to submit responses
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts"
  ON survey_responses
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to read aggregated results
CREATE POLICY "Allow anonymous reads"
  ON survey_responses
  FOR SELECT
  TO anon
  USING (true);
```

### Column Details

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid | Auto-generated primary key |
| `created_at` | timestamptz | Auto-set to current timestamp |
| `hometown` | text | Free-text answer to Q1 |
| `state` | text | U.S. state name (e.g. "Ohio") |
| `college_year` | text | One of: "1", "2", "3", "4", "5+" |
| `hobbies` | text[] | Array of selected hobby IDs (e.g. ["read", "hike"]) or the custom text if "Other" |
| `other_hobby` | text | Null unless "Other" was selected; stores the user's custom hobby text |

---

## Environment Variables

The following environment variables must be set (prefixed with `VITE_` so Vite exposes them to the browser):

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>
```

Both values are found in your Supabase dashboard under **Project Settings → API**.

---

## Supabase Client Setup

Create a singleton client file (e.g. `src/lib/supabase.ts`):

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## Deployment (Azure Static Web Apps)

Include a `staticwebapp.config.json` file in the Vite `public/` folder so client-side routing works correctly when a user navigates directly to `/results`:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.{js,css,ico,png,svg,json}"]
  }
}
```

- **Build command**: `vite build`
- **Output folder**: `dist`
- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Application Settings in the Azure portal — they are baked into the app at build time

---

## File Structure (Key Files)

```
src/
├── lib/
│   └── supabase.ts          # Supabase client singleton
├── pages/
│   ├── Survey.tsx           # Survey form page (route: /)
│   └── Results.tsx          # Aggregated results page (route: /results)
├── App.tsx                  # Router setup (wouter)
└── index.css                # Global styles / theme variables
public/
└── staticwebapp.config.json # Azure SWA routing fallback
```

---

## Acceptance Criteria

- [ ] All four questions render with the correct input types
- [ ] "Other" hobby text box appears only when "Other" is checked
- [ ] Validation prevents submission if any required field is empty
- [ ] Successful submission saves a row to `survey_responses` in Supabase
- [ ] Thank-you screen displays a summary of the submitted answers
- [ ] Results page shows total count, year chart, hobby chart, and state chart
- [ ] Charts populate from live Supabase data
- [ ] Navigation works between survey and results pages
- [ ] `/results` route works on direct load (no 404) when deployed to Azure
