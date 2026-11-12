# StudyMate

StudyMate helps students plan sessions, use a focus timer, complete quick knowledge checks, and track study time, streaks, and achievements. The app opens directly without a sign-in page.

## Features

- Soft pastel study planner dashboard, daily tasks, achievements, practice quiz, and study progress pages.
- A personal planner with daily goals, mood tracking, priorities, to-do items, appointments, and notes, with daily, weekly, and monthly views.
- Daily rewards are granted automatically when a 25-minute focus session finishes, a 15-minute revision session finishes, or the daily quiz is passed. The quiz requires at least 4 correct answers out of 5.
- Each task can award study points only once each day. There are no reward-claim buttons or repeatable point actions.
- Study timers keep running when navigating between pages, and finished sessions are added to the study history.
- The responsive layout includes a compact mobile navigation bar and avoids horizontal overflow on phone-sized screens.
- Users can create and choose local profiles without signing in. Study progress, planner entries, finance transactions, and gamification data are stored per profile in this browser's `localStorage`.
- Existing signed-in browser data is migrated to a local profile on first use; no email is required for new profiles.
- GitHub Pages deploys the static app from the repository root whenever changes reach `main`.

The app is static and has no authentication, server-side progress validation, or cross-device sync. GitHub Pages serves a public website; local profiles only separate data on the same browser and are not security boundaries. Anyone with access to that browser can open its profiles or inspect/edit local storage. Do not store sensitive or financial data you need to keep confidential.

## Run locally

Serve this folder with a static web server and open `index.html`. `index.html`, `study.css`, and `study.js` power StudyMate. `finance.html` retains the original gwcatat finance tracker and uses the selected local profile.
