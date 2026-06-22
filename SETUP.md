# 🕵️ Odd One Out — Setup Guide

## Files in this project
```
oddoneout/
├── index.html        → All game screens
├── style.css         → Full UI styling
├── app.js            → All game logic
├── words.js          → Word pair database (30+ pairs × 5 categories)
├── firebase-config.js → Your Firebase credentials go here
└── SETUP.md          → This file
```

---

## STEP 1 — Open in VS Code

1. Unzip the project folder
2. Open VS Code
3. File → Open Folder → select the `oddoneout` folder
4. You should see all 5 files in the Explorer panel

---

## STEP 2 — Run Locally (Live Server)

**Install the Live Server extension:**
1. Click the Extensions icon (Ctrl+Shift+X)
2. Search: `Live Server` by Ritwick Dey
3. Click Install

**Start the server:**
1. Right-click `index.html` in the Explorer
2. Click **"Open with Live Server"**
3. Browser opens at `http://127.0.0.1:5500`

> ⚠️ You MUST use Live Server (not just open index.html directly)
> because Firebase requires a proper HTTP origin.

---

## STEP 3 — Set Up Firebase (Free)

1. Go to **https://console.firebase.google.com**
2. Click **"Add project"** → give it any name → click through the setup
3. In your project dashboard, click **"</>  Web"** icon to add a web app
4. Register the app (any nickname, don't enable Hosting)
5. Copy the `firebaseConfig` object shown — it looks like:
   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "your-project.firebaseapp.com",
     databaseURL: "https://your-project-default-rtdb.firebaseio.com",
     projectId: "your-project",
     ...
   };
   ```
6. Paste your values into `firebase-config.js` (replacing the placeholders)

**Enable Realtime Database:**
1. In Firebase Console → left sidebar → **Realtime Database**
2. Click **"Create Database"**
3. Choose a region (any is fine)
4. Start in **Test mode** (allows read/write for 30 days — you can extend later)
5. Click **Enable**

> Your `databaseURL` will look like:
> `https://your-project-default-rtdb.firebaseio.com`
> Make sure this matches what's in your `firebase-config.js`!

---

## STEP 4 — Test Locally with Multiple Players

1. Open the game in your browser (via Live Server)
2. Open 2–3 more browser tabs or use another device on the same WiFi
3. One tab: Create Lobby → note the 4-letter code
4. Other tabs: Join Lobby → enter name + code
5. Start the game from the host tab!

---

## STEP 5 — Deploy to GitHub Pages

1. Create a free account at **https://github.com**
2. Create a **New Repository** (e.g. `odd-one-out`)
3. Make it **Public**
4. Upload all 5 files to the repository
5. Go to **Settings → Pages**
6. Under "Source" → select **main branch → / (root)** → Save
7. After ~1 minute your game is live at:
   `https://YOUR-USERNAME.github.io/odd-one-out/`

Share this link with friends — they can join from anywhere!

---

## Firebase Security (After Testing)

Once you're ready to go live, update your Firebase Database Rules:
Go to Realtime Database → Rules tab → paste this:

```json
{
  "rules": {
    "lobbies": {
      "$lobbyCode": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['host', 'phase', 'players'])"
      }
    }
  }
}
```

This keeps it open for players but adds basic structure validation.

---

## How the Game Works

| Phase | What happens |
|-------|-------------|
| Lobby | Host creates a 4-letter code. Friends join by entering it. |
| Word Reveal | Each player taps their screen to see their secret word privately. |
| Discussion | Everyone talks out loud. Try to find who has the odd word! |
| Voting | Each player votes on their device. Most votes = eliminated. |
| Result | See if you caught the right person. Scores update. |
| Next Round | Play again with a new word pair. Eliminated players rejoin. |

**Settings the host can change:**
- Word category (Food, Places, Animals, Objects, Movies, or Custom)
- Number of odd players (1 or 2)
- Discussion timer (None / 1 / 2 / 3 / 5 minutes)
- Voting timer (None / 30s / 60s / 90s)
- What to reveal after elimination (full word / identity only / nothing)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Lobby not found" | Check the 4-letter code is correct |
| Timer not syncing | Make sure everyone is on the same lobby |
| Firebase error in console | Double-check `firebase-config.js` values |
| Game stuck on a screen | Host can force-advance using the host controls |
| Can't open with Live Server | Make sure the extension is installed and enabled |
