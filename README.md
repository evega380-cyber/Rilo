# Rilo · Core V2

Expo / React Native budgeting app. The original navy, blue, and green visual system is retained. Navigation now uses Expo Router; all calculations live in `src/core/budget.ts`.

## Run

Use Node 24, then `npm ci` and `npm start` (or `npm run web`). Choose a paycheck date and amount in Paychecks, add extra income in Income, and add dated bills in Bills. The Home screen selects an upcoming paycheck by default; choose any date to review its plan.

## Budget rules

- All money is stored as integer cents. Forms accept positive dollar amounts with up to two decimals.
- Each paycheck has its own amount, date, and expected/received status. “Add next biweekly paycheck” opens an editable entry 14 days later; it does not mark future money received.
- Extra income belongs to an explicitly selected paycheck and can be added, edited, deleted, moved, or marked received/expected.
- Available now = received paycheck + received extra income − all assigned bills. Expected income appears only in the forecast. A negative amount means the plan is not funded yet.
- Bills automatically use the latest paycheck on or before their due date unless explicitly assigned to another check. Bills before the first check remain unassigned and are flagged on Home. Adding or changing paycheck dates recalculates automatic assignments.
- Paid bills remain reserved, so marking a bill paid cannot inflate available money. This is a paycheck allocation planner, not a bank balance or transaction ledger. No carryover is assumed between plans.
- Bills and paychecks remain individual editable occurrences. Use **Set repeats** on an existing entry to opt into a weekly, biweekly, or monthly schedule. Automatic generation never creates bank transactions.
- A paycheck cannot be deleted until its assigned income and bills have been moved or deleted. All deletes require confirmation.
- The side-gig goal is one reusable target applied to each selected paycheck. It never counts as income.

## Repeating bills and paycheck scheduling

1. Add a real bill or paycheck (or use one you already entered).
2. Choose **Set repeats**, select weekly / every 2 weeks / monthly, review the next dates, and confirm.
3. On Bills, each repeating bill appears once with its next three occurrence dates and per-payment amounts/status. **Manage occurrences** expands its saved payments for editing, paid/unpaid status, and deletion. Unscheduled bills stay separate. The preview can show dates beyond the 90-day planning window, labeled as not yet in your plan; it does not create or reserve money for those preview-only dates.
4. Rilo generates occurrences through 90 days from today on load, on budget changes, and while the app stays open. It does not run a background service while closed; reopening catches up.

Monthly schedules keep the original day as their anchor: January 31 becomes February 28/29, then March 31. New bills are always unpaid and use automatic paycheck assignment; new paychecks are always expected. The original entry keeps its ID, status, amount, and bill assignment.

A persisted schedule cursor and stable occurrence IDs prevent duplicate generation on reload and prevent deleted entries from reappearing. Matching existing manual entries (same name, date, and amount) are skipped without overwriting them. Different named paycheck streams can share a date.

**Repeating bills/paychecks** controls let you pause/resume and edit future name, amount, category, and end date. Edits apply only to occurrences not already generated. Existing entries, including paid/received history and occurrences beyond a newly shortened end date, remain available for individual editing/deletion. Resume catches up missed occurrences. To change cadence or anchor date, pause the old schedule and create a new schedule from a new entry; review overlapping entries first.

Schedules start from entries no more than one year old (or future entries) to avoid accidentally generating years of history. Existing Core V2 data stays under the same storage key and loads without requiring a reset; nothing repeats until you opt in.

## Saved data

Budget data is stored locally on the device/browser using AsyncStorage, under `rilo.budget.v2`. It is not cloud synced or encrypted. There is no bank connection. The prior branch contained only hardcoded demo amounts and no persisted income to migrate; V2 starts empty rather than treating demo money as real balances.

Saved data is schema-validated before loading. Failed loads block editing and preserve the original data; Retry attempts loading again. Failed saves show a visible retry action. Writes are serialized so a slower old write cannot overwrite newer edits. Do not clear app/browser storage if you need to retain your budget.

## Review and validation

`npm test` runs money, income-status, paid-bill, assignment, date, deletion, saved-schema, and recurrence regression tests. `npm run typecheck` and `npm run lint` check the application. `npx expo export --platform web` verifies bundling. GitHub Actions runs these checks on this feature branch and pull requests. iOS/Android hardware testing is still needed before release.

Recurring budget work is prepared on `feature/recurring-budget`; main is not modified or merged automatically. Text reminders, bank sync, and dedicated debt tracking are future work.
