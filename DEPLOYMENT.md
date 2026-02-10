# ScoreForge Deployment Guide

## Overview

ScoreForge is a Turborepo monorepo with three main deployable components:

- **Web App** - Next.js 16 (Vercel recommended)
- **Mobile App** - Expo/React Native (EAS Build)
- **Backend** - Convex serverless functions

---

## 1. Convex Backend Deployment

Deploy the backend first since both apps depend on it.

### Prerequisites

- Convex account at https://convex.dev
- Bun installed (`npm install -g bun`)

### Steps

```bash
# Navigate to convex package
cd packages/convex

# Login to Convex (first time only)
npx convex login

# Create a new production project (first time only)
npx convex init

# Deploy to production
npx convex deploy
```

### Output

After deployment, you'll get a production URL:

```
https://[your-deployment].convex.cloud
```

Save this URL - you'll need it for the web and mobile apps.

---

## 2. Web App Deployment (Vercel)

### Prerequisites

- Vercel account at https://vercel.com
- Production Convex URL from step 1

### Option A: Vercel Dashboard

1. Import the GitHub repository
2. Set root directory to `apps/web`
3. Add environment variable:
   ```
   NEXT_PUBLIC_CONVEX_URL=https://[your-deployment].convex.cloud
   ```
4. Deploy

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to web app
cd apps/web

# Deploy
vercel --prod
```

When prompted, set the environment variable:

```
NEXT_PUBLIC_CONVEX_URL=https://[your-deployment].convex.cloud
```

### Build Settings

- **Framework**: Next.js
- **Build Command**: `bun run build`
- **Output Directory**: `.next`
- **Install Command**: `bun install`

---

## 3. Mobile App Deployment (EAS)

### Prerequisites

- Expo account at https://expo.dev
- EAS CLI installed (`npm install -g eas-cli`)
- Apple Developer account (for iOS)
- Google Play Console account (for Android)

### Setup

```bash
# Navigate to mobile app
cd apps/mobile

# Login to Expo
eas login

# Configure EAS (first time only)
eas build:configure
```

### Create `eas.json` in `apps/mobile/`:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Environment Variables

Create `apps/mobile/.env`:

```
EXPO_PUBLIC_CONVEX_URL=https://[your-deployment].convex.cloud
```

### Build & Submit

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android
```

---

## Environment Variables Summary

| App    | Variable                 | Description           |
| ------ | ------------------------ | --------------------- |
| Web    | `NEXT_PUBLIC_CONVEX_URL` | Convex production URL |
| Mobile | `EXPO_PUBLIC_CONVEX_URL` | Convex production URL |

---

## Recommended CI/CD Pipeline

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: bun run lint
      - run: bun run check-types

  deploy-convex:
    needs: lint-and-typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install
      - run: cd packages/convex && npx convex deploy
        env:
          CONVEX_DEPLOY_KEY: ${{ secrets.CONVEX_DEPLOY_KEY }}

  deploy-web:
    needs: deploy-convex
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: "--prod"
```

---

## Quick Reference Commands

```bash
# Development
bun run dev              # Start all apps + Convex

# Build
bun run build            # Build all apps

# Lint & Type Check
bun run lint             # Zero warnings enforced
bun run check-types      # TypeScript validation

# Convex
cd packages/convex
npx convex dev           # Local development
npx convex deploy        # Production deployment
npx convex logs          # View logs

# Mobile
cd apps/mobile
bun run ios              # iOS simulator
bun run android          # Android emulator
eas build --platform all # Build for both platforms
```

---

## Post-Deployment Checklist

- [ ] Convex backend deployed and URL noted
- [ ] Web app deployed with correct `NEXT_PUBLIC_CONVEX_URL`
- [ ] Mobile app built with correct `EXPO_PUBLIC_CONVEX_URL`
- [ ] Test authentication flow on both platforms
- [ ] Test real-time match scoring
- [ ] Verify organization/tournament creation works
- [ ] Test on both iOS and Android devices
