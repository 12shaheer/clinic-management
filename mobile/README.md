# Clinic Mobile App

React Native (Expo) mobile app for the Clinic management system. Connects to the same Supabase backend as the web version.

## Setup

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Configure environment:
```bash
cp .env.example .env
```
Edit `.env` with your Supabase credentials (same as the web app):
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Start the development server:
```bash
npm start
```

4. Run on device/simulator:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your physical device

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## Features

- Dashboard with today's stats
- Patient management (list, search, create, view details)
- Appointment scheduling with status workflow
- Billing (invoices & payments)
- Pull-to-refresh on all screens
- Secure token storage (Expo SecureStore)
- Same auth as web (Supabase email/password)
