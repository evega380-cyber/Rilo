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
- Bills are individual dated occurrences. Add the next month's occurrence separately; this version does not silently generate recurring bills or bank transactions.
- A paycheck cannot be deleted until its assigned income and bills have been moved or deleted. All deletes require confirmation.
- The side-gig goal is one reusable target applied to each selected paycheck. It never counts as income.

## Saved data

Budget data is stored locally on the device/browser using AsyncStorage, under `rilo.budget.v2`. It is not cloud synced or encrypted. There is no bank connection. The prior branch contained only hardcoded demo amounts and no persisted income to migrate; V2 starts empty rather than treating demo money as real balances.

Saved data is schema-validated before loading. Failed loads block editing and preserve the original data; Retry attempts loading again. Failed saves show a visible retry action. Writes are serialized so a slower old write cannot overwrite newer edits. Do not clear app/browser storage if you need to retain your budget.

## Review and validation

`npm test` runs money, income-status, paid-bill, assignment, date, deletion, and saved-schema regression tests. `npm run typecheck` and `npm run lint` check the application. `npx expo export --platform web` verifies bundling. GitHub Actions runs these checks on this feature branch and pull requests. iOS/Android hardware testing is still needed before release.

Work is prepared on `feature/budget-core-v2`; main is not modified or merged automatically. Text reminders, bank sync, recurring bill generation, and dedicated debt tracking are future work.
