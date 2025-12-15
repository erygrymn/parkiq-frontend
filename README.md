# ParkIQ Mobile App

iOS mobile application for ParkIQ, built with Expo and React Native.

## Production Configuration

This app is configured for production use. All configuration is fetched from the backend at runtime.

### Backend Connection

The app automatically connects to the production backend:
- **Backend URL**: `https://parkiq-backend-msjw9o619-erayguraymans-projects.vercel.app`
- **Config Endpoint**: `/api/config` (public, no auth required)

### How It Works

1. On app startup, the app fetches configuration from the backend `/api/config` endpoint
2. Configuration includes:
   - API base URL
   - Supabase URL and anon key
   - RevenueCat API key
   - App environment
3. Configuration is cached in SecureStore for 24 hours
4. All sensitive data is stored securely and never exposed in the app bundle

### Building for Production

```bash
cd parkiq-frontend
eas build --platform ios --profile production
```

No environment variables or secrets are needed - everything is fetched from the backend at runtime.

### Security

- No environment variables in the app bundle
- All configuration fetched securely from backend
- Sensitive data stored in SecureStore
- No `.env` files required
- No hardcoded secrets
