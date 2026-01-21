# Environment Variables

This application uses environment variables to work correctly in both local and hosted environments.

## For Hosted Deployment (Vercel, etc.)

### Required Variables

Set these in your hosting platform's environment variables settings:

```bash
# Your production URL (required for hosted deployments)
NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
```

**Note:** Vercel automatically sets `VERCEL_URL`, so if you don't set `NEXT_PUBLIC_BASE_URL`, the app will use Vercel's URL automatically.

### Optional Variables

```bash
# For local development with HTTPS tunnel
TUNNEL_URL=https://your-tunnel-url.loca.lt

# Port for local development (default: 3000)
PORT=3000
```

## How It Works

The app checks for URLs in this priority order:

1. **NEXT_PUBLIC_BASE_URL** or **BASE_URL** - Explicit base URL (highest priority)
2. **VERCEL_URL** - Automatically set by Vercel
3. **TUNNEL_URL** - For local HTTPS tunnels
4. **Local IP** - For local network access
5. **Fallback** - Uses current origin or localhost

## Setting Up on Vercel

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `NEXT_PUBLIC_BASE_URL` = `https://your-app.vercel.app`
4. Redeploy your application

The app will automatically use the correct URL for QR code generation!
