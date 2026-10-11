/**
 * ============================================================================
 * SEEP (सीप) - Remote Multiplayer Networking Controller (WebRTC / PeerJS)
 * Allows 4 players (Host + 3 Remote Friends) to play from anywhere on the internet!
 * ============================================================================
 */

(function () {
  'use strict';

  class SeepMultiplayer {
    constructor(game) {
      this.game = game;
      this.peer = null;
      this.isHost = false;
      this.isConnected = false;
      this.roomCode = null;
      this.mySeat = 0; // 0=South (Host), 1=West, 2=North, 3=East
      this.myName = 'Anil (Host)';
      this.gameFormat = this.game.mode || '4p';
      
      // Connections map for host: seat -> peerConnection
      this.clientConnections = {}; 
      // Connection to host (for remote client)
      this.hostConnection = null;

      // Seat status on host:
      // [{ seat: 0, name: 'Anil', isHuman: true, peerId: '...' }, ...]
      this.seats = [
        { seat: 0, role: 'South', name: 'You (Anil)', isHuman: true, isHost: true, peerId: null, ready: true },
        { seat: 1, role: 'West', name: 'Vikram (Bot)', isHuman: false, isHost: false, peerId: null, ready: true },
        { seat: 2, role: 'North (Partner)', name: 'Gurpreet (Bot)', isHuman: false, isHost: false, peerId: null, ready: true },
        { seat: 3, role: 'East', name: 'Kabir (Bot)', isHuman: false, isHost: false, peerId: null, ready: true }
      ];

      this.cacheDom();
      this.bindEvents();
      this.checkUrlForRoomInvite();
    }

    cacheDom() {
      this.dom = {
        btnMultiplayer: document.getElementById('btnMultiplayer'),
        multiplayerModal: document.getElementById('multiplayerModal'),
        btnCloseMultiplayer: document.getElementById('btnCloseMultiplayer'),
        
        tabCreateRoom: document.getElementById('tabCreateRoom'),
        tabJoinRoom: document.getElementById('tabJoinRoom'),
        panelCreateRoom: document.getElementById('panelCreateRoom'),
        panelJoinRoom: document.getElementById('panelJoinRoom'),

        // Create Panel
        hostNameInput: document.getElementById('hostNameInput'),
        mpGameFormat: document.getElementById('mpGameFormat'),
        btnGenRoom: document.getElementById('btnGenRoom'),
        roomCodeDisplay: document.getElementById('roomCodeDisplay'),
        roomShareLink: document.getElementById('roomShareLink'),
        btnCopyInvite: document.getElementById('btnCopyInvite'),
        btnShareWhatsApp: document.getElementById('btnShareWhatsApp'),
        lobbySeatsList: document.getElementById('lobbySeatsList'),
        btnStartMultiplayer: document.getElementById('btnStartMultiplayer'),
        hostStatusText: document.getElementById('hostStatusText'),

        // Join Panel
        joinRoomInput: document.getElementById('joinRoomInput'),
        joinNameInput: document.getElementById('joinNameInput'),
        joinSeatSelect: document.getElementById('joinSeatSelect'),
        btnConnectRoom: document.getElementById('btnConnectRoom'),
        joinStatusText: document.getElementById('joinStatusText'),

        // In-Game Bar
        multiplayerStatusBar: document.getElementById('multiplayerStatusBar'),
        mpRoomBadge: document.getElementById('mpRoomBadge'),
        mpPlayerBadge: document.getElementById('mpPlayerBadge'),
        btnLeaveMp: document.getElementById('btnLeaveMp'),

        // Reactions
        btnReactionsToggle: document.getElementById('btnReactionsToggle'),
        reactionsPopup: document.getElementById('reactionsPopup')
      };
    }

    bindEvents() {
      if (!this.dom.btnMultiplayer) return;

      this.dom.btnMultiplayer.addEventListener('click', () => {
        this.openLobbyModal();
      });

      this.dom.btnCloseMultiplayer?.addEventListener('click', () => {
        this.dom.multiplayerModal.classList.remove('active');
      });

      // Tab switching
      this.dom.tabCreateRoom?.addEventListener('click', () => {
        this.dom.tabCreateRoom.classList.add('active');
        this.dom.tabJoinRoom.classList.remove('active');
        this.dom.panelCreateRoom.style.display = 'block';
        this.dom.panelJoinRoom.style.display = 'none';
      });

      this.dom.tabJoinRoom?.addEventListener('click', () => {
        this.dom.tabJoinRoom.classList.add('active');
        this.dom.tabCreateRoom.classList.remove('active');
        this.dom.panelCreateRoom.style.display = 'none';
        this.dom.panelJoinRoom.style.display = 'block';
      });

      // Create / Host
      this.dom.mpGameFormat?.addEventListener('change', () => {
        this.gameFormat = this.dom.mpGameFormat.value;
        this.configureLobbySeatsForFormat(this.gameFormat);
        if (this.isHost && this.isConnected) {
          this.broadcastLobbyState();
        }
      });

      this.dom.btnGenRoom?.addEventListener('click', () => {
        const name = this.dom.hostNameInput.value.trim() || 'Anil (Host)';
        this.initHostRoom(name);
      });

      this.dom.btnCopyInvite?.addEventListener('click', () => {
        this.copyInviteLink();
      });

      this.dom.btnShareWhatsApp?.addEventListener('click', () => {
        this.shareOnWhatsApp();
      });

      this.dom.btnStartMultiplayer?.addEventListener('click', () => {
        this.startMultiplayerGame();
      });

      // Join
      this.dom.btnConnectRoom?.addEventListener('click', () => {
        const code = this.dom.joinRoomInput.value.trim().toUpperCase();
        const name = this.dom.joinNameInput.value.trim() || 'Friend';
        const seat = parseInt(this.dom.joinSeatSelect.value, 10);
        this.joinRemoteRoom(code, name, seat);
      });

      // Leave
      this.dom.btnLeaveMp?.addEventListener('click', () => {
        if (confirm('Disconnect from multiplayer room?')) {
          this.leaveRoom();
        }
      });

      // Reaction clicks
      document.querySelectorAll('.reaction-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const emoji = btn.dataset.emoji || '👏';
          const text = btn.dataset.text || 'Shabaash!';
          this.sendReaction(emoji, text);
          if (this.dom.reactionsPopup) this.dom.reactionsPopup.classList.remove('show');
        });
      });

      this.dom.btnReactionsToggle?.addEventListener('click', () => {
        this.dom.reactionsPopup?.classList.toggle('show');
      });
    }

    openLobbyModal() {
      this.dom.multiplayerModal.classList.add('active');
      if (this.isHost && this.roomCode) {
        this.renderLobbySeats();
      }
    }

    generateRoomCode() {
      const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
      let code = 'SEEP-';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    }

    getInviteUrl(code) {
      const base = window.location.origin + window.location.pathname;
      return `${base}?room=${encodeURIComponent(code)}`;
    }

    checkUrlForRoomInvite() {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room');
      if (roomParam) {
        setTimeout(() => {
          this.openLobbyModal();
          this.dom.tabJoinRoom?.click();
          if (this.dom.joinRoomInput) this.dom.joinRoomInput.value = roomParam.toUpperCase();
          this.dom.joinStatusText.textContent = `Room ${roomParam} detected from invite link! Enter your name and pick a seat.`;
        }, 500);
      }
    }

    // --- Host Game Room (PeerJS) ---
    initHostRoom(hostName) {
      if (!window.Peer) {
        alert('PeerJS library is still initializing. Please try again in a few seconds.');
        return;
      }

      this.roomCode = this.generateRoomCode();
      this.myName = hostName;
      this.isHost = true;
      this.mySeat = 0; // South
      this.gameFormat = this.dom.mpGameFormat ? this.dom.mpGameFormat.value : (this.game.mode || '4p');
      this.configureLobbySeatsForFormat(this.gameFormat);

      const peerId = `seep_host_${this.roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

      this.dom.hostStatusText.textContent = 'Connecting to WebRTC cloud signaling server...';
      this.dom.roomCodeDisplay.textContent = this.roomCode;
      
      const inviteUrl = this.getInviteUrl(this.roomCode);
      this.dom.roomShareLink.value = inviteUrl;

      try {
        if (this.peer) this.peer.destroy();
        this.peer = new window.Peer(peerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          this.isConnected = true;
          this.seats[0].peerId = id;
          this.dom.hostStatusText.textContent = this.gameFormat === '2p'
            ? '🟢 Room is LIVE! Share invite link with your friend (1-on-1 Duel).'
            : '🟢 Room is LIVE! Share invite link with your friends (Teams).';
          this.renderLobbySeats();
          this.dom.btnStartMultiplayer.disabled = false;
          this.game.showToast(`Room ${this.roomCode} created! Share invite link.`, '🌐');
        });

        this.peer.on('connection', (conn) => {
          this.handleIncomingClientConnection(conn);
        });

        this.peer.on('error', (err) => {
          console.error('Peer error:', err);
          if (err.type === 'unavailable-id') {
            // Retry with alternate code
            this.initHostRoom(hostName);
          } else {
            this.dom.hostStatusText.textContent = `Connection warning: ${err.message}. Retrying...`;
          }
        });

      } catch (e) {
        console.error('Peer creation failed:', e);
        this.dom.hostStatusText.textContent = 'Could not initialize WebRTC peer. Check internet connection.';
      }
    }

    configureLobbySeatsForFormat(format) {
      if (format === '2p') {
        this.seats = [
          { seat: 0, role: 'South', name: `${this.myName || 'You (Anil)'}`, isHuman: true, isHost: true, peerId: this.seats[0]?.peerId || null, ready: true },
          { seat: 1, role: 'North (Opponent)', name: 'Friend (Remote)', isHuman: false, isHost: false, peerId: null, ready: true }
        ];
      } else {
        this.seats = [
          { seat: 0, role: 'South', name: `${this.myName || 'You (Anil)'}`, isHuman: true, isHost: true, peerId: this.seats[0]?.peerId || null, ready: true },
          { seat: 1, role: 'West', name: 'Vikram (Bot)', isHuman: false, isHost: false, peerId: null, ready: true },
          { seat: 2, role: 'North (Partner)', name: 'Gurpreet (Bot)', isHuman: false, isHost: false, peerId: null, ready: true },
          { seat: 3, role: 'East', name: 'Kabir (Bot)', isHuman: false, isHost: false, peerId: null, ready: true }
        ];
      }
      this.renderLobbySeats();
    }

    handleIncomingClientConnection(conn) {
      conn.on('open', () => {
        // Wait for JOIN_REQUEST message from client
      });

      conn.on('data', (data) => {
        this.handleMessageFromClient(data, conn);
      });

      conn.on('close', () => {
        // Player disconnected
        const seat = Object.keys(this.clientConnections).find(s => this.clientConnections[s] === conn);
        if (seat !== undefined) {
          const sIdx = parseInt(seat, 10);
          const pName = this.seats[sIdx]?.name || 'Player';
          delete this.clientConnections[seat];
          if (this.seats[sIdx]) {
            this.seats[sIdx].isHuman = false;
            this.seats[sIdx].name = `${this.getDefaultBotName(sIdx)} (Bot)`;
          }
          this.renderLobbySeats();
          this.broadcastLobbyState();
          this.game.showToast(`${pName} disconnected.`, '⚠️');
        }
      });
    }

    handleMessageFromClient(msg, conn) {
      if (msg.type === 'JOIN_REQUEST') {
        const { name, requestedSeat } = msg;
        // Check if requested seat is available
        let targetSeat = requestedSeat;
        if (this.gameFormat === '2p') {
          targetSeat = 1;
        } else if (targetSeat === 0 || (this.seats[targetSeat]?.isHuman && this.seats[targetSeat]?.peerId)) {
          // Find first available seat among 1, 2, 3
          targetSeat = [2, 1, 3].find(s => !this.seats[s]?.isHuman) || 2;
        }

        if (this.seats[targetSeat]) {
          this.seats[targetSeat].name = name;
          this.seats[targetSeat].isHuman = true;
          this.seats[targetSeat].peerId = conn.peer;
        }
        this.clientConnections[targetSeat] = conn;

        // Send JOIN_ACCEPTED to client
        conn.send({
          type: 'JOIN_ACCEPTED',
          assignedSeat: targetSeat,
          roomCode: this.roomCode,
          seats: this.seats,
          hostName: this.myName,
          gameMode: this.gameFormat
        });

        this.renderLobbySeats();
        this.broadcastLobbyState();
        this.game.sound.playHouseBuild();
        this.game.showToast(`${name} joined as ${this.seats[targetSeat]?.role || 'Player'}!`, '👋');

      } else if (msg.type === 'PLAY_CARD') {
        // Client executed a move on their turn
        if (this.game.currentTurnIndex === msg.seat) {
          const player = this.game.players[msg.seat];
          const card = player.hand.find(c => c.id === msg.cardId);
          if (card) {
            const moveResult = this.game.executeMove(player, card, msg.move);
            this.broadcastGameState();

            const nextCb = () => {
              if (this.game.isOpeningPhase && player.id === this.game.bidderIndex) {
                this.game.completeDealAfterBid();
              } else {
                this.game.nextTurn();
              }
              this.broadcastGameState();
            };

            this.game.displayTurnShowcase(player, card, msg.move, moveResult, nextCb);
          }
        }

      } else if (msg.type === 'SUBMIT_BID') {
        // Client placed opening bid
        if (this.game.currentTurnIndex === msg.seat && this.game.isOpeningPhase) {
          this.game.currentBidValue = msg.bidValue;
          const rankLabel = msg.bidValue === 11 ? 'Jack (11)' : msg.bidValue === 12 ? 'Queen (12)' : msg.bidValue === 13 ? 'King (13)' : msg.bidValue;
          this.game.dom.currentBidText.textContent = `${rankLabel}`;
          this.game.logMessage(`🎯 ${this.seats[msg.seat].name} bid for house of ${msg.bidValue}!`);
          this.broadcastGameState();
        }

      } else if (msg.type === 'SKIP_PAUSE') {
        this.game.skipTurnPause();

      } else if (msg.type === 'REACTION') {
        this.displayReactionPopup(msg.seat, msg.emoji, msg.text);
        // Relay to other clients
        this.broadcast(msg);
      }
    }

    getDefaultBotName(seat) {
      if (seat === 1) return 'Vikram';
      if (seat === 2) return 'Gurpreet';
      return 'Kabir';
    }

    renderLobbySeats() {
      if (!this.dom.lobbySeatsList) return;
      this.dom.lobbySeatsList.innerHTML = '';

      this.seats.forEach(s => {
        const item = document.createElement('div');
        item.className = 'lobby-seat-item';
        let roleLabel;
        if (this.gameFormat === '2p') {
          roleLabel = s.seat === 0 ? 'South (Host • Team 1)' : 'North (Opponent • Team 2)';
        } else {
          roleLabel = s.seat === 0 ? 'South (Host • Team 1)' :
                      s.seat === 2 ? 'North (Partner • Team 1)' :
                      s.seat === 1 ? 'West (Opponent • Team 2)' : 'East (Opponent • Team 2)';
        }

        const statusTag = s.isHuman ? '<span class="seat-badge human">👤 Player</span>' : '<span class="seat-badge bot">🤖 Bot</span>';
        const avatar = (this.gameFormat === '2p')
          ? (s.seat === 0 ? '👑' : '🧔')
          : (s.seat === 0 ? '👑' : s.seat === 2 ? '👳' : s.seat === 1 ? '🧔' : '👨');

        item.innerHTML = `
          <div class="lobby-seat-left">
            <span class="seat-avatar">${avatar}</span>
            <div>
              <strong>${s.name}</strong>
              <div style="font-size: 0.72rem; color: #a7f3d0;">${roleLabel}</div>
            </div>
          </div>
          <div class="lobby-seat-right">
            ${statusTag}
            ${s.seat !== 0 ? `<button class="btn btn-sm btn-seat-toggle" data-seat="${s.seat}">${s.isHuman ? 'Set Bot' : 'Invite'}</button>` : ''}
          </div>
        `;

        const toggleBtn = item.querySelector('.btn-seat-toggle');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', () => {
            if (s.isHuman && s.peerId) {
              // Disconnect human
              if (this.clientConnections[s.seat]) {
                this.clientConnections[s.seat].close();
                delete this.clientConnections[s.seat];
              }
              s.isHuman = false;
              s.name = `${this.getDefaultBotName(s.seat)} (Bot)`;
            } else {
              s.isHuman = false;
              s.name = `${this.getDefaultBotName(s.seat)} (Bot)`;
            }
            this.renderLobbySeats();
            this.broadcastLobbyState();
          });
        }

        this.dom.lobbySeatsList.appendChild(item);
      });
    }

    broadcast(msg) {
      Object.values(this.clientConnections).forEach(conn => {
        if (conn && conn.open) {
          try { conn.send(msg); } catch (e) {}
        }
      });
    }

    broadcastLobbyState() {
      this.broadcast({
        type: 'LOBBY_STATE',
        seats: this.seats,
        gameMode: this.gameFormat
      });
    }

    // Broadcast full table state to each player with strict anti-cheat hand privacy
    broadcastGameState() {
      this.seats.forEach(s => {
        if (s.seat === 0) return; // host is local
        const conn = this.clientConnections[s.seat];
        if (conn && conn.open) {
          const clientHand = this.game.players[s.seat]?.hand || [];
          
          const statePayload = {
            type: 'STATE_UPDATE',
            roomCode: this.roomCode,
            gameMode: this.gameFormat || this.game.mode,
            currentTurnIndex: this.game.currentTurnIndex,
            currentBidValue: this.game.currentBidValue,
            isOpeningPhase: this.game.isOpeningPhase,
            bidderIndex: this.game.bidderIndex,
            floorHouses: this.game.floorHouses,
            floorLooseCards: this.game.floorLooseCards,
            roundStats: {
              team1Sweeps: this.game.roundStats.team1.sweepsCount,
              team2Sweeps: this.game.roundStats.team2.sweepsCount,
              team1Bonus: this.game.roundStats.team1.sweepsBonus,
              team2Bonus: this.game.roundStats.team2.sweepsBonus,
              team1Cards: this.game.roundStats.team1.cardsPoints,
              team2Cards: this.game.roundStats.team2.cardsPoints
            },
            players: this.game.players.map(p => ({
              id: p.id,
              name: p.name,
              role: p.role,
              team: p.team,
              isHuman: p.isHuman,
              securedPoints: p.securedPoints || 0,
              spadesPoints: p.spadesPoints || 0,
              d10Points: p.d10Points || 0,
              acesPoints: p.acesPoints || 0,
              sweepsCount: p.sweepsCount || 0,
              sweepsBonus: p.sweepsBonus || 0,
              capturedCardsCount: p.capturedCards ? p.capturedCards.length : 0
            })),
            matchScores: this.game.matchScores,
            seats: this.seats,
            handCounts: this.game.players.map(p => p.hand.length),
            // PRIVATE HAND: Only send this player's actual cards
            yourHand: clientHand,
            mySeat: s.seat
          };

          conn.send(statePayload);
        }
      });
    }

    startMultiplayerGame() {
      if (!this.isHost) return;

      const format = this.gameFormat || '4p';
      this.game.mode = format;
      this.game.initPlayers();

      // Update game player entities with lobby seat names
      this.game.players.forEach(p => {
        const s = this.seats[p.id];
        if (s) {
          p.name = s.name;
          p.isHuman = (p.id === 0) ? true : s.isHuman;
        }
      });

      this.dom.multiplayerModal.classList.remove('active');
      this.showInGameMultiplayerBar();

      this.game.logMessage(`🚀 Multiplayer Game Started (${format === '2p' ? '2-Player Duel' : '4-Player Team'})! Room: ${this.roomCode}`);
      this.broadcast({ type: 'GAME_STARTED', roomCode: this.roomCode, gameMode: format });

      // Start fresh match
      this.game.startNewRound();
      this.broadcastGameState();
    }

    // --- Remote Client Joining ---
    joinRemoteRoom(code, myName, preferredSeat) {
      if (!window.Peer) {
        alert('WebRTC PeerJS library is loading. Please try again.');
        return;
      }

      this.roomCode = code.toUpperCase();
      this.myName = myName;
      this.isHost = false;

      const hostPeerId = `seep_host_${this.roomCode.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      this.dom.joinStatusText.textContent = `Connecting to Host (${this.roomCode})...`;

      try {
        if (this.peer) this.peer.destroy();
        this.peer = new window.Peer(null, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' }
            ]
          }
        });

        this.peer.on('open', (id) => {
          // Connect to Host
          const conn = this.peer.connect(hostPeerId, { reliable: true });

          conn.on('open', () => {
            this.hostConnection = conn;
            this.isConnected = true;
            this.dom.joinStatusText.textContent = '🟢 Connected to host! Joining seat...';

            conn.send({
              type: 'JOIN_REQUEST',
              name: this.myName,
              requestedSeat: preferredSeat
            });
          });

          conn.on('data', (data) => {
            this.handleMessageFromHost(data);
          });

          conn.on('close', () => {
            this.game.showToast('Disconnected from host room.', '⚠️');
            this.dom.joinStatusText.textContent = 'Connection lost with host.';
          });

          conn.on('error', (err) => {
            console.error('Conn error:', err);
            this.dom.joinStatusText.textContent = `Could not reach host room ${this.roomCode}. Ensure host has created the room.`;
          });
        });

        this.peer.on('error', (err) => {
          this.dom.joinStatusText.textContent = `Peer connection error: ${err.type}`;
        });

      } catch (e) {
        console.error('Client join error:', e);
      }
    }

    handleMessageFromHost(msg) {
      if (msg.type === 'JOIN_ACCEPTED') {
        this.mySeat = msg.assignedSeat;
        this.seats = msg.seats;
        if (msg.gameMode) {
          this.gameFormat = msg.gameMode;
          this.game.mode = msg.gameMode;
          this.game.initPlayers();
        }
        const roleName = (this.game.mode === '2p' && this.mySeat === 1)
          ? 'North (Opponent of Host)'
          : this.mySeat === 2 ? 'North (Partner of Host)' : this.mySeat === 1 ? 'West (Opponent)' : 'East (Opponent)';
        this.dom.joinStatusText.textContent = `✅ Successfully joined room as ${roleName}! Waiting for Host to start...`;
        this.game.showToast(`Joined ${this.roomCode} as ${roleName}!`, '🎉');
        this.showInGameMultiplayerBar();
        this.dom.multiplayerModal.classList.remove('active');

      } else if (msg.type === 'LOBBY_STATE') {
        this.seats = msg.seats;
        if (msg.gameMode) {
          this.gameFormat = msg.gameMode;
        }

      } else if (msg.type === 'GAME_STARTED') {
        if (msg.gameMode && this.game.mode !== msg.gameMode) {
          this.game.mode = msg.gameMode;
          this.game.initPlayers();
        }
        this.game.showToast(`Game has started (${msg.gameMode === '2p' ? '2-Player Duel' : '4-Player Team'})!`, '🚀');
        this.dom.multiplayerModal.classList.remove('active');

      } else if (msg.type === 'STATE_UPDATE') {
        this.applyRemoteGameState(msg);

      } else if (msg.type === 'SHOWCASE_MOVE') {
        this.game.displayTurnShowcase(msg.player, msg.card, msg.move, msg.moveResult, () => {});

      } else if (msg.type === 'SKIP_PAUSE') {
        this.game.skipTurnPause();

      } else if (msg.type === 'REACTION') {
        this.displayReactionPopup(msg.seat, msg.emoji, msg.text);
      }
    }

    // Apply synchronized game state sent from host
    applyRemoteGameState(state) {
      if (state.gameMode && this.game.mode !== state.gameMode) {
        this.game.mode = state.gameMode;
        this.game.initPlayers();
      }

      this.game.currentTurnIndex = state.currentTurnIndex;
      this.game.currentBidValue = state.currentBidValue;
      this.game.isOpeningPhase = state.isOpeningPhase;
      this.game.bidderIndex = state.bidderIndex;
      this.game.floorHouses = state.floorHouses;
      this.game.floorLooseCards = state.floorLooseCards;
      this.game.matchScores = state.matchScores;

      if (state.roundStats && this.game.roundStats) {
        this.game.roundStats.team1.sweepsCount = state.roundStats.team1Sweeps || 0;
        this.game.roundStats.team2.sweepsCount = state.roundStats.team2Sweeps || 0;
        this.game.roundStats.team1.sweepsBonus = state.roundStats.team1Bonus || 0;
        this.game.roundStats.team2.sweepsBonus = state.roundStats.team2Bonus || 0;
        this.game.roundStats.team1.cardsPoints = state.roundStats.team1Cards || 0;
        this.game.roundStats.team2.cardsPoints = state.roundStats.team2Cards || 0;
      }

      // Assign private hand and sync points to player entities
      this.game.players.forEach(p => {
        const remoteP = state.players ? state.players.find(rp => rp.id === p.id) : null;
        if (remoteP) {
          p.securedPoints = remoteP.securedPoints;
          p.spadesPoints = remoteP.spadesPoints;
          p.d10Points = remoteP.d10Points;
          p.acesPoints = remoteP.acesPoints;
          p.sweepsCount = remoteP.sweepsCount;
          p.sweepsBonus = remoteP.sweepsBonus;
        }

        if (p.id === this.mySeat) {
          p.hand = state.yourHand;
          p.isHuman = true;
        } else {
          // Keep hand count for facedown display
          p.hand = new Array(state.handCounts[p.id] || 0).fill(null);
          p.isHuman = state.seats[p.id]?.isHuman;
          p.name = state.seats[p.id]?.name;
        }
      });

      this.game.updateScoreboardUI();
      this.game.renderTable();

      const currPlayer = this.game.players[this.game.currentTurnIndex];
      const isMyTurn = (this.game.currentTurnIndex === this.mySeat);

      this.game.dom.currentTurnBadge.textContent = `Turn: ${currPlayer.name}`;
      this.game.dom.statusText.textContent = isMyTurn
        ? '👉 Your Turn! Select a card to play.'
        : `${currPlayer.name} is playing...`;

      // Check if opening bid phase applies to me
      if (this.game.isOpeningPhase && this.game.bidderIndex === this.mySeat && !this.game.currentBidValue) {
        this.game.showHumanBidModal(this.game.players[this.mySeat]);
      }
    }

    sendClientMove(card, move) {
      if (this.hostConnection && this.hostConnection.open) {
        this.hostConnection.send({
          type: 'PLAY_CARD',
          seat: this.mySeat,
          cardId: card.id,
          move: move
        });
      }
    }

    sendClientBid(bidValue) {
      if (this.hostConnection && this.hostConnection.open) {
        this.hostConnection.send({
          type: 'SUBMIT_BID',
          seat: this.mySeat,
          bidValue: bidValue
        });
      }
    }

    sendReaction(emoji, text) {
      const payload = {
        type: 'REACTION',
        seat: this.mySeat,
        emoji: emoji,
        text: text
      };

      this.displayReactionPopup(this.mySeat, emoji, text);

      if (this.isHost) {
        this.broadcast(payload);
      } else if (this.hostConnection && this.hostConnection.open) {
        this.hostConnection.send(payload);
      }
    }

    displayReactionPopup(seat, emoji, text) {
      const badgeId = seat === 0 ? 'badgeSouth' : seat === 1 ? 'badgeWest' : seat === 2 ? 'badgeNorth' : 'badgeEast';
      const badgeEl = document.getElementById(badgeId);
      if (!badgeEl) return;

      const bubble = document.createElement('div');
      bubble.className = 'reaction-bubble-float';
      bubble.innerHTML = `<span>${emoji}</span> <small>${text}</small>`;
      badgeEl.appendChild(bubble);

      this.game.sound.playTone(700, 'triangle', 0.1, 0.1);

      setTimeout(() => {
        bubble.remove();
      }, 3500);
    }

    showInGameMultiplayerBar() {
      if (!this.dom.multiplayerStatusBar) return;
      this.dom.multiplayerStatusBar.style.display = 'flex';
      this.dom.mpRoomBadge.textContent = `Room: ${this.roomCode}`;
      const role = this.mySeat === 0 ? 'South (Host)' : this.mySeat === 2 ? 'North (Partner)' : this.mySeat === 1 ? 'West' : 'East';
      this.dom.mpPlayerBadge.textContent = `You: ${role}`;
    }

    copyInviteLink() {
      const url = this.dom.roomShareLink.value || this.getInviteUrl(this.roomCode);
      navigator.clipboard.writeText(url).then(() => {
        this.game.showToast('📋 Invite link copied to clipboard! Paste it to your friends on WhatsApp or Chat.', '📋');
      }).catch(() => {
        alert(`Invite Link: ${url}`);
      });
    }

    shareOnWhatsApp() {
      const url = this.dom.roomShareLink.value || this.getInviteUrl(this.roomCode);
      const text = `🃏 Join my Seep (सीप) card game room! Click the link to play:\n${url}\n(Room Code: ${this.roomCode})`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    }

    leaveRoom() {
      if (this.peer) this.peer.destroy();
      this.peer = null;
      this.isConnected = false;
      this.isHost = false;
      this.roomCode = null;
      if (this.dom.multiplayerStatusBar) this.dom.multiplayerStatusBar.style.display = 'none';
      this.game.showToast('Disconnected from multiplayer. Back to local game.', 'ℹ️');
      this.game.startNewRound();
    }
  }

  window.SeepMultiplayer = SeepMultiplayer;

})();
