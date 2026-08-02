# TODO — Phase 5 Step 3: Smart Financial Goals

## Goal
Add a Premium "Financial Goals" widget on the Dashboard that automatically generates 4 smart goals from existing AI Insights data — without any backend or database changes.

## Constraints (must preserve)
- Do NOT modify authentication, parser, upload flow, AI Analytics calculations, Alert Center, charts, or backend APIs.
- Consume ONLY existing APIs and existing data (summary.ai payload already fetched by Dashboard).
- Do NOT create new database tables.
- Do NOT require user input.
- Keep the premium dashboard theme and avoid crowding.
- Animations ONLY for: progress bars, goal completion, card appearance.

## Steps
- [x] 1. Analyze existing Dashboard.jsx, AiAlertCenter.jsx, aiInsightsService.js data shape, design system
- [x] 2. Approve plan with user
- [x] 3. Create frontend/src/components/FinancialGoals/FinancialGoals.jsx
  - [x] 3a. Goal derivation engine (Monthly Savings, Expense Reduction, Emergency Fund, Spending Control)
  - [x] 3b. Progress %, progress bar, current/target/remaining, status (On Track / Behind / Completed)
  - [x] 3c. Premium header + "Premium" badge, loading skeletons, empty states
  - [x] 3d. Animations (progress bars, completion spring, card fade-up stagger)
  - [x] 3e. Responsive grid (1-col mobile → 2-col)
- [x] 4. Integrate FinancialGoals into Dashboard.jsx (purely additive)
- [x] 5. Verify frontend build passes (`npm run build`)
- [ ] 6. Provide PASS/FAIL report

## Goal Derivation Logic (from existing AI insights payload)
| Goal | Current | Target |
|------|---------|--------|
| Monthly Savings Goal | Latest month savings | 20% of latest month income |
| Expense Reduction Goal | Latest month expense | 80% of latest month income (lower is better) |
| Emergency Fund Goal | Total savings (positive) | 3 × average monthly spending |
| Spending Control Goal | Average daily spending | 80% of daily income (lower is better) |

