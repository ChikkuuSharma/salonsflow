# Deployment Guide: SalonFlow Platform

This guide documents the procedures for local development setup, database migrations, connection pooling setup, and cloud rollout.

---

## 1. Local Setup

### Prerequisites
*   Node.js (`v20` or higher)
*   PostgreSQL running locally or on a cloud host (Neon/Supabase)

### Backend Setup
1.  Navigate to `/backend` and install dependencies:
    ```bash
    cd backend
    npm install
    ```
2.  Copy and configure `.env` variables:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/salonflow?schema=public"
    CLERK_SECRET_KEY="sk_test_..."
    OPENAI_API_KEY="sk-..."
    WHATSAPP_TOKEN="EAAG..."
    WHATSAPP_PHONE_NUMBER_ID="123456789"
    WHATSAPP_APP_SECRET="app-secret-abc"
    MISSED_CALL_SECRET="missed-call-secret-key"
    ```
3.  Execute Prisma migrations and compile the database client:
    ```bash
    npx prisma migrate dev
    npx prisma generate
    ```
4.  Start development API server:
    ```bash
    npm run start:dev
    ```

### Frontend Setup
1.  Navigate to `/frontend` and install dependencies:
    ```bash
    cd frontend
    npm install
    ```
2.  Configure local environment variables in `.env.local`:
    ```env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
    NEXT_PUBLIC_API_URL="http://localhost:3001"
    ```
3.  Start Next.js development client:
    ```bash
    npm run dev
    ```

---

## 2. PostgreSQL Connection Pooling

For production serverless environments (e.g. Next.js on Vercel or AWS Lambdas):
*   **Direct URLs**: Direct Postgres connection strings are prohibited for general application queries as they can exhaust connections during traffic spikes.
*   **Proxy URLs**: Configure the environment `DATABASE_URL` to point to a connection pool proxy (e.g., Neon connection pooling string ending in `-pooler` or Supabase pooler on port `6543`).
*   **Direct Migrations**: Maintain a separate `DIRECT_DATABASE_URL` environment string pointing directly to the database instance, which is strictly utilized during CLI migration runs (`prisma migrate deploy`).

---

## 3. Cloud Platform Rollouts

### Next.js Frontend (Vercel)
1.  Connect repository to Vercel account.
2.  Define Clerk keys and `NEXT_PUBLIC_API_URL` pointing to backend API server.
3.  Vercel automatically handles SSL, optimizations, and global CDN caching.

### NestJS Backend (Koyeb / Render)
1.  Deploy directly on Koyeb web services or Render web services via native Git integration.
2.  Set up the run command: `npx prisma db push && node dist/main`.
3.  Define the required environment variables (`DATABASE_URL`, `JWT_SECRET`, `PORT`).
4.  Route Meta webhook callbacks directly to the backend API domain.
