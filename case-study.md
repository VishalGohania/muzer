# Muzer Case Study

## What I Built

Muzer is a full-stack collaborative music queue for creators and their audiences. Creators get a dashboard for playback and queue control, while viewers get a shareable page where they can submit YouTube songs and vote on what should play next.

## My Role

I built the application end to end: product flow, Next.js pages, authentication, API route handlers, Prisma schema, queue logic, YouTube metadata integration, and the creator/viewer UI.

## Main Technical Challenges

- Designing one queue experience that supports both creator controls and viewer participation.
- Keeping vote counts, current playback, and queue ordering consistent across API routes and database state.
- Validating YouTube links and enriching submissions with video titles and thumbnails.
- Supporting both Google OAuth and credentials login while keeping user records consistent in Prisma.
- Preventing low-quality queue behavior such as duplicate recent submissions and oversized queues.

## What I Learned

- How to model product workflows with relational data instead of relying only on frontend state.
- How to structure Next.js App Router pages and API routes around authenticated user actions.
- How to integrate third-party APIs without exposing secrets to the client.
- How to make a portfolio project easier to evaluate by documenting problem, architecture, setup, and tradeoffs clearly.
