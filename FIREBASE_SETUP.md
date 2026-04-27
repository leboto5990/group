# Firebase Setup Guide

The code is already connected to Firebase. You just need to enable the services in your Firebase Console.

## Project Details
- **Project Name**: student-dd14b
- **Console URL**: https://console.firebase.google.com/project/student-dd14b

## Step 1: Enable Authentication

1. Go to https://console.firebase.google.com/project/student-dd14b/authentication
2. Click **Get Started**
3. Go to **Sign-in method** tab
4. Click **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

## Step 2: Create Firestore Database

1. Go to https://console.firebase.google.com/project/student-dd14b/firestore
2. Click **Create database**
3. Choose **Start in test mode** (allows read/write for 30 days)
4. Select your region (e.g., eur3 or nam5)
5. Click **Enable**

## Step 3: Set Firestore Security Rules

1. Go to Firestore Database > Rules
2. Replace the rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

3. Click **Publish**

## Step 4: Test the App

1. Serve the files locally:
```bash
python -m http.server 8080
```

2. Open http://localhost:8080
3. Register a student account
4. Login and use the dashboard

## Collections Created Automatically

The app will create these collections in Firestore:
- `users` - stores user emails and roles (student/admin)
- `courses` - stores course data
- `enrollments` - stores student course registrations
- `payments` - stores payment records

## Troubleshooting

**"Permission denied" error**: Make sure Firestore rules allow authenticated access.

**"Auth/user-not-found"**: Make sure Email/Password sign-in method is enabled.

**Charts not showing**: Check browser console for errors. Chart.js loads from CDN.

