# Progressive Web App (PWA) Setup

This app is now configured as a Progressive Web App with offline capabilities.

## What's Included

- **manifest.json**: App metadata for install prompts
- **service-worker.js**: Caching strategy for offline functionality
- **PWA meta tags**: Added to index.html for mobile support

## Required Icons

To complete the PWA setup, you need to add two icon files:

1. **icon-192.png** - 192x192 pixel app icon
2. **icon-512.png** - 512x512 pixel app icon

These icons should be placed in the root directory alongside index.html.

### How to Create Icons

You can:
- Use a logo design tool or Photoshop
- Use an online icon generator like [PWA Asset Generator](https://github.com/elegantapp/pwa-asset-generator)
- Create a simple solid color square with the phone emoji 📞

## Testing the PWA

1. Serve the app over HTTPS (required for service workers)
2. Open in Chrome/Edge DevTools > Application tab
3. Check "Manifest" and "Service Workers" sections
4. Test offline functionality by checking "Offline" in Network tab

## Features

- **Offline Support**: Once loaded, the app works without internet (UI only)
- **Installable**: Users can install to home screen on mobile devices
- **App-like Experience**: Runs in standalone mode without browser UI
- **Fast Loading**: Cached resources load instantly
