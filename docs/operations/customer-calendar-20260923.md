# Customer calendar and audit navigation — 2026-09-23

Customer usage-log date filters reuse the existing DateTimePicker/Calendar/Popover components instead of browser datetime-local popups. Compact mode places time editing inside the popup; zhCN and zhTW locale mapping is fixed, required dates cannot be cleared, and date/time edits respect the opposite range boundary. Mobile filters stack with 42px triggers and the popup remains within the viewport.

Audit navigation now requires administrator role. The customer sidebar preference card no longer offers its toggle. Direct audit-route visits by ordinary users redirect to usage logs. Administrator audit pages, underlying audit records and backend API permissions are unchanged.

Validation: 21 tests passed across the date-picker, sidebar navigation and sidebar configuration suites. Typecheck, affected-file lint, frontend build and Linux production binary build passed. Browser QA against a local preview with mock ordinary-user authentication confirmed Chinese calendar labels, selecting September 16 updates the submitted startTime correctly, audit-route redirection, and a 390px mobile document/popup without horizontal page overflow. No database mutation.

Deployment: `roark-20260923-calendar`, SHA256 `e4679b94a28043571363307b883f33c06a79276cea5998f7e79aecaeddb0bc22`. Origin static verification covered 1,763 assets. Previous release and compose backup retained at `/opt/roarkapi/backups/calendar-20260923-131351/compose.yml` for rollback.
