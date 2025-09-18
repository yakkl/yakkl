# Social Authentication Setup Guide

## Overview
The YAKKL wallet supports social authentication through Google and X (Twitter). This document explains the configuration requirements and current implementation status.

## Current Status
The social authentication UI is present but requires additional configuration to function properly. The error message "Google Login and X login need additional configuration" appears because the OAuth client IDs are not being passed to the authentication components.

## Required Configuration

### 1. Google OAuth Setup

#### Google Cloud Console Setup:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application (for development) or Chrome Extension (for production)
   - For Chrome Extension:
     - Authorized JavaScript origins: `chrome-extension://YOUR_EXTENSION_ID`
     - Authorized redirect URIs: `chrome-extension://YOUR_EXTENSION_ID/auth/callback`
   - For development:
     - Authorized JavaScript origins: `http://localhost:5173`
     - Authorized redirect URIs: `http://localhost:5173/auth/callback`

#### Environment Variables:
```bash
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**Note**: A Google Client ID is already present in .env: `1067648401602-fjh5eo2r0o84eiktmo71eiktfcfk2hoi.apps.googleusercontent.com`

### 2. X (Twitter) OAuth Setup

#### X Developer Portal Setup:
1. Go to [X Developer Portal](https://developer.twitter.com/)
2. Create a new app
3. Configure OAuth 2.0 settings:
   - Enable OAuth 2.0
   - Type of App: Web App, Automated App or Bot
   - Callback URLs:
     - For Chrome Extension: `chrome-extension://YOUR_EXTENSION_ID/auth/x/callback`
     - For development: `http://localhost:5173/auth/x/callback`
   - Website URL: Your website
   - Required scopes: `users.read`, `tweet.read`, `offline.access`

#### Environment Variables:
```bash
VITE_X_CLIENT_ID=your-x-client-id
# or
VITE_TWITTER_CLIENT_ID=your-twitter-client-id
```

**Note**: No X/Twitter Client ID is currently configured in .env

## Implementation Issues

### Current Problems:
1. **LoginFlow Component**: The `@yakkl/security-ui/LoginFlow.svelte` component doesn't pass `clientId` props to the `SocialGoogleAuth` and `SocialXAuth` components
2. **Missing Props**: The social auth components expect `clientId` and optionally `redirectUri` props, but they're not being provided
3. **No X Client ID**: There's no X/Twitter client ID in the environment variables

### Required Fixes:

#### Option 1: Fix in @yakkl/security-ui package (Recommended)
The LoginFlow component needs to be updated to accept and pass through social auth configuration:

```svelte
<!-- In LoginFlow.svelte -->
<SocialGoogleAuth
  onSuccess={(authResult) => handleSocialAuth('google', authResult)}
  onError={onError}
  onCancel={handleBack}
  clientId={config?.googleClientId}
  redirectUri={config?.googleRedirectUri}
/>

<SocialXAuth
  onSuccess={(authResult) => handleSocialAuth('x', authResult)}
  onError={onError}
  onCancel={handleBack}
  clientId={config?.xClientId}
  redirectUri={config?.xRedirectUri}
/>
```

#### Option 2: Create Custom Wrapper (Temporary)
Use a custom component that directly imports and configures the social auth components with the proper client IDs.

## Chrome Extension Considerations

For Chrome extensions, additional setup is required:

1. **Manifest.json Permissions**:
```json
{
  "permissions": [
    "identity",
    "storage"
  ],
  "oauth2": {
    "client_id": "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "openid",
      "profile",
      "email"
    ]
  }
}
```

2. **Chrome Identity API**: The social auth components already check for `chrome.identity.launchWebAuthFlow` and use it when available in extension context

## Testing Social Authentication

Once configured:

1. **Google Auth**:
   - Click "Continue with Google"
   - Authenticate in popup/identity flow
   - Profile data returned with access token

2. **X Auth**:
   - Click "Continue with X"
   - Authenticate with X account
   - OAuth code returned (needs backend exchange for access token)

## Security Notes

1. **Client-Side Only**: The current implementation handles OAuth entirely client-side, which is less secure for X (Twitter) as it uses authorization code flow
2. **Backend Recommended**: For production, implement a backend service to:
   - Exchange authorization codes for access tokens
   - Store refresh tokens securely
   - Validate tokens
   - Manage user sessions

## Next Steps

1. Add X/Twitter Client ID to .env file
2. Update @yakkl/security-ui LoginFlow component to pass client IDs
3. Verify Google Client ID is correctly configured for the extension
4. Test authentication flows
5. Consider implementing backend token exchange for enhanced security