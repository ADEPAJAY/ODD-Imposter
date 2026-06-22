# 🕵️ Odd One Out – Multiplayer Social Deduction Game

A fast-paced multiplayer party game where **everyone receives the same word... except one player**. The goal? Figure out who the **Odd One Out** is before they blend in and escape suspicion.

Built with **HTML, CSS, JavaScript, and Firebase Realtime Database**, this game allows players to create private lobbies, join instantly with a code, and play in real-time from any device.

---

## 🎮 How It Works

1. Create a lobby and share the code with friends.
2. Players join using the lobby code.
3. Each player receives a secret word.
4. One random player receives a different but related word.
5. Discuss, ask questions, and look for suspicious answers.
6. Vote on who you think is the Odd One Out.
7. Reveal the results and start another round.

---

## ✨ Features

* 🎯 Real-time multiplayer gameplay
* 🔥 Firebase Realtime Database integration
* 👥 Supports 3–10 players
* 🎲 Multiple word categories
* ⏱️ Discussion & voting timers
* 🏆 Automatic result reveal
* 📱 Mobile-friendly responsive design
* 🔐 No signup or login required
* 🎨 Modern dark-themed UI

---

## 📸 Preview

### Home Screen

* Create or join a lobby
* Simple code-based matchmaking

### Lobby

* Live player list
* Host controls
* Category selection

### Gameplay

* Secret word assignment
* Discussion timer
* Voting phase
* Results screen

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (Vanilla JS)
* **Backend:** Firebase Realtime Database
* **Hosting:** GitHub Pages / Firebase Hosting
* **Fonts:** Google Fonts (Space Grotesk & Space Mono)

---

## 📂 Project Structure

```text
odd-one-out/
│
├── index.html           # Game screens & UI
├── style.css            # Styling and animations
├── app.js               # Game logic
├── words.js             # Word database
├── firebase-config.js   # Firebase configuration
└── SETUP.md             # Deployment guide
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/odd-one-out.git
cd odd-one-out
```

### 2. Configure Firebase

Create a Firebase project and update:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Enable Realtime Database

In Firebase Console:

* Create Realtime Database
* Start in Test Mode
* Copy Database URL into `firebase-config.js`

### 4. Run Locally

Use VS Code Live Server or any local web server.

```bash
http://localhost:5500
```

---

## 🎲 Available Categories

* 🍕 Food & Drinks
* 📍 Places
* 🧰 Everyday Objects
* 🐾 Animals
* 🎬 Movies & Shows
* 🎲 Mixed Mode

---

## 🌐 Deployment

### GitHub Pages

1. Push code to GitHub.
2. Open Repository Settings.
3. Navigate to Pages.
4. Select:

   * Branch: `main`
   * Folder: `/root`
5. Save.

Your game will be available at:

```text
https://your-username.github.io/odd-one-out
```

---

## 🤝 Contributing

Contributions, feature requests, and suggestions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Open a pull request

---

## 💡 Future Improvements

* Voice chat integration
* Custom word packs
* Player statistics
* Private rooms with passwords
* Theme customization
* Tournament mode
* AI-generated word pairs

---

## 📄 License

This project is licensed under the MIT License.

---

### ⭐ If you enjoyed this project, consider giving it a star on GitHub!
