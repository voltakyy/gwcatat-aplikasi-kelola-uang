# StudyMate

StudyMate helps students plan sessions, use a focus timer, complete quick knowledge checks, and track study time, streaks, and achievements.

## Features

- Soft pastel study planner dashboard, daily tasks, achievements, practice quiz, and study progress pages.
- A personal planner with daily goals, mood tracking, priorities, to-do items, appointments, and notes, with daily, weekly, and monthly views.
- Daily rewards are granted automatically when a 25-minute focus session finishes, a 15-minute revision session finishes, or the daily quiz is passed. The quiz requires at least 4 correct answers out of 5.
- Each task can award study points only once each day. There are no reward-claim buttons or repeatable point actions.
- Study timers keep running when navigating between pages, and finished sessions are added to the study history.
- The responsive layout includes a compact mobile navigation bar and avoids horizontal overflow on phone-sized screens.
- Study progress is stored per signed-in account in this browser's `localStorage`.
- Personal planner entries are saved per signed-in account and date in this browser's `localStorage`.
- GitHub Pages deploys the static app from the repository root whenever changes reach `main`.

The app is static and has no server-side progress validation or cross-device sync. Data saved in local storage can be edited by the device owner; the daily reward limit prevents accidental or in-app repeat claims, not deliberate storage tampering.

## Run locally

Serve this folder with a static web server and open `login.html`. `index.html`, `study.css`, and `study.js` power StudyMate. `finance.html` retains the original gwcatat finance tracker.
