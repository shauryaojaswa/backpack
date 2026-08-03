# Checkpoint Backpacker Hostel

A simple hostel food ordering web app built with Firebase and vanilla HTML/CSS/JS.

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://127.0.0.1:8000/

## Firebase setup

1. Create or select a Firebase project.
2. Enable Authentication with email/password.
3. Enable Firestore Database.
4. Deploy rules:

```bash
firebase deploy --only firestore:rules
```

5. Open the admin page and sign in with an authenticated admin account.
