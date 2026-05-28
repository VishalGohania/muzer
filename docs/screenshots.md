# Project Screenshots

Use this folder to store recruiter-facing screenshots for the README, LinkedIn Featured section, and portfolio writeups.

## Recommended Files

Save screenshots in `docs/screenshots/` using these names:

- `landing.png` - public landing page
- `auth.png` - sign in or sign up screen
- `dashboard.png` - creator dashboard with a populated queue
- `creator-queue.png` - viewer-facing creator page with voting

## Capture Checklist

- Use realistic sample data: recognizable song titles, several queue items, and visible vote counts.
- Capture at desktop width first, ideally 1440 x 900 or 1280 x 800.
- Avoid showing local secrets, browser extensions, terminal windows, or personal accounts.
- Prefer `.png` for crisp UI screenshots.
- Keep each image under 1 MB when possible so the README loads quickly.

## Suggested Flow

1. Run the app locally with `npm run dev`.
2. Create or sign in to a test account.
3. Add several YouTube URLs to the queue.
4. Capture the creator dashboard at `/dashboard`.
5. Copy the creator share link and capture the viewer page at `/creator/:creatorId`.
6. Add the screenshots to `docs/screenshots/` and confirm the README table paths still match.
