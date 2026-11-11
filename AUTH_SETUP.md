# Rizzolve

Rizzolve is a student community and doubt-solving workspace.

## Individual student accounts

The frontend uses Supabase Auth for individual email/password accounts. Passwords are handled by Supabase Auth and are never stored in the frontend code or the Rizzolve profile table.

### Required frontend environment

Set these variables in the Embarko project **before building/redeploying**:

- `VITE_SUPABASE_URL`: your Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: the project's public anon/publishable key.

Use only the public client key here. **Never put a Supabase service-role key in a browser build or a `VITE_*` variable.** Vite embeds `VITE_*` values into the public JavaScript bundle.

A sample file is available at `frontend/.env.example`.

### Database setup

Apply migrations `001_initial_schema.sql` through `005_individual_accounts.sql` in order to the Supabase project. Migration 005:

- Adds student ID, course and semester to each profile.
- Enforces unique student IDs within a campus.
- Provisions a profile for each new Supabase Auth user.
- Provides a default Rizzolve Open Campus tenant until institution domains are configured.

For an existing Supabase project, apply only the migrations that have not already been run. Do not rerun the earlier non-idempotent schema migrations.

### User flow

1. A student registers using their name, college email, student ID, course, semester and password.
2. If email confirmation is enabled in Supabase, the student confirms their email before signing in.
3. The student signs in with their registered college email and password.
4. The session is restored on later visits and cleared on sign-out.
5. Forgot Password sends a Supabase recovery email; the recovery link opens the new-password form.

### Supabase dashboard checklist

- Enable Email provider under Authentication > Providers.
- Configure the site's URL as `https://rizzolve.embarko.app`.
- Add `https://rizzolve.embarko.app/**` to the allowed redirect URLs.
- Configure SMTP/email confirmation settings appropriate for your project.

### Local frontend development

From the `frontend` directory:

```bash
npm ci
cp .env.example .env
# Fill in your Supabase project URL and public anon/publishable key in .env
npm run dev
```

The hosted app needs the environment variables at **build time** because Vite bundles them into the browser application. After changing them, run a new Embarko deployment.
