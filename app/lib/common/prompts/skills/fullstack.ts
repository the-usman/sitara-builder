import type { PromptSkill } from './types';

export const fullstackSkill: PromptSkill = {
  name: 'fullstack',
  description: 'Full-stack app patterns: backend APIs, auth flows, payments, server architecture, data modeling.',
  triggers:
    /\b(backend|back-end|fullstack|full-stack|full stack|server|api|apis|endpoint|express|fastify|auth|login|log in|signup|sign up|jwt|session|stripe|payment|checkout|webhook|websocket|database|prisma|orm|rest|graphql)\b/,
  body: () => `
<fullstack_skill>
  When the user asks for a full-stack website, API, dashboard, SaaS, or any project that needs
  a backend, database, or auth — follow this protocol BEFORE writing any code.

  ═══════════════════════════════════════════════════════
  ## STEP 1 — ALWAYS ask for required variables first
  ═══════════════════════════════════════════════════════

  Before generating any code, output a single message that:
  1. States the stack you will build (Next.js App Router / FastAPI)
  2. Lists every environment variable the project needs with a short description
  3. Offers a **Demo Mode** fallback for the database if the user doesn't have credentials

  Template message to send:

  > **Before I build, I need a few details:**
  >
  > **Stack:** Next.js 14 App Router + PostgreSQL  (or FastAPI + MongoDB, etc.)
  >
  > **Required variables — please provide values, or type "demo" for any you don't have yet:**
  >
  > | Variable | Purpose | Example |
  > |---|---|---|
  > | \`DATABASE_URL\` | Postgres connection | \`postgresql://user:pass@host/db\` |
  > | \`NEXTAUTH_SECRET\` | Session encryption (32-char random string) | run: \`openssl rand -base64 32\` |
  > | \`NEXTAUTH_URL\` | App URL | \`http://localhost:3000\` |
  > | \`RESEND_API_KEY\` | Email sending | \`re_xxxx\` |
  >
  > Type **"demo"** for any variable you don't have — I'll substitute a working local alternative.

  NEVER skip this step. NEVER assume env var values. NEVER hardcode credentials.

  ═══════════════════════════════════════════════════════
  ## STEP 2 — Required variables by stack & service
  ═══════════════════════════════════════════════════════

  Ask ONLY for variables that the project actually uses. Use this table:

  | Service | Variables to ask for |
  |---|---|
  | **Supabase** | \`NEXT_PUBLIC_SUPABASE_URL\`, \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\` |
  | **MongoDB Atlas** | \`MONGODB_URI\` (format: \`mongodb+srv://user:pass@cluster.mongodb.net/dbname\`) |
  | **PostgreSQL** | \`DATABASE_URL\` (format: \`postgresql://user:pass@host:5432/dbname\`) |
  | **MySQL** | \`DATABASE_URL\` (format: \`mysql://user:pass@host:3306/dbname\`) |
  | **Redis** | \`REDIS_URL\` (format: \`redis://default:pass@host:6379\`) |
  | **NextAuth.js** | \`NEXTAUTH_SECRET\` (random 32-char string), \`NEXTAUTH_URL\` |
  | **Clerk auth** | \`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\`, \`CLERK_SECRET_KEY\` |
  | **Stripe** | \`STRIPE_SECRET_KEY\`, \`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\`, \`STRIPE_WEBHOOK_SECRET\` |
  | **Resend email** | \`RESEND_API_KEY\` |
  | **SendGrid** | \`SENDGRID_API_KEY\` |
  | **Cloudinary** | \`CLOUDINARY_CLOUD_NAME\`, \`CLOUDINARY_API_KEY\`, \`CLOUDINARY_API_SECRET\` |
  | **AWS S3** | \`AWS_ACCESS_KEY_ID\`, \`AWS_SECRET_ACCESS_KEY\`, \`AWS_REGION\`, \`AWS_BUCKET_NAME\` |
  | **Pusher** | \`PUSHER_APP_ID\`, \`PUSHER_KEY\`, \`PUSHER_SECRET\`, \`PUSHER_CLUSTER\` |
  | **OpenAI** | \`OPENAI_API_KEY\` |
  | **FastAPI JWT** | \`SECRET_KEY\` (random 32-char), \`ALGORITHM\` (default: \`HS256\`), \`ACCESS_TOKEN_EXPIRE_MINUTES\` |

  ═══════════════════════════════════════════════════════
  ## STEP 3 — Demo Mode (user types "demo" for a variable)
  ═══════════════════════════════════════════════════════

  If the user cannot provide a database credential, substitute a **fully working local alternative**
  that requires zero external accounts. The app must still work — no broken pages.

  | Real service | Demo substitute | How |
  |---|---|---|
  | PostgreSQL / MySQL | **SQLite** via Prisma | \`datasource db { provider = "sqlite" url = "file:./dev.db" }\` |
  | MongoDB | **lowdb** (JSON file DB) | \`npm install lowdb@3\` — stores data in \`db.json\` |
  | Redis | **In-memory Map** | Simple JS \`Map\` as a module-level singleton |
  | Auth / sessions | **iron-session** with cookie | No external service needed |
  | Email | **Console log** stub | Log the email content to stdout, show it on screen |
  | File storage | **Local \`/public/uploads\`** | Save files to disk in the WebContainer |

  When using demo mode:
  - Add a visible yellow banner: \`⚠️ Running in Demo Mode — data resets on restart\`
  - Set \`DATABASE_URL="file:./dev.db"\` in \`.env.local\` automatically
  - Comment every demo substitution with \`// DEMO MODE — replace with real value in production\`
  - Structure the code so swapping to production only requires updating \`.env\` — no code changes

  ═══════════════════════════════════════════════════════
  ## Next.js 14 App Router — Full-Stack Scaffold
  ═══════════════════════════════════════════════════════

  ### Folder structure
  \`\`\`
  app/
    (auth)/
      login/page.tsx
      register/page.tsx
    (dashboard)/
      layout.tsx          ← protected layout (redirects if not authed)
      page.tsx
    api/
      auth/[...nextauth]/route.ts
      [resource]/
        route.ts          ← GET list, POST create
        [id]/route.ts     ← GET one, PUT update, DELETE
    layout.tsx            ← root layout with providers
    page.tsx              ← public landing page
  components/
    ui/                   ← shadcn/ui or custom primitives
    forms/
    layout/
  lib/
    db.ts                 ← database client singleton
    auth.ts               ← auth options / session helpers
    validations.ts        ← zod schemas
  middleware.ts           ← route protection
  .env.local              ← all secrets (gitignored)
  \`\`\`

  ### Database client singleton (Prisma example)
  \`\`\`typescript
  // lib/db.ts
  import { PrismaClient } from '@prisma/client';
  const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
  export const db = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
  \`\`\`

  ### Database client singleton (MongoDB + Mongoose example)
  \`\`\`typescript
  // lib/db.ts
  import mongoose from 'mongoose';
  const MONGODB_URI = process.env.MONGODB_URI!;
  let cached = (global as any).mongoose ?? { conn: null, promise: null };
  export async function connectDB() {
    if (cached.conn) return cached.conn;
    cached.promise ??= mongoose.connect(MONGODB_URI, { bufferCommands: false });
    cached.conn = await cached.promise;
    return cached.conn;
  }
  \`\`\`

  ### API route pattern (App Router)
  \`\`\`typescript
  // app/api/posts/route.ts
  import { NextRequest, NextResponse } from 'next/server';
  import { getServerSession } from 'next-auth';
  import { authOptions } from '@/lib/auth';
  import { db } from '@/lib/db';
  import { z } from 'zod';

  const createSchema = z.object({ title: z.string().min(1), content: z.string() });

  export async function GET() {
    const posts = await db.post.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(posts);
  }

  export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = createSchema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });
    const post = await db.post.create({ data: { ...body.data, authorId: session.user.id } });
    return NextResponse.json(post, { status: 201 });
  }
  \`\`\`

  ### Middleware (route protection)
  \`\`\`typescript
  // middleware.ts
  import { withAuth } from 'next-auth/middleware';
  export default withAuth({ pages: { signIn: '/login' } });
  export const config = { matcher: ['/dashboard/:path*', '/api/protected/:path*'] };
  \`\`\`

  ### NextAuth setup
  \`\`\`typescript
  // lib/auth.ts
  import type { NextAuthOptions } from 'next-auth';
  import CredentialsProvider from 'next-auth/providers/credentials';
  import bcrypt from 'bcryptjs';
  import { db } from './db';

  export const authOptions: NextAuthOptions = {
    providers: [
      CredentialsProvider({
        name: 'credentials',
        credentials: { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } },
        async authorize(creds) {
          if (!creds?.email || !creds.password) return null;
          const user = await db.user.findUnique({ where: { email: creds.email } });
          if (!user || !(await bcrypt.compare(creds.password, user.password))) return null;
          return { id: user.id, email: user.email, name: user.name };
        }
      })
    ],
    session: { strategy: 'jwt' },
    callbacks: {
      jwt: async ({ token, user }) => { if (user) token.id = user.id; return token; },
      session: async ({ session, token }) => { if (token) session.user.id = token.id as string; return session; },
    },
    pages: { signIn: '/login' },
    secret: process.env.NEXTAUTH_SECRET,
  };
  \`\`\`

  ### .env.local template (always generate this file)
  \`\`\`bash
  # Database
  DATABASE_URL="file:./dev.db"          # Demo: SQLite. Production: replace with real URL

  # Auth
  NEXTAUTH_URL="http://localhost:3000"
  NEXTAUTH_SECRET=""                    # Generate: openssl rand -base64 32

  # Add other keys here as needed
  \`\`\`

  ═══════════════════════════════════════════════════════
  ## FastAPI — Full-Stack Scaffold
  ═══════════════════════════════════════════════════════

  ### Folder structure
  \`\`\`
  app/
    main.py               ← FastAPI app, CORS, router includes
    config.py             ← pydantic-settings BaseSettings (reads .env)
    database.py           ← SQLAlchemy engine + session factory
    models/               ← SQLAlchemy ORM models
      user.py
      post.py
    schemas/              ← Pydantic request/response schemas
      user.py
      post.py
    routers/              ← APIRouter per resource
      auth.py
      users.py
      posts.py
    dependencies.py       ← get_db, get_current_user
    utils/
      security.py         ← password hashing, JWT
  .env                    ← secrets (gitignored)
  requirements.txt
  \`\`\`

  ### config.py — reads ALL env vars via pydantic-settings
  \`\`\`python
  from pydantic_settings import BaseSettings

  class Settings(BaseSettings):
      DATABASE_URL: str = "sqlite+aiosqlite:///./demo.db"  # demo fallback
      SECRET_KEY: str = "change-me-in-production"
      ALGORITHM: str = "HS256"
      ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
      CORS_ORIGINS: list[str] = ["http://localhost:3000"]

      class Config:
          env_file = ".env"

  settings = Settings()
  \`\`\`

  ### database.py — async SQLAlchemy (works with SQLite demo + PostgreSQL production)
  \`\`\`python
  from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
  from sqlalchemy.orm import DeclarativeBase
  from app.config import settings

  engine = create_async_engine(settings.DATABASE_URL, echo=False)
  AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

  class Base(DeclarativeBase):
      pass

  async def get_db() -> AsyncSession:
      async with AsyncSessionLocal() as session:
          yield session
  \`\`\`

  ### main.py
  \`\`\`python
  from fastapi import FastAPI
  from fastapi.middleware.cors import CORSMiddleware
  from app.config import settings
  from app.database import engine, Base
  from app.routers import auth, users, posts

  app = FastAPI(title="API", version="1.0.0")

  app.add_middleware(CORSMiddleware, allow_origins=settings.CORS_ORIGINS,
      allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

  @app.on_event("startup")
  async def startup():
      async with engine.begin() as conn:
          await conn.run_sync(Base.metadata.create_all)  # auto-creates tables on start

  app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
  app.include_router(users.router, prefix="/api/users", tags=["users"])
  app.include_router(posts.router, prefix="/api/posts", tags=["posts"])
  \`\`\`

  ### Auth router (JWT)
  \`\`\`python
  from fastapi import APIRouter, Depends, HTTPException, status
  from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
  from sqlalchemy.ext.asyncio import AsyncSession
  from jose import JWTError, jwt
  from passlib.context import CryptContext
  from datetime import datetime, timedelta
  from app.config import settings
  from app.database import get_db

  router = APIRouter()
  pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
  oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

  def create_access_token(data: dict):
      expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
      return jwt.encode({**data, "exp": expire}, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

  async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
      try:
          payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
          user_id: str = payload.get("sub")
          if user_id is None: raise HTTPException(status_code=401, detail="Invalid token")
      except JWTError:
          raise HTTPException(status_code=401, detail="Invalid token")
      # fetch user from db here
      return user_id

  @router.post("/token")
  async def login(form: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
      # verify user against db
      token = create_access_token({"sub": "user_id_here"})
      return {"access_token": token, "token_type": "bearer"}
  \`\`\`

  ### requirements.txt (always generate this)
  \`\`\`
  fastapi>=0.111.0
  uvicorn[standard]>=0.29.0
  pydantic-settings>=2.2.0
  sqlalchemy[asyncio]>=2.0.0
  aiosqlite>=0.20.0          # demo SQLite driver — no credentials needed
  asyncpg>=0.29.0            # production PostgreSQL driver
  motor>=3.4.0               # MongoDB async driver (if MongoDB chosen)
  python-jose[cryptography]>=3.3.0
  passlib[bcrypt]>=1.7.4
  python-multipart>=0.0.9
  \`\`\`

  ### .env template (always generate this)
  \`\`\`bash
  # Database — demo uses SQLite (no credentials needed)
  DATABASE_URL=sqlite+aiosqlite:///./demo.db
  # Production PostgreSQL example:
  # DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname
  # Production MongoDB example:
  # MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

  # Auth
  SECRET_KEY=change-me-generate-with-openssl-rand-base64-32
  ALGORITHM=HS256
  ACCESS_TOKEN_EXPIRE_MINUTES=30
  \`\`\`

  ═══════════════════════════════════════════════════════
  ## Critical Rules
  ═══════════════════════════════════════════════════════

  1. **Always ask for variables BEFORE building** — one upfront message, never mid-build
  2. **Never hardcode secrets** — every credential goes in \`.env\` / \`.env.local\`
  3. **Always generate the \`.env\` file** with placeholder comments so user knows what to fill
  4. **Always generate \`.gitignore\`** that includes \`.env\`, \`.env.local\`, \`*.db\`, \`__pycache__\`
  5. **Demo mode = SQLite** — zero config, works in WebContainer, swap to production by editing \`.env\` only
  6. **Database connections are singletons** — never open a new connection per request
  7. **Always add Zod (Next.js) or Pydantic (FastAPI) validation** on every API input
  8. **Always protect routes** — middleware.ts (Next.js) or Depends(get_current_user) (FastAPI)
  9. **CORS** — always configure for FastAPI; Next.js handles it via same-origin API routes
  10. **Passwords** — always hash with bcrypt, never store plain text
</fullstack_skill>
`,
};
