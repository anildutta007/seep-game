/**
 * ============================================================================
 * SEEP (सीप) - Traditional North Indian Card Game Engine
 * Features:
 * - 4-Player Partnership (South & North vs West & East) and 2-Player Duel modes
 * - Authentic 100-Point standard scoring (13 Spades, 10 Diamonds, 3 Aces)
 * - 4-Card Opening Bid (Chowka / Boli) with redeal support
 * - Houses (Ghar) 9-13: Building, Cementing (Pakka), and Raising/Breaking (Kacha)
 * - Dynamic Disjoint Capture Combinations
 * - Authentic Sweeps (Seep): 50 pts standard, 25 pts opening move
 * - Last-trick table cleanup rule
 * - Baazi victory detection (100-point lead)
 * - Intelligent AI Bots with strategic play and teamwork
 * - Web Audio API synthesized sound effects
 * ============================================================================
 */

(function () {
  'use strict';

  // --- Constants & Definitions ---
  const SUITS = [
    { name: 'spades', symbol: '♠', color: 'black', hindi: 'हुकुम' },
    { name: 'hearts', symbol: '♥', color: 'red', hindi: 'पान' },
    { name: 'diamonds', symbol: '♦', color: 'red', hindi: 'ईंट' },
    { name: 'clubs', symbol: '♣', color: 'black', hindi: 'चिड़ी' }
  ];

  const RANKS = [
    { rank: 'A', value: 1, label: 'Ace' },
    { rank: '2', value: 2, label: '2' },
    { rank: '3', value: 3, label: '3' },
    { rank: '4', value: 4, label: '4' },
    { rank: '5', value: 5, label: '5' },
    { rank: '6', value: 6, label: '6' },
    { rank: '7', value: 7, label: '7' },
    { rank: '8', value: 8, label: '8' },
    { rank: '9', value: 9, label: '9' },
    { rank: '10', value: 10, label: '10' },
    { rank: 'J', value: 11, label: 'Jack' },
    { rank: 'Q', value: 12, label: 'Queen' },
    { rank: 'K', value: 13, label: 'King' }
  ];

  // Helper to calculate score points for Seep (Total = 100 pts)
  function getCardScorePoints(suit, rank, value) {
    if (suit === 'spades') {
      return value; // 1 to 13 (sum 91)
    }
    if (suit === 'diamonds' && rank === '10') {
      return 6; // 10 of Diamonds = 6 points
    }
    if (rank === 'A' && (suit === 'hearts' || suit === 'diamonds' || suit === 'clubs')) {
      return 1; // 1 point each
    }
    return 0;
  }

  // Generate 52-card standard deck
  function createStandardDeck() {
    const deck = [];
    let idCounter = 1;
    for (const s of SUITS) {
      for (const r of RANKS) {
        deck.push({
          id: `card_${idCounter++}_${s.name}_${r.rank}`,
          suit: s.name,
          suitSymbol: s.symbol,
          suitColor: s.color,
          rank: r.rank,
          captureValue: r.value,
          scorePoints: getCardScorePoints(s.name, r.rank, r.value),
          label: `${r.rank}${s.symbol}`
        });
      }
    }
    return deck;
  }

  // --- Sound Effects Synthesizer (Web Audio API) ---
  class SoundManager {
    constructor() {
      this.enabled = localStorage.getItem('seep_sound_enabled') !== 'false';
      this.ctx = null;
    }

    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          this.ctx = new AudioCtx();
        } catch (e) {
          console.warn('AudioContext init error:', e);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggle() {
      this.enabled = !this.enabled;
      localStorage.setItem('seep_sound_enabled', this.enabled);
      return this.enabled;
    }

    playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    }

    playCardPlay() {
      this.playTone(480, 'triangle', 0.1, 0.15);
    }

    playCardThrowSnap() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(340, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.28, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.08);

        setTimeout(() => {
          this.playTone(180, 'sine', 0.1, 0.15);
        }, 25);
      } catch (e) {}
    }

    playCardCapture() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const now = this.ctx.currentTime;
        [523.25, 659.25, 783.99].forEach((freq, idx) => {
          setTimeout(() => this.playTone(freq, 'sine', 0.15, 0.12), idx * 60);
        });
      } catch (e) {}
    }

    playHouseBuild() {
      this.playTone(330, 'square', 0.14, 0.08);
      setTimeout(() => this.playTone(440, 'sine', 0.18, 0.1), 80);
    }

    playHouseCement() {
      this.playTone(587, 'sine', 0.12, 0.14);
      setTimeout(() => this.playTone(880, 'triangle', 0.25, 0.16), 90);
    }

    playSweepFanfare() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        // Dramatic triumphal fanfare for SEEP!
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            this.playTone(freq, 'triangle', 0.35, 0.22);
          }, idx * 90);
        });
      } catch (e) {}
    }

    playVictory() {
      if (!this.enabled) return;
      this.init();
      if (!this.ctx) return;
      try {
        const chord = [440, 554.37, 659.25, 880];
        chord.forEach((freq) => this.playTone(freq, 'sine', 0.7, 0.15));
      } catch (e) {}
    }
  }

  // --- Seep Game Engine ---
  class SeepGame {
    constructor() {
      this.sound = new SoundManager();
      this.mode = localStorage.getItem('seep_game_mode') || '4p'; // '4p' or '2p'
      this.difficulty = localStorage.getItem('seep_difficulty') || 'medium';
      this.speed = localStorage.getItem('seep_speed') || 'normal';
      this.showHints = localStorage.getItem('seep_show_hints') !== 'false';
      this.turnPauseSetting = localStorage.getItem('seep_turn_pause') || '5'; // 5 seconds default as requested (thrown on floor)
      this.turnPauseMs = this.getPauseDurationMs(this.turnPauseSetting);
      this.isPauseTimerPaused = false;
      this.pauseTimerInterval = null;
      this.pauseTimerRemainingMs = 0;
      this.pendingTurnCallback = null;

      // Players setup
      // Team 1 = South (You) + North (Partner in 4P)
      // Team 2 = West + East (Opponents)
      this.players = [];
      this.initPlayers();

      // Cumulative Match Scores (Baazi tracking)
      this.matchScores = {
        team1: 0,
        team2: 0,
        roundsPlayed: 0
      };

      // Round State
      this.deck = [];
      this.floorLooseCards = [];
      this.floorHouses = []; // array of { id, value, cards, ownerTeam, cemented, createdBy }
      this.currentTurnIndex = 0; // 0=South, 1=West, 2=North, 3=East
      this.dealerIndex = 1; // West deals first, South bids first
      this.bidderIndex = 0; // South
      this.currentBidValue = null;
      this.isOpeningPhase = true;
      this.isRoundOver = false;
      this.isBaaziWon = false;
      this.lastCapturingTeam = null; // team that made last capture
      this.turnNumber = 0; // Total turns played in round

      // Round stats
      this.roundStats = {
        team1: { spades: 0, d10: 0, aces: 0, cardsPoints: 0, sweepsCount: 0, sweepsBonus: 0, capturedCards: [] },
        team2: { spades: 0, d10: 0, aces: 0, cardsPoints: 0, sweepsCount: 0, sweepsBonus: 0, capturedCards: [] }
      };

      this.selectedCardId = null;
      this.historyLogs = [];

      this.houseIdCounter = 1;

      // Bind DOM elements
      this.cacheDom();
      this.bindEvents();
      this.loadSavedMatch();
      this.updateModeButtonUI();

      // Initialize Multiplayer controller
      if (window.SeepMultiplayer) {
        this.multiplayer = new window.SeepMultiplayer(this);
      }

      this.startNewRound();
    }

    getPauseDurationMs(setting) {
      if (setting === 'manual') return Infinity;
      const secs = parseInt(setting, 10);
      if (isNaN(secs)) return 5000;
      return secs * 1000;
    }

    initPlayers() {
      if (this.mode === '4p') {
        this.players = [
          { id: 0, name: 'You (Anil)', role: 'South', team: 1, isHuman: true, hand: [] },
          { id: 1, name: 'Vikram', role: 'West', team: 2, isHuman: false, hand: [] },
          { id: 2, name: 'Gurpreet', role: 'North (Partner)', team: 1, isHuman: false, hand: [] },
          { id: 3, name: 'Kabir', role: 'East', team: 2, isHuman: false, hand: [] }
        ];
      } else {
        // 2-Player Duel: South (You) vs North (Opponent)
        this.players = [
          { id: 0, name: 'You (Anil)', role: 'South', team: 1, isHuman: true, hand: [] },
          { id: 1, name: 'Vikram', role: 'North (Opponent)', team: 2, isHuman: false, hand: [] }
        ];
      }
    }

    switchGameMode(newMode) {
      if (this.mode === newMode) {
        this.hideModal(this.dom.modeModal);
        return;
      }
      this.mode = newMode;
      localStorage.setItem('seep_game_mode', this.mode);
      if (this.dom.settingGameMode) {
        this.dom.settingGameMode.value = this.mode;
      }
      this.updateModeButtonUI();
      this.initPlayers();
      this.hideModal(this.dom.modeModal);
      const toastText = newMode === '2p' ? 'Switched to 2-Player Duel (South vs North)!' : 'Switched to 4-Player Team Mode!';
      this.showToast(toastText, newMode === '2p' ? '⚔️' : '👥');
      this.resetMatch();
    }

    updateModeButtonUI() {
      if (this.dom?.modeIcon && this.dom?.modeLabel) {
        if (this.mode === '2p') {
          this.dom.modeIcon.textContent = '⚔️';
          this.dom.modeLabel.textContent = '2 Players';
        } else {
          this.dom.modeIcon.textContent = '👥';
          this.dom.modeLabel.textContent = '4 Players';
        }
      }
      if (this.dom?.cardMode4P && this.dom?.cardMode2P) {
        this.dom.cardMode4P.classList.toggle('active', this.mode === '4p');
        this.dom.cardMode2P.classList.toggle('active', this.mode === '2p');
      }
      if (this.dom?.labelTeam1) {
        this.dom.labelTeam1.textContent = this.mode === '4p' ? 'Team 1 (You & Partner)' : 'Team 1 (You)';
      }
      if (this.dom?.labelTeam2) {
        this.dom.labelTeam2.textContent = this.mode === '4p' ? 'Team 2 (Opponents)' : `Team 2 (${this.players[1]?.name || 'Opponent'})`;
      }
    }

    cacheDom() {
      this.dom = {
        scoreTeam1: document.getElementById('scoreTeam1'),
        scoreTeam2: document.getElementById('scoreTeam2'),
        baaziLeadBadge: document.getElementById('baaziLeadBadge'),
        btnRules: document.getElementById('btnRules'),
        btnSound: document.getElementById('btnSound'),
        soundIcon: document.getElementById('soundIcon'),
        btnHistory: document.getElementById('btnHistory'),
        btnSettings: document.getElementById('btnSettings'),
        btnNewGame: document.getElementById('btnNewGame'),
        currentTurnBadge: document.getElementById('currentTurnBadge'),
        statusText: document.getElementById('statusText'),
        dealRoundNum: document.getElementById('dealRoundNum'),
        currentBidText: document.getElementById('currentBidText'),
        sweepsCountText: document.getElementById('sweepsCountText'),
        
        // Zones
        zoneNorth: document.getElementById('zoneNorth'),
        zoneWest: document.getElementById('zoneWest'),
        zoneEast: document.getElementById('zoneEast'),
        badgeSouth: document.getElementById('badgeSouth'),
        badgeNorth: document.getElementById('badgeNorth'),
        badgeWest: document.getElementById('badgeWest'),
        badgeEast: document.getElementById('badgeEast'),

        nameNorth: document.getElementById('nameNorth'),
        nameWest: document.getElementById('nameWest'),
        nameEast: document.getElementById('nameEast'),
        roleNorth: document.getElementById('roleNorth'),

        countSouth: document.getElementById('countSouth'),
        countNorth: document.getElementById('countNorth'),
        countWest: document.getElementById('countWest'),
        countEast: document.getElementById('countEast'),

        handNorthFacedown: document.getElementById('handNorthFacedown'),
        handWestFacedown: document.getElementById('handWestFacedown'),
        handEastFacedown: document.getElementById('handEastFacedown'),
        playerHand: document.getElementById('playerHand'),

        // Floor
        floorHousesContainer: document.getElementById('floorHousesContainer'),
        floorLooseContainer: document.getElementById('floorLooseContainer'),
        noHousesMsg: document.getElementById('noHousesMsg'),
        looseCountLabel: document.getElementById('looseCountLabel'),

        // Action Bar
        actionBar: document.getElementById('actionBar'),
        actionPrompt: document.getElementById('actionPrompt'),
        actionButtons: document.getElementById('actionButtons'),
        btnHint: document.getElementById('btnHint'),

        // Toast & History
        toastBanner: document.getElementById('toastBanner'),
        toastIcon: document.getElementById('toastIcon'),
        toastText: document.getElementById('toastText'),
        historyDrawer: document.getElementById('historyDrawer'),
        btnCloseHistory: document.getElementById('btnCloseHistory'),
        historyList: document.getElementById('historyList'),

        // Modals
        bidModal: document.getElementById('bidModal'),
        bidCardsRow: document.getElementById('bidCardsRow'),
        bidOptionsGrid: document.getElementById('bidOptionsGrid'),
        noBidAlert: document.getElementById('noBidAlert'),
        btnRedeal: document.getElementById('btnRedeal'),

        choiceModal: document.getElementById('choiceModal'),
        choiceModalTitle: document.getElementById('choiceModalTitle'),
        choiceModalDescription: document.getElementById('choiceModalDescription'),
        choiceModalOptions: document.getElementById('choiceModalOptions'),
        btnCloseChoice: document.getElementById('btnCloseChoice'),

        rulesModal: document.getElementById('rulesModal'),
        btnCloseRules: document.getElementById('btnCloseRules'),
        btnGotRules: document.getElementById('btnGotRules'),

        summaryModal: document.getElementById('summaryModal'),
        summaryHeadline: document.getElementById('summaryHeadline'),
        btnNextRound: document.getElementById('btnNextRound'),
        r1Spades: document.getElementById('r1Spades'),
        r1D10: document.getElementById('r1D10'),
        r1Aces: document.getElementById('r1Aces'),
        r1Cards: document.getElementById('r1Cards'),
        r1Sweeps: document.getElementById('r1Sweeps'),
        r1Total: document.getElementById('r1Total'),
        r2Spades: document.getElementById('r2Spades'),
        r2D10: document.getElementById('r2D10'),
        r2Aces: document.getElementById('r2Aces'),
        r2Cards: document.getElementById('r2Cards'),
        r2Sweeps: document.getElementById('r2Sweeps'),
        r2Total: document.getElementById('r2Total'),
        cumulativeMatchScores: document.getElementById('cumulativeMatchScores'),
        baaziStatusMessage: document.getElementById('baaziStatusMessage'),

        settingsModal: document.getElementById('settingsModal'),
        btnCloseSettings: document.getElementById('btnCloseSettings'),
        btnSaveSettings: document.getElementById('btnSaveSettings'),
        settingGameMode: document.getElementById('settingGameMode'),
        settingDifficulty: document.getElementById('settingDifficulty'),
        settingSpeed: document.getElementById('settingSpeed'),
        settingHints: document.getElementById('settingHints'),
        settingTurnPause: document.getElementById('settingTurnPause'),

        // Turn Showcase & Observational Pause
        turnShowcaseBar: document.getElementById('turnShowcaseBar'),
        showcaseCardSlot: document.getElementById('showcaseCardSlot'),
        showcaseAvatar: document.getElementById('showcaseAvatar'),
        showcasePlayerName: document.getElementById('showcasePlayerName'),
        showcaseActionBadge: document.getElementById('showcaseActionBadge'),
        showcaseMessage: document.getElementById('showcaseMessage'),
        showcaseTimerBar: document.getElementById('showcaseTimerBar'),
        btnContinueTurn: document.getElementById('btnContinueTurn'),
        showcaseCountdownNum: document.getElementById('showcaseCountdownNum'),
        btnPauseTurnTimer: document.getElementById('btnPauseTurnTimer'),
        pauseTimerIcon: document.getElementById('pauseTimerIcon'),

        // Center Table Thrown Card Spotlight (5-Second View)
        thrownCardSpotlight: document.getElementById('thrownCardSpotlight'),
        thrownCardWrapper: document.getElementById('thrownCardWrapper'),
        thrownAvatar: document.getElementById('thrownAvatar'),
        thrownPlayerName: document.getElementById('thrownPlayerName'),
        thrownActionLabel: document.getElementById('thrownActionLabel'),
        thrownCardAnchor: document.getElementById('thrownCardAnchor'),
        thrownBadgeTag: document.getElementById('thrownBadgeTag'),
        thrownDesc: document.getElementById('thrownDesc'),
        thrownCountdownNum: document.getElementById('thrownCountdownNum'),
        thrownProgressFill: document.getElementById('thrownProgressFill'),
        btnThrownContinue: document.getElementById('btnThrownContinue'),
        btnThrownPause: document.getElementById('btnThrownPause'),
        thrownPauseIcon: document.getElementById('thrownPauseIcon'),

        // Team labels & Mode switch
        labelTeam1: document.getElementById('labelTeam1'),
        labelTeam2: document.getElementById('labelTeam2'),
        btnToggleMode: document.getElementById('btnToggleMode'),
        modeIcon: document.getElementById('modeIcon'),
        modeLabel: document.getElementById('modeLabel'),
        modeModal: document.getElementById('modeModal'),
        btnCloseModeModal: document.getElementById('btnCloseModeModal'),
        cardMode4P: document.getElementById('cardMode4P'),
        cardMode2P: document.getElementById('cardMode2P'),
        btnSelect4P: document.getElementById('btnSelect4P'),
        btnSelect2P: document.getElementById('btnSelect2P'),

        confettiCanvas: document.getElementById('confetti-canvas')
      };
    }

    bindEvents() {
      // Mode switch
      this.dom.btnToggleMode?.addEventListener('click', () => {
        this.updateModeButtonUI();
        this.showModal(this.dom.modeModal);
      });
      this.dom.btnCloseModeModal?.addEventListener('click', () => this.hideModal(this.dom.modeModal));
      this.dom.btnSelect4P?.addEventListener('click', () => this.switchGameMode('4p'));
      this.dom.btnSelect2P?.addEventListener('click', () => this.switchGameMode('2p'));
      this.dom.cardMode4P?.addEventListener('click', () => this.switchGameMode('4p'));
      this.dom.cardMode2P?.addEventListener('click', () => this.switchGameMode('2p'));

      // Top nav
      this.dom.btnRules.addEventListener('click', () => this.showModal(this.dom.rulesModal));
      this.dom.btnCloseRules.addEventListener('click', () => this.hideModal(this.dom.rulesModal));
      this.dom.btnGotRules.addEventListener('click', () => this.hideModal(this.dom.rulesModal));

      this.dom.btnSound.addEventListener('click', () => {
        const on = this.sound.toggle();
        this.dom.soundIcon.textContent = on ? '🔊' : '🔇';
        this.showToast(on ? 'Sound Effects Enabled' : 'Sound Effects Muted', on ? '🔊' : '🔇');
      });

      this.dom.btnHistory.addEventListener('click', () => {
        this.dom.historyDrawer.classList.toggle('open');
      });
      this.dom.btnCloseHistory.addEventListener('click', () => {
        this.dom.historyDrawer.classList.remove('open');
      });

      this.dom.btnSettings.addEventListener('click', () => {
        this.dom.settingGameMode.value = this.mode;
        this.dom.settingDifficulty.value = this.difficulty;
        this.dom.settingSpeed.value = this.speed;
        this.dom.settingHints.checked = this.showHints;
        if (this.dom.settingTurnPause) {
          this.dom.settingTurnPause.value = this.turnPauseSetting;
        }
        this.showModal(this.dom.settingsModal);
      });
      this.dom.btnCloseSettings.addEventListener('click', () => this.hideModal(this.dom.settingsModal));
      this.dom.btnSaveSettings.addEventListener('click', () => this.saveSettings());

      // Turn Showcase & Center Table Thrown Card controls
      this.dom.btnContinueTurn?.addEventListener('click', () => this.skipTurnPause());
      this.dom.btnPauseTurnTimer?.addEventListener('click', () => this.toggleTurnPauseTimer());
      this.dom.btnThrownContinue?.addEventListener('click', () => this.skipTurnPause());
      this.dom.btnThrownPause?.addEventListener('click', () => this.toggleTurnPauseTimer());

      // Spacebar or Enter shortcuts to quickly continue turn pause
      window.addEventListener('keydown', (e) => {
        const isAnyModalOpen = document.querySelector('.modal-overlay.active');
        if (isAnyModalOpen) return;
        if (e.code === 'Space' || e.code === 'Enter') {
          if (this.dom.turnShowcaseBar && this.dom.turnShowcaseBar.style.display !== 'none') {
            e.preventDefault();
            this.skipTurnPause();
          }
        }
      });

      this.dom.btnNewGame.addEventListener('click', () => {
        if (confirm('Are you sure you want to start a brand new match? This resets cumulative Baazi scores.')) {
          this.resetMatch();
        }
      });

      this.dom.btnRedeal.addEventListener('click', () => {
        this.hideModal(this.dom.bidModal);
        this.logMessage('🔄 No bidder card ≥ 9! Cards thrown in. Redealing hand as per rules...');
        this.startNewRound();
      });

      this.dom.btnCloseChoice.addEventListener('click', () => this.hideModal(this.dom.choiceModal));
      this.dom.btnNextRound.addEventListener('click', () => {
        this.hideModal(this.dom.summaryModal);
        if (this.isBaaziWon) {
          this.resetMatch();
        } else {
          this.startNewRound();
        }
      });

      this.dom.btnHint.addEventListener('click', () => this.suggestPlayerMove());

      // Rules tabs switching
      const tabBtns = document.querySelectorAll('.rules-tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          tabBtns.forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.rules-tab-pane').forEach(p => p.classList.remove('active'));
          btn.classList.add('active');
          const target = document.getElementById(btn.dataset.tab);
          if (target) target.classList.add('active');
        });
      });
    }

    saveSettings() {
      const modeChanged = this.mode !== this.dom.settingGameMode.value;
      this.mode = this.dom.settingGameMode.value;
      this.difficulty = this.dom.settingDifficulty.value;
      this.speed = this.dom.settingSpeed.value;
      this.showHints = this.dom.settingHints.checked;
      if (this.dom.settingTurnPause) {
        this.turnPauseSetting = this.dom.settingTurnPause.value;
        this.turnPauseMs = this.getPauseDurationMs(this.turnPauseSetting);
        localStorage.setItem('seep_turn_pause', this.turnPauseSetting);
      }

      localStorage.setItem('seep_game_mode', this.mode);
      localStorage.setItem('seep_difficulty', this.difficulty);
      localStorage.setItem('seep_speed', this.speed);
      localStorage.setItem('seep_show_hints', this.showHints);

      this.hideModal(this.dom.settingsModal);
      this.showToast('Settings saved successfully!', '⚙️');

      if (modeChanged) {
        this.initPlayers();
        this.resetMatch();
      }
    }

    loadSavedMatch() {
      try {
        const saved = localStorage.getItem('seep_match_scores');
        if (saved) {
          this.matchScores = JSON.parse(saved);
        }
      } catch (e) {}
      this.updateScoreboardUI();
    }

    saveMatchScores() {
      try {
        localStorage.setItem('seep_match_scores', JSON.stringify(this.matchScores));
      } catch (e) {}
    }

    resetMatch() {
      this.clearTurnPauseTimer();
      if (this.dom.turnShowcaseBar) this.dom.turnShowcaseBar.style.display = 'none';
      this.matchScores = { team1: 0, team2: 0, roundsPlayed: 0 };
      this.saveMatchScores();
      this.isBaaziWon = false;
      this.startNewRound();
    }

    // --- Round Lifecycle ---
    startNewRound() {
      this.clearTurnPauseTimer();
      if (this.dom.turnShowcaseBar) this.dom.turnShowcaseBar.style.display = 'none';
      this.isRoundOver = false;
      this.turnNumber = 0;
      this.lastCapturingTeam = null;
      this.selectedCardId = null;
      this.floorHouses = [];
      this.floorLooseCards = [];
      this.houseIdCounter = 1;

      this.roundStats = {
        team1: { spades: 0, d10: 0, aces: 0, cardsPoints: 0, sweepsCount: 0, sweepsBonus: 0, capturedCards: [] },
        team2: { spades: 0, d10: 0, aces: 0, cardsPoints: 0, sweepsCount: 0, sweepsBonus: 0, capturedCards: [] }
      };

      // Create & shuffle deck
      this.deck = this.shuffleDeck(createStandardDeck());

      // Dealer & Bidder rotation
      // Standard rule: dealer is from currently losing team. In round 1, West deals, South bids.
      if (this.matchScores.roundsPlayed > 0) {
        if (this.matchScores.team1 < this.matchScores.team2) {
          this.dealerIndex = 0; // South deals
          this.bidderIndex = (this.dealerIndex + 1) % this.players.length;
        } else {
          this.dealerIndex = 1; // Team 2 deals
          this.bidderIndex = (this.dealerIndex + 1) % this.players.length;
        }
      } else {
        this.dealerIndex = this.mode === '4p' ? 1 : 1;
        this.bidderIndex = 0; // South
      }

      this.currentTurnIndex = this.bidderIndex;
      this.isOpeningPhase = true;
      this.currentBidValue = null;

      // Deal opening cards:
      // 4 cards to the bidder, and 4 cards face down onto the floor
      const bidder = this.players[this.bidderIndex];
      bidder.hand = this.deck.splice(0, 4);

      // Other players have empty hands right now until opening bid is played
      this.players.forEach(p => {
        if (p.id !== bidder.id) p.hand = [];
      });

      // 4 cards to floor
      this.floorLooseCards = this.deck.splice(0, 4);

      this.logMessage(`✨ New Deal (Round ${this.matchScores.roundsPlayed + 1}). Dealer: ${this.players[this.dealerIndex].name}. Bidder: ${bidder.name}.`);

      this.updateScoreboardUI();
      this.renderTable();

      // Initiate Opening Bid phase
      this.handleOpeningPhase();
    }

    shuffleDeck(deck) {
      const arr = [...deck];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // --- Opening Phase (Chowka / Boli) ---
    handleOpeningPhase() {
      const bidder = this.players[this.bidderIndex];

      if (bidder.isHuman) {
        // Human bidder: Show Opening Bid modal
        this.showHumanBidModal(bidder);
      } else {
        // AI bidder: select bid automatically
        this.handleAIBid(bidder);
      }
    }

    showHumanBidModal(bidder) {
      this.dom.bidCardsRow.innerHTML = '';
      bidder.hand.forEach(c => {
        this.dom.bidCardsRow.appendChild(this.createCardElement(c, false));
      });

      // Check available bids (cards with captureValue >= 9)
      const validBidValues = [...new Set(bidder.hand.filter(c => c.captureValue >= 9).map(c => c.captureValue))];

      this.dom.bidOptionsGrid.innerHTML = '';

      if (validBidValues.length === 0) {
        this.dom.noBidAlert.style.display = 'block';
        this.showModal(this.dom.bidModal);
        return;
      }

      this.dom.noBidAlert.style.display = 'none';

      // 9, 10, 11 (J), 12 (Q), 13 (K)
      [9, 10, 11, 12, 13].forEach(val => {
        const btn = document.createElement('button');
        btn.className = 'bid-option-btn';
        const rankLabel = val === 11 ? 'J (11)' : val === 12 ? 'Q (12)' : val === 13 ? 'K (13)' : val.toString();
        const hasCard = validBidValues.includes(val);

        btn.innerHTML = `<span>${rankLabel}</span><small>${hasCard ? 'Available' : 'No card'}</small>`;
        btn.disabled = !hasCard;

        if (hasCard) {
          btn.addEventListener('click', () => {
            if (this.multiplayer && !this.multiplayer.isHost && this.multiplayer.isConnected) {
              this.multiplayer.sendClientBid(val);
              this.hideModal(this.dom.bidModal);
              return;
            }

            this.currentBidValue = val;
            this.hideModal(this.dom.bidModal);
            this.logMessage(`🎯 ${bidder.name} placed opening bid for house of ${val}!`);
            this.sound.playHouseBuild();
            this.showToast(`${bidder.name} bid ${val}!`, '🎯');
            this.dom.currentBidText.textContent = `${rankLabel}`;
            this.promptHumanFirstPlay();

            if (this.multiplayer && this.multiplayer.isHost && this.multiplayer.isConnected) {
              this.multiplayer.broadcastGameState();
            }
          });
        }

        this.dom.bidOptionsGrid.appendChild(btn);
      });

      this.showModal(this.dom.bidModal);
    }

    handleAIBid(bidder) {
      const validCards = bidder.hand.filter(c => c.captureValue >= 9);
      if (validCards.length === 0) {
        // AI must redeal!
        this.logMessage(`🔄 ${bidder.name} has no card ≥ 9. Redealing hand...`);
        this.showToast(`${bidder.name} threw in hand (No card ≥ 9). Redealing!`, '🔄');
        setTimeout(() => this.startNewRound(), 1500);
        return;
      }

      // Pick highest frequency or highest value bid
      validCards.sort((a, b) => b.captureValue - a.captureValue);
      const chosenBid = validCards[0].captureValue;
      this.currentBidValue = chosenBid;
      const rankLabel = chosenBid === 11 ? 'Jack (11)' : chosenBid === 12 ? 'Queen (12)' : chosenBid === 13 ? 'King (13)' : chosenBid;

      this.dom.currentBidText.textContent = `${rankLabel}`;
      this.logMessage(`🎯 ${bidder.name} bid for house of ${chosenBid}!`);
      this.showToast(`${bidder.name} bid ${rankLabel}!`, '🎯');

      const delay = this.speed === 'fast' ? 700 : 1300;
      setTimeout(() => {
        this.executeAIFirstPlay(bidder);
      }, delay);
    }

    promptHumanFirstPlay() {
      // Bidder must play one card of bid value or matching house
      this.dom.statusText.textContent = `Bidder's First Play: Play your ${this.currentBidValue} card to capture, build, or throw loose.`;
      this.renderTable();
    }

    executeAIFirstPlay(bidder) {
      // Find legal moves for bidder's bid card
      const bidCard = bidder.hand.find(c => c.captureValue === this.currentBidValue);
      if (!bidCard) return;

      const moves = this.getLegalMovesForCard(bidder, bidCard);
      // Pick best opening move
      let chosenMove = moves.find(m => m.type === 'capture') ||
                        moves.find(m => m.type === 'build') ||
                        moves.find(m => m.type === 'loose');

      const moveResult = this.executeMove(bidder, bidCard, chosenMove);
      this.displayTurnShowcase(bidder, bidCard, chosenMove, moveResult, () => {
        this.completeDealAfterBid();
      });
    }

    completeDealAfterBid() {
      // Distribute remaining 44 cards (or 48 cards minus the 4 already dealt to bidder)
      // Standard Seep: 4 cards on floor, each player gets 12 cards total (bidder already played 1 of their 4, so gets 8 more cards; others get 12 cards)
      if (this.mode === '4p') {
        this.players.forEach(p => {
          if (p.id === this.bidderIndex) {
            // Bidder gets 8 more cards (total 11 in hand now)
            const extra = this.deck.splice(0, 8);
            p.hand.push(...extra);
          } else {
            // Other players get 12 cards each
            const fullHand = this.deck.splice(0, 12);
            p.hand.push(...fullHand);
          }
          // Sort hand by capture value
          p.hand.sort((a, b) => a.captureValue - b.captureValue);
        });
      } else {
        // 2-Player mode: each player gets 12 cards (or 24 cards each in variants)
        this.players.forEach(p => {
          if (p.id === this.bidderIndex) {
            const extra = this.deck.splice(0, 8);
            p.hand.push(...extra);
          } else {
            const fullHand = this.deck.splice(0, 12);
            p.hand.push(...fullHand);
          }
          p.hand.sort((a, b) => a.captureValue - b.captureValue);
        });
      }

      this.isOpeningPhase = false;
      this.logMessage('📦 Remaining cards dealt! Normal play begins.');
      this.renderTable();

      // Next player's turn
      this.nextTurn();
    }

    // --- Turn Progression ---
    nextTurn() {
      // Check if all players' hands are empty
      const allEmpty = this.players.every(p => p.hand.length === 0);
      if (allEmpty) {
        if (this.deck.length > 0) {
          // In 2-Player mode: Deal 2 of 2 (remaining 24 cards)
          this.dealSubsequentHand();
          return;
        }
        this.finishRound();
        return;
      }

      this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
      this.turnNumber++;
      this.selectedCardId = null;

      const currPlayer = this.players[this.currentTurnIndex];
      this.dom.currentTurnBadge.textContent = `Turn: ${currPlayer.name}`;
      this.dom.statusText.textContent = currPlayer.isHuman
        ? 'Your Turn: Select a card from your hand to play.'
        : `${currPlayer.name} is thinking...`;

      this.renderTable();

      if (!currPlayer.isHuman) {
        const delay = this.speed === 'fast' ? 500 : 1100;
        setTimeout(() => {
          this.executeAITurn(currPlayer);
        }, delay);
      }
    }

    dealSubsequentHand() {
      const cardsPerPlayer = Math.floor(this.deck.length / this.players.length);
      this.players.forEach(p => {
        const batch = this.deck.splice(0, cardsPerPlayer);
        p.hand.push(...batch);
        p.hand.sort((a, b) => a.captureValue - b.captureValue);
      });
      this.sound.playHouseBuild();
      this.logMessage(`📦 Deal 2 of 2: ${cardsPerPlayer} fresh cards dealt to each player!`);
      this.showToast(`Deal 2 of 2: ${cardsPerPlayer} cards dealt to each player!`, '📦');
      this.renderTable();
      if (this.multiplayer && this.multiplayer.isHost && this.multiplayer.isConnected) {
        this.multiplayer.broadcastGameState();
      }
      this.nextTurn();
    }

    // --- Move Execution ---
    executeMove(player, card, move) {
      // Remove card from hand
      player.hand = player.hand.filter(c => c.id !== card.id);
      this.sound.playCardPlay();

      let isSweep = false;
      const isFirstMoveOfDeal = (this.turnNumber === 0 && this.isOpeningPhase);
      const isFinalTurnOfDeal = (this.deck.length === 0 && this.players.every(p => p.hand.length === 0));

      const moveResult = {
        type: move.type,
        card: card,
        player: player,
        badgeText: '',
        badgeClass: '',
        descriptionHtml: '',
        isSweep: false,
        pts: 0
      };

      if (move.type === 'capture') {
        // Collect captured cards
        const captured = [card];

        // 1. Remove captured houses
        if (move.houses && move.houses.length > 0) {
          move.houses.forEach(h => {
            captured.push(...h.cards);
            this.floorHouses = this.floorHouses.filter(fh => fh.id !== h.id);
          });
        }

        // 2. Remove captured loose cards
        if (move.looseCards && move.looseCards.length > 0) {
          move.looseCards.forEach(c => {
            captured.push(c);
            this.floorLooseCards = this.floorLooseCards.filter(flc => flc.id !== c.id);
          });
        }

        // Add to team captured cards
        const teamStats = player.team === 1 ? this.roundStats.team1 : this.roundStats.team2;
        teamStats.capturedCards.push(...captured);
        this.lastCapturingTeam = player.team;

        const pts = captured.reduce((sum, c) => sum + c.scorePoints, 0);
        moveResult.pts = pts;

        // Check for SEEP (Sweep)
        if (this.floorHouses.length === 0 && this.floorLooseCards.length === 0) {
          if (!isFinalTurnOfDeal) {
            isSweep = true;
            moveResult.isSweep = true;
            const sweepBonus = isFirstMoveOfDeal ? 25 : 50;
            teamStats.sweepsCount++;
            teamStats.sweepsBonus += sweepBonus;

            this.sound.playSweepFanfare();
            this.triggerConfetti();
            this.showToast(`⚡ SEEP! ${player.name} cleared the floor! (+${sweepBonus} pts)`, '⚡', true);
            this.logMessage(`⚡ SEEP (SWEEP) by ${player.name}! +${sweepBonus} Bonus Points!`, true);

            moveResult.badgeText = `⚡ SEEP (+${sweepBonus})`;
            moveResult.badgeClass = 'badge-seep';
            moveResult.descriptionHtml = `⚡ <strong>SEEP (SWEEP)!</strong> <strong>${player.name}</strong> played <strong>${card.label}</strong> and cleared the entire floor! <strong>+${sweepBonus} Bonus Points!</strong>`;
          } else {
            this.logMessage(`🧹 Final cards captured by ${player.name} (No sweep bonus on final trick).`);
            moveResult.badgeText = `🧹 Final Capture (+${pts} pts)`;
            moveResult.badgeClass = 'badge-capture';
            moveResult.descriptionHtml = `Played <strong>${card.label}</strong> and captured the final table cards (<strong>+${pts} pts</strong>).`;
          }
        } else {
          this.sound.playCardCapture();
          this.logMessage(`🎯 ${player.name} played ${card.label} and captured ${captured.length} cards (+${pts} pts).`);

          const houseNames = (move.houses && move.houses.length > 0) ? `House of ${move.houses.map(h => h.value).join(', ')}` : '';
          const looseNames = (move.looseCards && move.looseCards.length > 0) ? `loose [${move.looseCards.map(c => c.label).join(', ')}]` : '';
          const capturedWhat = [houseNames, looseNames].filter(Boolean).join(' and ');

          moveResult.badgeText = `⚡ Captured (+${pts} pts)`;
          moveResult.badgeClass = 'badge-capture';
          moveResult.descriptionHtml = `Played <strong>${card.label}</strong> and picked up ${capturedWhat} (<strong>+${pts} pts</strong>).`;
        }

      } else if (move.type === 'build') {
        // Build new house
        const houseCards = [card, ...move.floorCards];
        const usedIds = new Set(move.floorCards.map(c => c.id));
        this.floorLooseCards = this.floorLooseCards.filter(c => !usedIds.has(c.id));

        const newHouse = {
          id: `house_${this.houseIdCounter++}`,
          value: move.targetValue,
          cards: houseCards,
          ownerTeam: player.team,
          cemented: false,
          createdBy: player.id
        };

        this.floorHouses.push(newHouse);
        this.sound.playHouseBuild();
        this.logMessage(`🏠 ${player.name} built a House of ${move.targetValue} using ${card.label} and floor cards.`);

        moveResult.badgeText = `🏠 House of ${move.targetValue}`;
        moveResult.badgeClass = 'badge-build';
        moveResult.descriptionHtml = `Played <strong>${card.label}</strong> with loose card(s) [${move.floorCards.map(c => c.label).join(', ')}] to construct a <strong>House of ${move.targetValue}</strong>.`;

      } else if (move.type === 'cement') {
        // Cement existing house
        const targetHouse = this.floorHouses.find(h => h.id === move.houseId);
        if (targetHouse) {
          targetHouse.cards.push(card);
          if (move.extraFloorCards && move.extraFloorCards.length > 0) {
            const usedIds = new Set(move.extraFloorCards.map(c => c.id));
            this.floorLooseCards = this.floorLooseCards.filter(c => !usedIds.has(c.id));
            targetHouse.cards.push(...move.extraFloorCards);
          }
          targetHouse.cemented = true;
          targetHouse.ownerTeam = player.team;
          this.sound.playHouseCement();
          this.logMessage(`🔒 ${player.name} CEMENTED (Pakka) the House of ${targetHouse.value}! It is now locked.`);
          this.showToast(`${player.name} Cemented the House of ${targetHouse.value}!`, '🔒');

          moveResult.badgeText = '🔒 Pakka House';
          moveResult.badgeClass = 'badge-cement';
          moveResult.descriptionHtml = `Played <strong>${card.label}</strong> to <strong>CEMENT (Pakka)</strong> the House of ${targetHouse.value}! It is now locked against raises.`;
        }

      } else if (move.type === 'raise') {
        // Raise / Break uncemented house
        const targetHouse = this.floorHouses.find(h => h.id === move.houseId);
        if (targetHouse) {
          targetHouse.cards.push(card);
          if (move.extraFloorCards && move.extraFloorCards.length > 0) {
            const usedIds = new Set(move.extraFloorCards.map(c => c.id));
            this.floorLooseCards = this.floorLooseCards.filter(c => !usedIds.has(c.id));
            targetHouse.cards.push(...move.extraFloorCards);
          }
          const oldVal = targetHouse.value;
          targetHouse.value = move.newTargetValue;
          targetHouse.ownerTeam = player.team;
          targetHouse.cemented = false;
          this.sound.playHouseBuild();
          this.logMessage(`🔨 ${player.name} BROKE & RAISED the House of ${oldVal} up to ${move.newTargetValue}!`);
          this.showToast(`${player.name} Raised House ${oldVal} ➔ ${move.newTargetValue}!`, '🔨');

          moveResult.badgeText = `🔨 Raised to ${move.newTargetValue}`;
          moveResult.badgeClass = 'badge-raise';
          moveResult.descriptionHtml = `Played <strong>${card.label}</strong> to <strong>BREAK & RAISE</strong> the House of ${oldVal} up to <strong>${move.newTargetValue}</strong>!`;
        }

      } else {
        // Throw loose card to floor
        this.floorLooseCards.push(card);
        this.logMessage(`🃏 ${player.name} played ${card.label} as a loose card.`);

        moveResult.badgeText = '🃏 Discarded';
        moveResult.badgeClass = 'badge-loose';
        moveResult.descriptionHtml = `Played <strong>${card.label}</strong> as a loose card onto the table.`;
      }

      this.updateScoreboardUI();
      return moveResult;
    }

    // --- Center Floor Table Thrown Card Spotlight & 5s Observational Pause ---
    displayTurnShowcase(player, card, move, moveResult, callback) {
      // If pause setting is 0, continue immediately
      if (this.turnPauseSetting === '0') {
        callback();
        return;
      }

      this.clearTurnPauseTimer();
      this.clearTargetHighlights();
      this.pendingTurnCallback = callback;

      // 1. Determine directional throw landing animation based on player position
      let throwClass = 'card-throw-from-south';
      if (this.mode === '4p') {
        if (player.id === 1) throwClass = 'card-throw-from-west';
        else if (player.id === 2) throwClass = 'card-throw-from-north';
        else if (player.id === 3) throwClass = 'card-throw-from-east';
      } else {
        if (player.id === 1) throwClass = 'card-throw-from-north';
      }

      // 2. Play tactile card throw snap onto floor table
      this.sound.playCardThrowSnap();

      // 3. Render card in Center Table Spotlight Anchor
      if (this.dom.thrownCardAnchor) {
        this.dom.thrownCardAnchor.innerHTML = '';
        const cardEl = this.createCardElement(card, false);
        cardEl.classList.add(throwClass);
        this.dom.thrownCardAnchor.appendChild(cardEl);
      }

      // 4. Update Spotlight header & badges
      const avatar = player.id === 0 ? '👑' : player.id === 2 ? '👳' : player.id === 1 ? '🧔' : '👨';
      if (this.dom.thrownAvatar) this.dom.thrownAvatar.textContent = avatar;
      if (this.dom.thrownPlayerName) this.dom.thrownPlayerName.textContent = `${player.name} (${player.role || (player.id === 0 ? 'South' : 'Table')})`;
      if (this.dom.thrownBadgeTag) {
        this.dom.thrownBadgeTag.className = 'thrown-badge-tag ' + (moveResult.badgeClass || 'badge-loose');
        this.dom.thrownBadgeTag.textContent = moveResult.badgeText || 'Action';
      }
      if (this.dom.thrownDesc) {
        this.dom.thrownDesc.innerHTML = moveResult.descriptionHtml || `Played <strong>${card.label}</strong> onto table.`;
      }

      // 5. Highlight target floor cards / houses involved in the move
      this.highlightedElements = [];
      if (move) {
        // Highlight houses captured or cemented/raised
        if (move.houses && Array.isArray(move.houses)) {
          move.houses.forEach(h => {
            const el = document.getElementById(h.id);
            if (el) {
              el.classList.add('highlight-target-action');
              this.highlightedElements.push(el);
            }
          });
        }
        if (move.houseId) {
          const el = document.getElementById(move.houseId);
          if (el) {
            el.classList.add('highlight-target-action');
            this.highlightedElements.push(el);
          }
        }

        // Highlight loose floor cards captured or used to build
        const looseTargets = [
          ...(move.looseCards || []),
          ...(move.floorCards || []),
          ...(move.extraFloorCards || [])
        ];
        looseTargets.forEach(c => {
          if (c && c.id) {
            const el = document.getElementById(c.id);
            if (el) {
              el.classList.add('highlight-target-action');
              this.highlightedElements.push(el);
            }
          }
        });
      }

      // 6. Display Center Table Spotlight
      if (this.dom.thrownCardSpotlight) {
        this.dom.thrownCardSpotlight.style.display = 'flex';
      }
      if (this.dom.turnShowcaseBar) {
        this.dom.turnShowcaseBar.style.display = 'none'; // Replaced by center floor table spotlight
      }

      // 7. Reset pause/resume state
      this.isPauseTimerPaused = false;
      if (this.dom.thrownPauseIcon) this.dom.thrownPauseIcon.textContent = '⏸';
      if (this.dom.pauseTimerIcon) this.dom.pauseTimerIcon.textContent = '⏸';

      // 8. Broadcast to remote clients in multiplayer
      if (this.multiplayer && this.multiplayer.isHost && this.multiplayer.isConnected) {
        try {
          this.multiplayer.broadcast({
            type: 'SHOWCASE_MOVE',
            player: { id: player.id, name: player.name, role: player.role },
            card: card,
            move: move,
            moveResult: moveResult
          });
        } catch(e) {}
      }

      // 9. Manual mode
      if (this.turnPauseSetting === 'manual') {
        if (this.dom.thrownProgressFill) this.dom.thrownProgressFill.style.width = '100%';
        if (this.dom.thrownCountdownNum) this.dom.thrownCountdownNum.textContent = 'Manual';
        return;
      }

      // 10. Countdown Timer (5s default)
      const durationMs = this.turnPauseMs;
      let remainingMs = durationMs;
      this.pauseTimerRemainingMs = remainingMs;

      if (this.dom.thrownProgressFill) this.dom.thrownProgressFill.style.width = '100%';
      if (this.dom.thrownCountdownNum) this.dom.thrownCountdownNum.textContent = `${Math.ceil(remainingMs / 1000)}s`;

      const intervalStep = 100;
      this.pauseTimerInterval = setInterval(() => {
        if (this.isPauseTimerPaused) return;

        remainingMs -= intervalStep;
        this.pauseTimerRemainingMs = remainingMs;

        const percent = Math.max(0, (remainingMs / durationMs) * 100);
        if (this.dom.thrownProgressFill) this.dom.thrownProgressFill.style.width = `${percent}%`;
        if (this.dom.thrownCountdownNum) this.dom.thrownCountdownNum.textContent = `${Math.ceil(remainingMs / 1000)}s`;

        if (remainingMs <= 0) {
          this.skipTurnPause();
        }
      }, intervalStep);
    }

    clearTargetHighlights() {
      if (this.highlightedElements && this.highlightedElements.length > 0) {
        this.highlightedElements.forEach(el => {
          try { el.classList.remove('highlight-target-action'); } catch(e) {}
        });
        this.highlightedElements = [];
      }
      document.querySelectorAll('.highlight-target-action').forEach(el => {
        el.classList.remove('highlight-target-action');
      });
    }

    skipTurnPause() {
      this.clearTurnPauseTimer();
      this.clearTargetHighlights();

      if (this.dom.thrownCardSpotlight) {
        this.dom.thrownCardSpotlight.style.display = 'none';
      }
      if (this.dom.turnShowcaseBar) {
        this.dom.turnShowcaseBar.style.display = 'none';
      }

      // Multiplayer synchronization: if client, notify host; if host, notify clients
      if (this.multiplayer && !this.multiplayer.isHost && this.multiplayer.isConnected && this.multiplayer.hostConnection) {
        try { this.multiplayer.hostConnection.send({ type: 'SKIP_PAUSE' }); } catch(e) {}
      }
      if (this.multiplayer && this.multiplayer.isHost && this.multiplayer.isConnected) {
        try { this.multiplayer.broadcast({ type: 'SKIP_PAUSE' }); } catch(e) {}
      }

      if (this.pendingTurnCallback) {
        const cb = this.pendingTurnCallback;
        this.pendingTurnCallback = null;
        cb();
      }
    }

    toggleTurnPauseTimer() {
      if (this.turnPauseSetting === 'manual') return;
      this.isPauseTimerPaused = !this.isPauseTimerPaused;
      const icon = this.isPauseTimerPaused ? '▶' : '⏸';
      if (this.dom.thrownPauseIcon) this.dom.thrownPauseIcon.textContent = icon;
      if (this.dom.pauseTimerIcon) this.dom.pauseTimerIcon.textContent = icon;

      if (this.isPauseTimerPaused) {
        this.showToast('Card review paused. Take your time!', '⏸');
      } else {
        this.showToast('Card review resumed.', '▶');
      }
    }

    clearTurnPauseTimer() {
      if (this.pauseTimerInterval) {
        clearInterval(this.pauseTimerInterval);
        this.pauseTimerInterval = null;
      }
    }

    // --- AI Turn Logic ---
    executeAITurn(bot) {
      const bestMove = this.getBestAIMove(bot);
      if (!bestMove) {
        this.nextTurn();
        return;
      }

      const moveResult = this.executeMove(bot, bestMove.card, bestMove.move);
      if (this.multiplayer && this.multiplayer.isHost && this.multiplayer.isConnected) {
        this.multiplayer.broadcastGameState();
      }

      const nextCb = () => {
        if (this.isOpeningPhase && bot.id === this.bidderIndex) {
          this.completeDealAfterBid();
        } else {
          this.nextTurn();
        }
        if (this.multiplayer && this.multiplayer.isHost && this.multiplayer.isConnected) {
          this.multiplayer.broadcastGameState();
        }
      };

      this.displayTurnShowcase(bot, bestMove.card, bestMove.move, moveResult, nextCb);
    }

    getBestAIMove(bot) {
      const allMoves = [];

      bot.hand.forEach(card => {
        const legal = this.getLegalMovesForCard(bot, card);
        legal.forEach(m => {
          allMoves.push({ card, move: m });
        });
      });

      if (allMoves.length === 0) return null;

      // Score each move strategically:
      allMoves.forEach(entry => {
        entry.score = this.evaluateMoveScore(bot, entry.card, entry.move);
      });

      // Sort descending
      allMoves.sort((a, b) => b.score - a.score);

      // AI difficulty variations
      if (this.difficulty === 'easy') {
        // Occasionally pick a random legal move
        if (Math.random() < 0.45) {
          const randIdx = Math.floor(Math.random() * allMoves.length);
          return allMoves[randIdx];
        }
      }

      return allMoves[0];
    }

    evaluateMoveScore(bot, card, move) {
      let score = 0;

      // 1. Sweep is the ultimate prize in Seep (50 points!)
      if (move.type === 'capture') {
        const remainingHouses = this.floorHouses.filter(h => !(move.houses || []).some(mh => mh.id === h.id));
        const remainingLoose = this.floorLooseCards.filter(c => !(move.looseCards || []).some(mc => mc.id === c.id));
        if (remainingHouses.length === 0 && remainingLoose.length === 0) {
          score += 500; // Super high priority!
        }

        // Capture value in score points
        const allCaptured = [card, ...(move.looseCards || [])];
        (move.houses || []).forEach(h => allCaptured.push(...h.cards));
        const pts = allCaptured.reduce((sum, c) => sum + c.scorePoints, 0);
        score += pts * 15; // Each scoring point is worth a lot

        // Bonus for capturing opponent's house
        (move.houses || []).forEach(h => {
          if (h.ownerTeam !== bot.team) score += 40;
        });

        score += 30; // capturing is generally good
      }

      // 2. Cementing own team's house locks it against enemies
      if (move.type === 'cement') {
        const target = this.floorHouses.find(h => h.id === move.houseId);
        if (target && target.ownerTeam === bot.team) {
          const housePts = target.cards.reduce((sum, c) => sum + c.scorePoints, 0);
          score += 60 + housePts * 10;
        }
      }

      // 3. Raising / Breaking opponent's house steals it
      if (move.type === 'raise') {
        const target = this.floorHouses.find(h => h.id === move.houseId);
        if (target && target.ownerTeam !== bot.team) {
          score += 50;
        }
      }

      // 4. Building a house
      if (move.type === 'build') {
        // If bot has multiple cards of this house value, building is great
        const countInHand = bot.hand.filter(c => c.captureValue === move.targetValue).length;
        if (countInHand >= 2) {
          score += 35;
        } else {
          score += 15;
        }
      }

      // 5. Loose discard: penalize discarding high point cards!
      if (move.type === 'loose') {
        score -= card.scorePoints * 25; // Heavily avoid discarding 10♦ or Spades!
        // Prefer discarding low non-spades
        if (card.suit !== 'spades') {
          score += (13 - card.captureValue) * 2;
        }
      }

      return score;
    }

    // --- Legal Moves Calculation ---
    getLegalMovesForCard(player, card) {
      const moves = [];
      const val = card.captureValue;

      // 1. CAPTURE MOVES
      // A card of value `val` can capture:
      // a) Any house with value == val
      // b) Any set of loose cards that sum to val (including individual loose cards of value val)
      const matchingHouses = this.floorHouses.filter(h => h.value === val);
      const captureSets = this.findDisjointSubsetsSummingTo(this.floorLooseCards, val);

      if (matchingHouses.length > 0 || captureSets.length > 0) {
        const allLooseInSets = captureSets.flat();
        moves.push({
          type: 'capture',
          houses: matchingHouses,
          looseCards: allLooseInSets,
          description: `Capture with ${card.label}`
        });
      }

      // 2. CEMENTING MOVES (Pakka Ghar)
      // Check if any uncemented house of value `val` exists
      const uncementedHousesOfVal = this.floorHouses.filter(h => !h.cemented && h.value === val);
      uncementedHousesOfVal.forEach(h => {
        moves.push({
          type: 'cement',
          houseId: h.id,
          extraFloorCards: [],
          description: `Cement House of ${val}`
        });
      });

      // 3. BUILDING A HOUSE (Ghar Banana - 9 to 13)
      // Houses can ONLY be 9, 10, 11, 12, 13
      // Condition: player MUST hold another card of target house value in remaining hand!
      const remainingHand = player.hand.filter(c => c.id !== card.id);
      const heldHighValues = new Set(remainingHand.filter(c => c.captureValue >= 9).map(c => c.captureValue));

      if (heldHighValues.size > 0 && this.floorLooseCards.length > 0) {
        heldHighValues.forEach(targetH => {
          const neededLooseSum = targetH - val;
          if (neededLooseSum > 0) {
            // Find loose cards summing to neededLooseSum
            const subsets = this.findSubsetsSummingTo(this.floorLooseCards, neededLooseSum);
            if (subsets.length > 0) {
              moves.push({
                type: 'build',
                targetValue: targetH,
                floorCards: subsets[0],
                description: `Build House of ${targetH} (${val} + ${subsets[0].map(c => c.label).join('+')})`
              });
            }
          }
        });
      }

      // 4. RAISING / BREAKING AN UNCEMENTED HOUSE (Kacha Ghar Torna)
      // Can raise an opponent's uncemented house H to H' in [H+1..13] if holding H' in hand
      if (heldHighValues.size > 0) {
        const uncementedOppHouses = this.floorHouses.filter(h => !h.cemented && h.ownerTeam !== player.team);
        uncementedOppHouses.forEach(h => {
          heldHighValues.forEach(targetH => {
            if (targetH > h.value) {
              const diff = targetH - h.value;
              if (val === diff) {
                // Can raise directly with this card
                moves.push({
                  type: 'raise',
                  houseId: h.id,
                  newTargetValue: targetH,
                  extraFloorCards: [],
                  description: `Raise House ${h.value} to ${targetH}`
                });
              } else if (val < diff) {
                // Can raise with card + loose cards
                const looseDiff = diff - val;
                const subsets = this.findSubsetsSummingTo(this.floorLooseCards, looseDiff);
                if (subsets.length > 0) {
                  moves.push({
                    type: 'raise',
                    houseId: h.id,
                    newTargetValue: targetH,
                    extraFloorCards: subsets[0],
                    description: `Raise House ${h.value} to ${targetH} (with ${subsets[0].map(c => c.label).join('+')})`
                  });
                }
              }
            }
          });
        });
      }

      // 5. THROW LOOSE (Always available)
      moves.push({
        type: 'loose',
        description: `Discard ${card.label} to floor`
      });

      return moves;
    }

    // Mathematical subset sum solver for Seep combinations
    findSubsetsSummingTo(cards, targetSum) {
      const results = [];
      const n = cards.length;

      function backtrack(start, currentSubset, currentSum) {
        if (currentSum === targetSum) {
          results.push([...currentSubset]);
          return;
        }
        if (currentSum > targetSum) return;

        for (let i = start; i < n; i++) {
          currentSubset.push(cards[i]);
          backtrack(i + 1, currentSubset, currentSum + cards[i].captureValue);
          currentSubset.pop();
        }
      }

      backtrack(0, [], 0);
      return results;
    }

    // Find maximal collection of mutually disjoint subsets each summing to targetSum
    findDisjointSubsetsSummingTo(cards, targetSum) {
      if (cards.length === 0) return [];
      const allSubsets = this.findSubsetsSummingTo(cards, targetSum);
      if (allSubsets.length === 0) return [];

      // Sort by size (prefer smaller subsets to capture more groups)
      allSubsets.sort((a, b) => a.length - b.length);

      const disjointSets = [];
      const usedIds = new Set();

      for (const set of allSubsets) {
        const hasOverlap = set.some(c => usedIds.has(c.id));
        if (!hasOverlap) {
          disjointSets.push(set);
          set.forEach(c => usedIds.add(c.id));
        }
      }

      return disjointSets;
    }

    // --- End of Round & Match (Baazi) ---
    finishRound() {
      this.isRoundOver = true;

      // Standard Seep rule: remaining cards on the floor go to the team that made the LAST capture
      if (this.lastCapturingTeam) {
        const teamStats = this.lastCapturingTeam === 1 ? this.roundStats.team1 : this.roundStats.team2;
        const remainingCards = [...this.floorLooseCards];
        this.floorHouses.forEach(h => remainingCards.push(...h.cards));

        if (remainingCards.length > 0) {
          teamStats.capturedCards.push(...remainingCards);
          this.logMessage(`🧹 Remaining ${remainingCards.length} table cards awarded to Team ${this.lastCapturingTeam} (Last capture team).`);
        }
      }

      // Calculate round scores
      [1, 2].forEach(teamNum => {
        const stats = teamNum === 1 ? this.roundStats.team1 : this.roundStats.team2;
        let spadesPts = 0;
        let d10Pts = 0;
        let acesPts = 0;

        stats.capturedCards.forEach(c => {
          if (c.suit === 'spades') spadesPts += c.captureValue;
          if (c.suit === 'diamonds' && c.rank === '10') d10Pts += 6;
          if (c.rank === 'A' && c.suit !== 'spades') acesPts += 1;
        });

        stats.spades = spadesPts;
        stats.d10 = d10Pts;
        stats.aces = acesPts;
        stats.cardsPoints = spadesPts + d10Pts + acesPts;
      });

      const team1RoundTotal = this.roundStats.team1.cardsPoints + this.roundStats.team1.sweepsBonus;
      const team2RoundTotal = this.roundStats.team2.cardsPoints + this.roundStats.team2.sweepsBonus;

      // Update Cumulative Match Scores
      this.matchScores.team1 += team1RoundTotal;
      this.matchScores.team2 += team2RoundTotal;
      this.matchScores.roundsPlayed += 1;
      this.saveMatchScores();

      // Check Baazi Win Condition (Lead of at least 100 points)
      const diff = Math.abs(this.matchScores.team1 - this.matchScores.team2);
      if (diff >= 100) {
        this.isBaaziWon = true;
        const winnerTeam = this.matchScores.team1 > this.matchScores.team2 ? 1 : 2;
        this.triggerConfetti();
        this.sound.playVictory();
        this.logMessage(`🏆 BAAZI WON! Team ${winnerTeam} achieved a ${diff}-point lead! Match complete!`, true);
      }

      this.showRoundSummaryModal(team1RoundTotal, team2RoundTotal, diff);
    }

    showRoundSummaryModal(t1Total, t2Total, diff) {
      const s1 = this.roundStats.team1;
      const s2 = this.roundStats.team2;

      this.dom.r1Spades.textContent = `${s1.spades} pts`;
      this.dom.r1D10.textContent = `${s1.d10} pts`;
      this.dom.r1Aces.textContent = `${s1.aces} pts`;
      this.dom.r1Cards.textContent = `${s1.cardsPoints} pts`;
      this.dom.r1Sweeps.textContent = `${s1.sweepsCount} (${s1.sweepsBonus > 0 ? '+' + s1.sweepsBonus : '0'} pts)`;
      this.dom.r1Total.textContent = `${t1Total} pts`;

      this.dom.r2Spades.textContent = `${s2.spades} pts`;
      this.dom.r2D10.textContent = `${s2.d10} pts`;
      this.dom.r2Aces.textContent = `${s2.aces} pts`;
      this.dom.r2Cards.textContent = `${s2.cardsPoints} pts`;
      this.dom.r2Sweeps.textContent = `${s2.sweepsCount} (${s2.sweepsBonus > 0 ? '+' + s2.sweepsBonus : '0'} pts)`;
      this.dom.r2Total.textContent = `${t2Total} pts`;

      this.dom.cumulativeMatchScores.textContent = `Team 1: ${this.matchScores.team1}  |  Team 2: ${this.matchScores.team2}`;

      const leadTeam = this.matchScores.team1 >= this.matchScores.team2 ? 'Team 1 (You & Partner)' : 'Team 2 (Opponents)';

      if (this.isBaaziWon) {
        this.dom.summaryModalTitle.textContent = '🎉 BAAZI VICTORY! 🎉';
        this.dom.summaryHeadline.textContent = `🏆 ${leadTeam} has WON the Baazi with a lead of ${diff} points!`;
        this.dom.baaziStatusMessage.textContent = `Target reached (100+ lead). Match completed!`;
        this.dom.btnNextRound.textContent = '🔄 Play New Match';
      } else {
        this.dom.summaryModalTitle.textContent = '🏆 Round Completed';
        this.dom.summaryHeadline.textContent = t1Total >= t2Total ? 'Great round! Team 1 won this deal!' : 'Team 2 won this deal.';
        this.dom.baaziStatusMessage.textContent = `${leadTeam} leads by ${diff} points (${100 - diff} more needed for Baazi).`;
        this.dom.btnNextRound.textContent = 'Next Deal ➔';
      }

      this.showModal(this.dom.summaryModal);
    }

    // --- Suggest Move (Hint) ---
    suggestPlayerMove() {
      const player = this.players[0]; // South
      if (this.currentTurnIndex !== 0) {
        this.showToast('Wait for your turn to get a hint!', '⏳');
        return;
      }

      const best = this.getBestAIMove(player);
      if (best) {
        this.selectedCardId = best.card.id;
        this.renderPlayerHand();
        this.renderActionBarForCard(best.card);
        this.showToast(`Hint: Play ${best.card.label} (${best.move.description})`, '💡');
      }
    }

    // --- UI Rendering ---
    renderTable() {
      this.renderPlayerHand();
      this.renderOpponentHands();
      this.renderFloor();
      this.updateBadges();
    }

    renderPlayerHand() {
      const localSeat = (this.multiplayer && !this.multiplayer.isHost && this.multiplayer.isConnected)
        ? (this.multiplayer.mySeat ?? 0)
        : 0;
      const player = this.players[localSeat] || this.players[0];
      this.dom.playerHand.innerHTML = '';
      this.dom.countSouth.textContent = `${player.hand.length} cards`;

      player.hand.forEach(card => {
        if (!card) return;
        const el = this.createCardElement(card, true);
        if (card.id === this.selectedCardId) {
          el.classList.add('selected');
        }

        el.addEventListener('click', () => {
          if (this.currentTurnIndex !== localSeat) return; // not your turn
          this.sound.playTone(600, 'sine', 0.08, 0.08);

          if (this.selectedCardId === card.id) {
            // Deselect
            this.selectedCardId = null;
            this.renderPlayerHand();
            this.resetActionBar();
          } else {
            this.selectedCardId = card.id;
            this.renderPlayerHand();
            this.renderActionBarForCard(card);
          }
        });

        this.dom.playerHand.appendChild(el);
      });
    }

    renderActionBarForCard(card) {
      const localSeat = (this.multiplayer && !this.multiplayer.isHost && this.multiplayer.isConnected)
        ? (this.multiplayer.mySeat ?? 0)
        : 0;
      const player = this.players[localSeat] || this.players[0];
      const moves = this.getLegalMovesForCard(player, card);

      this.dom.actionPrompt.innerHTML = `<span>Card Selected: <strong>${card.label}</strong> (Value: ${card.captureValue})</span>`;
      this.dom.actionButtons.innerHTML = '';

      // Render buttons for each move type
      moves.forEach(m => {
        const btn = document.createElement('button');
        btn.className = 'btn';

        if (m.type === 'capture') {
          btn.classList.add('btn-action-capture');
          const totalCards = (m.houses.length > 0 ? m.houses.map(h => h.cards.length).reduce((a,b)=>a+b, 0) : 0) + m.looseCards.length + 1;
          btn.innerHTML = `<span>⚡ Capture (${totalCards} cards)</span>`;
          btn.title = 'Capture matching house and loose cards';
        } else if (m.type === 'cement') {
          btn.classList.add('btn-action-cement');
          btn.innerHTML = `<span>🔒 Cement House of ${card.captureValue}</span>`;
          btn.title = 'Lock this house permanently';
        } else if (m.type === 'build') {
          btn.classList.add('btn-action-build');
          btn.innerHTML = `<span>🏠 Build House of ${m.targetValue}</span>`;
          btn.title = m.description;
        } else if (m.type === 'raise') {
          btn.classList.add('btn-action-raise');
          btn.innerHTML = `<span>🔨 Raise to ${m.newTargetValue}</span>`;
          btn.title = m.description;
        } else {
          btn.classList.add('btn-action-loose');
          btn.innerHTML = `<span>🃏 Throw Loose</span>`;
          btn.title = 'Discard onto floor';
        }

        btn.addEventListener('click', () => {
          if (this.multiplayer && !this.multiplayer.isHost && this.multiplayer.isConnected) {
            // Client sends move to Host over WebRTC!
            this.multiplayer.sendClientMove(card, m);
            this.resetActionBar();
            return;
          }

          const moveResult = this.executeMove(player, card, m);
          this.resetActionBar();

          if (this.multiplayer && this.multiplayer.isHost && this.multiplayer.isConnected) {
            this.multiplayer.broadcastGameState();
          }

          const nextCb = () => {
            if (this.isOpeningPhase && player.id === this.bidderIndex) {
              this.completeDealAfterBid();
            } else {
              this.nextTurn();
            }
            if (this.multiplayer && this.multiplayer.isHost && this.multiplayer.isConnected) {
              this.multiplayer.broadcastGameState();
            }
          };

          this.displayTurnShowcase(player, card, m, moveResult, nextCb);
        });

        this.dom.actionButtons.appendChild(btn);
      });
    }

    resetActionBar() {
      this.selectedCardId = null;
      this.dom.actionPrompt.innerHTML = `<span>👉 <strong>Your Turn:</strong> Select a card from your hand to play</span>`;
      this.dom.actionButtons.innerHTML = `<button class="btn btn-action-loose" id="btnHint">💡 Suggest Move</button>`;
      document.getElementById('btnHint')?.addEventListener('click', () => this.suggestPlayerMove());
    }

    renderOpponentHands() {
      if (this.mode === '4p') {
        this.dom.zoneWest.style.display = 'flex';
        this.dom.zoneEast.style.display = 'flex';
        this.dom.nameNorth.textContent = 'Gurpreet (Partner)';
        this.dom.roleNorth.textContent = 'Team 1 • North';

        // North
        const north = this.players[2];
        this.dom.countNorth.textContent = `${north.hand.length} cards`;
        this.renderFacedownHand(this.dom.handNorthFacedown, north.hand.length);

        // West
        const west = this.players[1];
        this.dom.countWest.textContent = `${west.hand.length} cards`;
        this.renderFacedownHand(this.dom.handWestFacedown, west.hand.length);

        // East
        const east = this.players[3];
        this.dom.countEast.textContent = `${east.hand.length} cards`;
        this.renderFacedownHand(this.dom.handEastFacedown, east.hand.length);
      } else {
        // 2-Player mode
        this.dom.zoneWest.style.display = 'none';
        this.dom.zoneEast.style.display = 'none';
        this.dom.nameNorth.textContent = 'Vikram (Opponent)';
        this.dom.roleNorth.textContent = 'Team 2 • North';

        const north = this.players[1];
        this.dom.countNorth.textContent = `${north.hand.length} cards`;
        this.renderFacedownHand(this.dom.handNorthFacedown, north.hand.length);
      }
    }

    renderFacedownHand(container, count) {
      container.innerHTML = '';
      const displayCount = Math.min(count, 12);
      for (let i = 0; i < displayCount; i++) {
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        container.appendChild(cardBack);
      }
    }

    renderFloor() {
      // 1. Houses
      this.dom.floorHousesContainer.innerHTML = '';
      if (this.floorHouses.length === 0) {
        this.dom.noHousesMsg.style.display = 'block';
        this.dom.floorHousesContainer.appendChild(this.dom.noHousesMsg);
      } else {
        this.dom.noHousesMsg.style.display = 'none';
        this.floorHouses.forEach(house => {
          const houseEl = this.createHouseElement(house);
          this.dom.floorHousesContainer.appendChild(houseEl);
        });
      }

      // 2. Loose Cards
      this.dom.floorLooseContainer.innerHTML = '';
      this.dom.looseCountLabel.textContent = `${this.floorLooseCards.length} cards`;

      if (this.floorLooseCards.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = 'font-size: 0.8rem; color: #6ee7b7; font-style: italic;';
        emptyMsg.textContent = 'Floor is clear! A capture right now can score a SEEP!';
        this.dom.floorLooseContainer.appendChild(emptyMsg);
      } else {
        this.floorLooseCards.forEach(card => {
          const el = this.createCardElement(card, false);
          this.dom.floorLooseContainer.appendChild(el);
        });
      }
    }

    createCardElement(card, isPlayerHand = false) {
      const el = document.createElement('div');
      el.className = `card suit-${card.suit}`;
      el.id = card.id;

      if (card.scorePoints > 0) {
        el.classList.add('point-card');
        el.setAttribute('data-points', `+${card.scorePoints}`);
      }

      el.innerHTML = `
        <div class="card-top">
          <span class="card-rank">${card.rank}</span>
          <span class="card-suit-mini">${card.suitSymbol}</span>
        </div>
        <div class="card-center">${card.suitSymbol}</div>
        <div class="card-bottom">
          <span class="card-rank">${card.rank}</span>
          <span class="card-suit-mini">${card.suitSymbol}</span>
        </div>
      `;

      return el;
    }

    createHouseElement(house) {
      const el = document.createElement('div');
      el.className = `house-card ${house.cemented ? 'pakka' : 'kacha'}`;
      el.id = house.id;

      const rankLabel = house.value === 11 ? 'Jack (11)' : house.value === 12 ? 'Queen (12)' : house.value === 13 ? 'King (13)' : house.value.toString();
      const statusText = house.cemented ? '🔒 Pakka' : '🔓 Kacha';
      const ownerText = house.ownerTeam === 1 ? 'Team 1 (You)' : 'Team 2';

      let previewsHtml = '';
      house.cards.forEach(c => {
        const colorClass = c.suitColor === 'red' ? 'red' : 'black';
        previewsHtml += `<div class="mini-card ${colorClass}">${c.rank}${c.suitSymbol}</div>`;
      });

      el.innerHTML = `
        <div class="house-header">
          <span class="house-value-badge">${rankLabel}</span>
          <span class="house-status-badge">${statusText}</span>
        </div>
        <div class="house-owner-tag">${ownerText} • ${house.cards.length} cards</div>
        <div class="house-cards-preview">${previewsHtml}</div>
      `;

      el.addEventListener('click', () => {
        const cardNames = house.cards.map(c => `${c.label} (${c.scorePoints > 0 ? '+' + c.scorePoints + 'pts' : '0pts'})`).join(', ');
        this.showToast(`House of ${house.value} (${statusText}): Contains [${cardNames}]`, '🏠');
      });

      return el;
    }

    updateBadges() {
      // Active turn highlight
      [this.dom.badgeSouth, this.dom.badgeNorth, this.dom.badgeWest, this.dom.badgeEast].forEach(b => {
        b?.classList.remove('active-turn');
      });

      if (this.currentTurnIndex === 0) this.dom.badgeSouth.classList.add('active-turn');
      else if (this.currentTurnIndex === 1) {
        if (this.mode === '4p') this.dom.badgeWest.classList.add('active-turn');
        else this.dom.badgeNorth.classList.add('active-turn');
      }
      else if (this.currentTurnIndex === 2) this.dom.badgeNorth.classList.add('active-turn');
      else if (this.currentTurnIndex === 3) this.dom.badgeEast.classList.add('active-turn');
    }

    updateScoreboardUI() {
      this.dom.scoreTeam1.textContent = this.matchScores.team1;
      this.dom.scoreTeam2.textContent = this.matchScores.team2;

      if (this.dom.labelTeam1) {
        this.dom.labelTeam1.textContent = this.mode === '4p' ? 'Team 1 (You & Partner)' : 'Team 1 (You)';
      }
      if (this.dom.labelTeam2) {
        this.dom.labelTeam2.textContent = this.mode === '4p' ? 'Team 2 (Opponents)' : `Team 2 (${this.players[1]?.name || 'Opponent'})`;
      }

      const diff = this.matchScores.team1 - this.matchScores.team2;
      if (diff >= 0) {
        this.dom.baaziLeadBadge.textContent = `Lead: +${diff} (Team 1)`;
      } else {
        this.dom.baaziLeadBadge.textContent = `Lead: +${Math.abs(diff)} (Team 2)`;
      }

      this.dom.dealRoundNum.textContent = `Round ${this.matchScores.roundsPlayed + 1}`;
      this.dom.sweepsCountText.textContent = `${this.roundStats.team1.sweepsCount} - ${this.roundStats.team2.sweepsCount}`;
    }

    // --- Toast & Logging ---
    showToast(msg, icon = '✨', isSeep = false) {
      this.dom.toastText.textContent = msg;
      this.dom.toastIcon.textContent = icon;
      if (isSeep) {
        this.dom.toastBanner.classList.add('toast-seep');
      } else {
        this.dom.toastBanner.classList.remove('toast-seep');
      }

      this.dom.toastBanner.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => {
        this.dom.toastBanner.classList.remove('show');
      }, isSeep ? 3200 : 2200);
    }

    logMessage(msg, isSeep = false) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const item = document.createElement('div');
      item.className = `history-item ${isSeep ? 'seep-event' : ''}`;
      item.innerHTML = `<div class="history-time">${time}</div><div>${msg}</div>`;
      this.dom.historyList.insertBefore(item, this.dom.historyList.firstChild);
    }

    showModal(modal) {
      modal.classList.add('active');
    }

    hideModal(modal) {
      modal.classList.remove('active');
    }

    // --- Confetti Celebration ---
    triggerConfetti() {
      const canvas = this.dom.confettiCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const particles = [];
      const colors = ['#f59e0b', '#fbbf24', '#ef4444', '#10b981', '#3b82f6', '#ec4899'];

      for (let i = 0; i < 90; i++) {
        particles.push({
          x: canvas.width / 2,
          y: canvas.height / 2,
          r: Math.random() * 6 + 3,
          color: colors[Math.floor(Math.random() * colors.length)],
          vx: (Math.random() - 0.5) * 16,
          vy: (Math.random() - 0.5) * 16 - 3,
          alpha: 1
        });
      }

      let animId;
      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.35; // gravity
          p.alpha -= 0.015;
          if (p.alpha > 0) {
            alive = true;
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        if (alive) {
          animId = requestAnimationFrame(animate);
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          cancelAnimationFrame(animId);
        }
      };

      animate();
    }
  }

  // Initialize Game on DOM Content Loaded
  window.addEventListener('DOMContentLoaded', () => {
    window.seepGame = new SeepGame();
  });

})();
