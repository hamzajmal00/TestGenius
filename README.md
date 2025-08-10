This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Backend (Auth + Projects) added

### Setup
1. Copy `.env.example` to `.env` and set `DATABASE_URL` for Postgres and `JWT_SECRET`.
2. Install deps: `npm install`
3. Generate Prisma client: `npx prisma generate`
4. Create tables: `npx prisma migrate dev --name init`
5. Run the app: `npm run dev`

### Auth
- POST `/api/auth/register` { email, password, name? } -> sets HttpOnly cookie
- POST `/api/auth/login` { email, password } -> sets HttpOnly cookie
- POST `/api/auth/logout` -> clears cookie
- GET `/api/me` -> current user

### Projects
- GET `/api/projects` -> list projects for logged-in user
- POST `/api/projects` -> create { name, description? }
- GET `/api/projects/[id]`
- PATCH `/api/projects/[id]`
- DELETE `/api/projects/[id]`

Minimal UI pages:
- `/register`, `/login`, `/projects`
