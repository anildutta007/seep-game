# ♠ SEEP (सीप) - Traditional North Indian Card Game

> **Also known as:** *Sweep*, *Sip*, *Shiv*, or *Siv*  
> **Origin & Popularity:** Widely played across Northern India (Punjab, Haryana, Delhi, Uttar Pradesh, Rajasthan) and Pakistan.

---

## 🌟 Overview

**Seep (सीप)** is an intense, strategic partnership card game from Northern India. It belongs to the fishing family of card games (related to Casino and Royal Casino), but features unique depth, bidding, and house-building tactics because all 52 cards are distributed and played with complete tactical foresight.

The game is played with a standard **52-card pack** (no jokers). The primary objective is to capture point cards from the layout on the table (the **floor** or **farsh**) and perform **sweeps (seeps)** to build a lead over the opposing team.

A match concludes when one team builds a lead of at least **100 points** over the other team—this victory is known as winning the **Baazi (बाज़ी)**.

---

## 🎯 Scoring: The 17 Scoring Cards (100 Points Total)

Out of the 52 cards in the deck, only **17 cards carry points**. All other 35 cards are worth **0 points**.

| Card / Suit | Point Value | Traditional Name | Notes |
| :--- | :---: | :--- | :--- |
| **All 13 Spades (♠A to ♠K)** | **1 to 13 points** | *Hukum* (हुकुम) | Equal to card capture value: ♠A=1, ♠2=2 ... ♠10=10, ♠J=11, ♠Q=12, ♠K=13. (Sum = **91 pts**) |
| **Ten of Diamonds (♦10)** | **6 points** | *Eent ki Dehla* (ईंट का दहला) | The highest single scoring card outside Spades |
| **Ace of Hearts (♥A)** | **1 point** | *Paan ka Ikka* (पान का इक्का) | Scoring Ace |
| **Ace of Clubs (♣A)** | **1 point** | *Chidi ka Ikka* (चिड़ी का इक्का) | Scoring Ace |
| **Ace of Diamonds (♦A)** | **1 point** | *Eent ka Ikka* (ईंट का इक्का) | Scoring Ace |
| **Total Cards Value** | **100 Points** | | Exactly 100 points per deal |

---

## ⚡ The Seep (Sweep) Bonus

A **Seep (सीप)** occurs when a player's capture completely clears the table layout, leaving **zero loose cards and zero houses on the floor**.

- **Normal Seep:** Awards **+50 bonus points** to the capturing team!
- **First-Play Seep:** If scored on the very first play of the deal, awards **+25 bonus points**.
- **Last Trick of Deal:** Capturing cards on the final play does **not** count as a Seep bonus (the capturing team simply collects whatever cards remain on the table).

---

## 🏠 Houses (Ghar) Mechanics

Players can build piles of cards on the floor called **Houses (Ghar)**:

1. **Permitted House Values:** Houses can **only** be built with values from **9 to 13** (9, 10, Jack=11, Queen=12, King=13).
2. **Kacha Ghar (Uncemented House):**
   - Built by playing a card from hand onto loose card(s) on the floor such that their sum equals the house value $H$.
   - **Crucial Requirement:** The player **must hold at least one other card of value $H$** in their hand to prove they can capture it later!
3. **Pakka Ghar (Cemented House):**
   - Adding a matching card of value $H$ or a combination that equals $H$ cements the house.
   - Once cemented (**Pakka**), the house is **locked**: opponents cannot raise or alter it! It can only be captured with an $H$ card.
4. **Breaking / Raising a House:**
   - An uncemented house owned by opponents can be raised to a higher value (up to 13) by adding a card from hand (and loose cards), provided the player holds the card of the new higher value.

---

## 🃏 Capture Values

For capturing and arithmetic:
- **Ace:** 1
- **2 to 10:** Face value (2 to 10)
- **Jack (J):** 11
- **Queen (Q):** 12
- **King (K):** 13

When you play a card of value $V$:
- You can capture any house with value $V$.
- You can capture any loose cards with value $V$ or any group(s) of loose cards whose sum equals $V$. Multiple disjoint sets summing to $V$ are captured simultaneously!

---

## 👑 The Baazi (Match Victory)

- Matches are played across rounds.
- After each round, scores are tallied (Card Points + Sweeps Bonus).
- The difference between teams is tracked:
  $$\text{Lead} = |\text{Score}_{\text{Team 1}} - \text{Score}_{\text{Team 2}}|$$
- When either team achieves a **lead of $\ge 100$ points**, they win the **Baazi**!

---

## 🎮 Game Features

- **2 Game Modes:**
  - **4-Player Partnership:** Classic North Indian style (You & Gurpreet vs Vikram & Kabir).
  - **2-Player Duel:** Fast-paced head-to-head match against the AI.
- **Intelligent AI Bots:** Bots strategically evaluate point values, protect their houses, target sweeps, and cement valuable piles.
- **Dynamic Move Assistant & Hints:** Highlights legal captures, house builds, and cementing options for each card. Click **💡 Suggest Move** anytime for AI tips.
- **Web Audio Sound Effects:** Real-time synthesized audio for card deals, captures, house locking, and triumphant SEEP fanfares!
- **Complete Rules Handbook:** Built-in interactive guide with full Hindi/Punjabi terminology and examples.
- **Move History Log:** Live drawer tracking every move, capture, and sweep.
- **Match State Persistence:** Automatically saves your Baazi match progression in your browser.

---

## 🚀 How to Run

### Option 1: One-Click Windows Batch Launcher
Double-click:
```
run_seep_game.bat
```
*(Available in `c:\Anil Google Projects\` or inside `c:\Anil Google Projects\seep-game\`)*

### Option 2: Python Local Server
Run in PowerShell / Command Prompt:
```bash
python server.py
```
Or with specific Python path:
```bash
& "C:\Users\dutt_\AppData\Local\Python\bin\python.exe" server.py
```

### Option 3: Direct Browser Launch
Open `index.html` directly in any modern browser (Chrome, Edge, Firefox, Brave, Safari). No build step or installation required!
