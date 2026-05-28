# Muzer

Muzer is a collaborative music queue for live creators. Viewers can submit YouTube tracks, vote on the queue, and let the creator play the most requested songs from a shared dashboard.

> Live demo: Add deployed app link here

## Problem Solved

Live streams, parties, and community events often rely on scattered song requests from chat messages or DMs. That makes requests hard to track, duplicates common, and queue order subjective. Muzer centralizes requests into one shareable creator page, ranks songs by audience votes, and gives the creator direct control over what plays next.

## Features

- Creator dashboard with embedded YouTube playback and queue controls
- Shareable creator page for viewers to add songs and vote
- YouTube URL validation and metadata lookup through the YouTube Data API
- Upvote-based queue ranking with duplicate protection for recent submissions
- Authenticated sessions with Google OAuth and email/password credentials
- Creator-only actions for playing, removing, and advancing songs
- Persistent queue, vote, and playback state stored in PostgreSQL through Prisma
- Responsive UI built with Next.js App Router, Tailwind CSS, and reusable UI components

## Tech Stack

- Framework: Next.js App Router, React, TypeScript
- Styling: Tailwind CSS, shadcn-style UI primitives, Radix UI
- Auth: NextAuth.js with Google OAuth and credentials login
- Database: PostgreSQL with Prisma ORM and migrations
- Media: YouTube Data API, YouTube iframe/player integration
- Validation: Zod
- Deployment target: Vercel or any Node-compatible host

## Architecture Overview

```text
Viewer / Creator Browser
        |
        v
Next.js App Router pages
  - /              Landing page
  - /auth          Sign in / sign up
  - /dashboard     Creator playback dashboard
  - /creator/:id   Public request and voting page
        |
        v
API route handlers under /app/api
  - /api/streams           Add and fetch queue items
  - /api/streams/upvote    Toggle viewer votes
  - /api/streams/next      Select next highest-voted stream
  - /api/streams/remove    Creator queue management
        |
        v
Prisma data layer
  User, Stream, Upvote, CurrentStream, Space
        |
        v
PostgreSQL + YouTube Data API
```

The frontend uses a shared `StreamView` component for both the creator dashboard and viewer page. The creator version enables playback and management controls, while the viewer version focuses on submissions, voting, and the currently playing track. Queue state is refreshed from API routes and persisted in PostgreSQL.

## Screenshots

Screenshots are intentionally kept in `docs/screenshots/` so the README stays lightweight.

| Screen | File |
| --- | --- |
| Landing page | `docs/screenshots/landing.png` |
| Auth flow | `docs/screenshots/auth.png` |
| Creator dashboard | `docs/screenshots/dashboard.png` |
| Viewer queue page | `docs/screenshots/creator-queue.png` |

See [docs/screenshots.md](docs/screenshots.md) for capture instructions and naming guidelines.

## Local Setup

```bash
cd next-app
npm install
cp .env.example .env.local
npx prisma migrate dev
npm run dev
```

Open `http://localhost:3000` in your browser.

Useful commands:

```bash
npm run dev        # Start local development server
npm run build      # Generate Prisma client and build production app
npm run start      # Start production server after build
npx prisma studio  # Inspect local database records
```

## Environment Variables

Create `.env.local` from `.env.example` and fill in real credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/muzer"
DIRECT_URL="postgresql://username:password@localhost:5432/muzer"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
YOUTUBE_API_KEY="your-youtube-data-api-key"
```

For production, set the same variables in your hosting provider and update `NEXTAUTH_URL` to the deployed URL.

## Project Status

This is a portfolio-ready full-stack project that demonstrates authenticated user flows, relational data modeling, API route design, third-party API integration, and creator/viewer product workflows.
