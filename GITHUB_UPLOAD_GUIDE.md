# Upload SubTrack to GitHub

## What this archive contains

This is the complete SubTrack source workspace, including the mobile app, API server, slide artifacts, shared libraries, documentation, package manifests, and project configuration. Replit-local metadata is excluded.

Generated or private files are intentionally excluded:

- `node_modules/`
- `.git/`
- `.local/` and `.agents/`
- build output such as `dist/`
- Expo caches
- local zip exports
- environment variables and secrets

## Option A: Upload with Git (recommended)

### 1. Install Git

Download Git from https://git-scm.com/downloads if it is not installed.

### 2. Extract this zip

Extract `subtrack-github-source-clean.zip`, then open Terminal, PowerShell, or Git Bash inside the extracted folder.

### 3. Create an empty GitHub repository

1. Sign in at https://github.com
2. Click **New repository**.
3. Name it, for example, `subtrack`.
4. Choose Public or Private.
5. Do **not** add a README, `.gitignore`, or license because this project already has files.
6. Click **Create repository**.

### 4. Run these commands

Replace `YOUR_USERNAME` with your GitHub username:

```bash
git init
git add .
git commit -m "Initial SubTrack source"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/subtrack.git
git push -u origin main
```

GitHub may ask you to sign in through a browser or use a personal access token instead of a password.

## Option B: Upload through the GitHub website

This works for smaller projects but is less reliable than Git.

1. Extract the zip.
2. Create an empty repository on GitHub.
3. On the repository page, choose **Add file → Upload files**.
4. Drag the extracted project files and folders into the upload area.
5. Enter a commit message and click **Commit changes**.

Do not upload the zip itself as the repository contents. Upload the extracted files.

## Install and run after cloning

Install Node.js 20+ and pnpm, then run:

```bash
corepack enable
pnpm install
```

Run the mobile/Expo app:

```bash
pnpm --filter @workspace/mobile run dev
```

Run the API server in another terminal:

```bash
pnpm --filter @workspace/api-server run dev
```

## Secrets

Never commit API keys, passwords, database URLs, or `.env` files to GitHub. Configure required secrets separately in the environment where the app runs. Automated secret checks found no unresolved findings in the retained source. This is not a guarantee that every possible secret or private datum has been detected.

## Local development caveats

The existing mobile `dev` script assumes Replit environment variables. For local Expo development, configure `EXPO_PUBLIC_API_URL` to a URL reachable from your device, then run from the repository root:

```bash
pnpm --filter @workspace/mobile exec expo start --port 8081
```

The API requires `PORT`, `DATABASE_URL`, `SESSION_SECRET`, `AI_INTEGRATIONS_OPENAI_BASE_URL`, and `AI_INTEGRATIONS_OPENAI_API_KEY` in its process environment. Set these privately before running the API command above. Database schema setup must also be completed for the chosen database. Merely creating an `.env` file does not guarantee that these scripts load it. Public Expo variables must never contain secrets.

Source behavior and package manifests were preserved. Dependency installation, builds, database connectivity, and application execution were not validated during archive preparation.
