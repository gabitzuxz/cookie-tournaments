
// Data Synchronization System
class DataSync {
    static instance = null;
    
    constructor() {
        if (DataSync.instance) {
            return DataSync.instance;
        }
        
        this.storageKeys = {
            users: 'tournamentUsers',
            tournaments: 'tournaments',
            currentUser: 'currentUser',
            lastUpdate: 'lastDataUpdate'
        };
        
        this.listeners = [];
        this.setupStorageListener();
        DataSync.instance = this;
    }
    
    static getInstance() {
        if (!DataSync.instance) {
            DataSync.instance = new DataSync();
        }
        return DataSync.instance;
    }
    
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (Object.values(this.storageKeys).includes(e.key)) {
                this.notifyListeners('dataChanged', e.key, e.newValue);
            }
        });
        
        // Custom event for same-window updates
        window.addEventListener('dataSync', (e) => {
            this.notifyListeners('dataChanged', e.detail.key, e.detail.value);
        });
    }
    
    save(key, data) {
        const timestamp = Date.now();
        localStorage.setItem(key, JSON.stringify(data));
        localStorage.setItem(this.storageKeys.lastUpdate, timestamp.toString());
        
        // Trigger custom event for same-window sync
        window.dispatchEvent(new CustomEvent('dataSync', {
            detail: { key, value: JSON.stringify(data), timestamp }
        }));
    }
    
    load(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    }
    
    subscribe(callback) {
        this.listeners.push(callback);
    }
    
    unsubscribe(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }
    
    notifyListeners(event, key, value) {
        this.listeners.forEach(callback => {
            callback(event, key, value);
        });
    }
    
    clear() {
        Object.values(this.storageKeys).forEach(key => {
            localStorage.removeItem(key);
        });
    }
    
    export() {
        const data = {};
        Object.entries(this.storageKeys).forEach(([name, key]) => {
            if (key !== 'lastUpdate') {
                data[name] = this.load(key);
            }
        });
        data.exportTimestamp = new Date().toISOString();
        return data;
    }
    
    import(data) {
        if (data.users) this.save(this.storageKeys.users, data.users);
        if (data.tournaments) this.save(this.storageKeys.tournaments, data.tournaments);
        if (data.currentUser) this.save(this.storageKeys.currentUser, data.currentUser);
    }
}

// Tournament Management System
class TournamentManager {
    constructor() {
        this.currentUser = null;
        this.dataSync = DataSync.getInstance();
        this.init();
    }

    init() {
        this.loadData();
        this.setupDataSync();
        this.setupEventListeners();
        this.updateNavigation();
        this.showPage('home');
    }

    setupDataSync() {
        this.dataSync.subscribe((event, key, value) => {
            if (event === 'dataChanged') {
                this.handleDataSync(key, value);
            }
        });
        
        // Subscribe to users and tournaments changes
        if (window.usersManager) {
            window.usersManager.subscribe((event, data) => {
                if (event === 'usersChanged') {
                    this.refreshCurrentPage();
                }
            });
        }
        
        if (window.tournamentsManager) {
            window.tournamentsManager.subscribe((event, data) => {
                if (event === 'tournamentsChanged') {
                    this.refreshCurrentPage();
                }
            });
        }
    }
    
    handleDataSync(key, value) {
        const data = value ? JSON.parse(value) : null;
        
        switch(key) {
            case this.dataSync.storageKeys.currentUser:
                this.currentUser = data;
                this.updateNavigation();
                this.refreshCurrentPage();
                break;
        }
    }
    
    refreshCurrentPage() {
        const activePage = document.querySelector('.page.active');
        if (!activePage) return;
        
        const pageId = activePage.id.replace('Page', '');
        
        // Only refresh if page content is visible
        switch(pageId) {
            case 'tournaments':
                if (document.getElementById('tournamentsList')) {
                    this.loadTournaments();
                }
                break;
            case 'leaderboard':
                if (document.getElementById('leaderboardList')) {
                    this.loadLeaderboard();
                }
                break;
            case 'profile':
                if (document.getElementById('profileContent')) {
                    this.loadProfile();
                }
                break;
            case 'admin':
                if (document.getElementById('adminTournamentsList')) {
                    this.loadAdminPanel();
                }
                break;
        }
    }

    // Data Management
    loadData() {
        this.currentUser = this.dataSync.load(this.dataSync.storageKeys.currentUser);
    }

    saveData() {
        if (this.currentUser) {
            this.dataSync.save(this.dataSync.storageKeys.currentUser, this.currentUser);
        } else {
            localStorage.removeItem(this.dataSync.storageKeys.currentUser);
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Register form
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Add tournament form
        document.getElementById('addTournamentForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddTournament();
        });
    }

    // Authentication
    handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        const user = window.usersManager.authenticateUser(username, password);
        
        if (user) {
            this.currentUser = user;
            this.saveData();
            this.updateNavigation();
            this.showPage('home');
            this.showMessage('Login successful!', 'success');
        } else {
            this.showMessage('Invalid username or password!', 'error');
        }
    }

    handleRegister() {
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            this.showMessage('Passwords do not match!', 'error');
            return;
        }

        try {
            const newUser = window.usersManager.createUser(username, password);
            this.currentUser = newUser;
            this.saveData();
            this.updateNavigation();
            this.showPage('home');
            this.showMessage('Registration successful!', 'success');
        } catch (error) {
            this.showMessage(error.message, 'error');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.updateNavigation();
        this.showPage('home');
        this.showMessage('Logged out successfully!', 'success');
    }

    // Navigation
    updateNavigation() {
        const loginLink = document.getElementById('loginLink');
        const logoutLink = document.getElementById('logoutLink');
        const profileLink = document.getElementById('profileLink');
        const adminLink = document.getElementById('adminLink');

        if (this.currentUser) {
            loginLink.classList.add('hidden');
            logoutLink.classList.remove('hidden');
            profileLink.classList.remove('hidden');
            
            if (this.currentUser.isAdmin) {
                adminLink.classList.remove('hidden');
            } else {
                adminLink.classList.add('hidden');
            }
        } else {
            loginLink.classList.remove('hidden');
            logoutLink.classList.add('hidden');
            profileLink.classList.add('hidden');
            adminLink.classList.add('hidden');
        }
    }

    showPage(pageId) {
        // Hide all pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });

        // Remove active class from nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected page
        const targetPage = document.getElementById(pageId + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update nav link
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.textContent.toLowerCase().includes(pageId) || 
                (pageId === 'home' && link.textContent.toLowerCase().includes('home'))) {
                link.classList.add('active');
            }
        });

        // Load page content
        switch(pageId) {
            case 'tournaments':
                this.loadTournaments();
                break;
            case 'leaderboard':
                this.loadLeaderboard();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'admin':
                if (this.currentUser && this.currentUser.isAdmin) {
                    this.loadAdminPanel();
                } else {
                    this.showPage('home');
                    this.showMessage('Access denied!', 'error');
                }
                break;
        }
    }

    // Tournament Management
    loadTournaments() {
        const tournamentsList = document.getElementById('tournamentsList');
        if (!tournamentsList) return;
        
        tournamentsList.innerHTML = '';

        const tournaments = window.tournamentsManager.getAllTournaments();
        tournaments.forEach(tournament => {
            const card = this.createTournamentCard(tournament);
            tournamentsList.appendChild(card);
        });
    }

    createTournamentCard(tournament) {
        const card = document.createElement('div');
        card.className = 'tournament-card';
        
        const playerNames = tournament.players.map(playerId => {
            const user = window.usersManager.findUserById(playerId);
            return user ? user.username : 'Unknown';
        });

        const canJoin = this.currentUser && 
                       !tournament.players.includes(this.currentUser.id) && 
                       tournament.players.length < tournament.maxPlayers &&
                       tournament.status === 'upcoming';

        const hasJoined = this.currentUser && tournament.players.includes(this.currentUser.id);

        card.innerHTML = `
            <div class="tournament-status status-${tournament.status}">${tournament.status}</div>
            <h3>${tournament.name}</h3>
            <p><strong>Date:</strong> ${new Date(tournament.date).toLocaleDateString()}</p>
            <p><strong>Players:</strong> ${tournament.players.length}/${tournament.maxPlayers}</p>
            <p><strong>Participants:</strong> ${playerNames.join(', ') || 'None yet'}</p>
            <div class="tournament-actions">
                ${canJoin ? `<button class="btn btn-primary" onclick="tournamentManager.joinTournament(${tournament.id})">Join Tournament</button>` : ''}
                ${hasJoined ? `<span class="btn btn-secondary" style="background: rgba(76, 175, 80, 0.3); border-color: #4caf50;">Joined ✓</span>` : ''}
                <button class="btn btn-secondary" onclick="tournamentManager.viewBracket(${tournament.id})">View Bracket</button>
            </div>
        `;

        return card;
    }

    joinTournament(tournamentId) {
        if (!this.currentUser) {
            this.showMessage('Please login to join tournaments!', 'error');
            this.showPage('login');
            return;
        }

        const success = window.tournamentsManager.addPlayerToTournament(tournamentId, this.currentUser.id);
        if (!success) {
            this.showMessage('Cannot join tournament!', 'error');
            return;
        }

        // Update current user
        const userUpdated = window.usersManager.addTournamentToUser(this.currentUser.id, tournamentId);
        if (userUpdated) {
            this.currentUser.joinedTournaments.push(tournamentId);
            this.saveData();
            this.showMessage('Successfully joined tournament!', 'success');
        }
        
        // Auto-refresh will happen via data sync
    }

    filterTournaments(status) {
        // Update filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Filter tournaments
        const tournamentCards = document.querySelectorAll('.tournament-card');
        tournamentCards.forEach(card => {
            const statusElement = card.querySelector('.tournament-status');
            if (status === 'all' || statusElement.textContent === status) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    // Leaderboard
    loadLeaderboard() {
        const leaderboardList = document.getElementById('leaderboardList');
        if (!leaderboardList) return;
        
        const sortedUsers = window.usersManager.getLeaderboard();

        leaderboardList.innerHTML = '';

        sortedUsers.forEach((user, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            const rank = index + 1;
            let rankEmoji = '';
            if (rank === 1) rankEmoji = '🥇';
            else if (rank === 2) rankEmoji = '🥈';
            else if (rank === 3) rankEmoji = '🥉';

            item.innerHTML = `
                <div class="rank">${rankEmoji} #${rank}</div>
                <div class="player-info">
                    <div class="player-name">${user.username}</div>
                    <div class="player-stats">Tournaments: ${user.joinedTournaments.length}</div>
                </div>
                <div class="player-stats">
                    <div class="stat-value">${user.wins}</div>
                    <div class="stat-label">Wins</div>
                </div>
                <div class="player-stats">
                    <div class="stat-value">${user.losses}</div>
                    <div class="stat-label">Losses</div>
                </div>
            `;

            leaderboardList.appendChild(item);
        });
    }

    // Profile
    loadProfile() {
        if (!this.currentUser) {
            this.showMessage('Please login to view your profile!', 'error');
            this.showPage('login');
            return;
        }

        const profileContent = document.getElementById('profileContent');
        
        const joinedTournaments = window.tournamentsManager.getTournamentsByPlayer(this.currentUser.id);

        profileContent.innerHTML = `
            <div class="profile-header">
                <div class="profile-username">${this.currentUser.username}</div>
                <div class="profile-stats">
                    <div class="stat-item">
                        <div class="stat-value">${this.currentUser.wins}</div>
                        <div class="stat-label">Wins</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${this.currentUser.losses}</div>
                        <div class="stat-label">Losses</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${joinedTournaments.length}</div>
                        <div class="stat-label">Tournaments</div>
                    </div>
                </div>
            </div>
            <div class="profile-tournaments">
                <h3>My Tournaments</h3>
                ${joinedTournaments.length > 0 ? 
                    joinedTournaments.map(t => `
                        <div class="tournament-card">
                            <h4>${t.name}</h4>
                            <p>Date: ${new Date(t.date).toLocaleDateString()}</p>
                            <p>Status: ${t.status}</p>
                            <p>Players: ${t.players.length}/${t.maxPlayers}</p>
                        </div>
                    `).join('') :
                    '<p>You haven\'t joined any tournaments yet.</p>'
                }
            </div>
        `;
    }

    // Admin Panel
    loadAdminPanel() {
        this.loadAdminTournaments();
        this.loadAdminUsers();
    }

    loadAdminTournaments() {
        const adminTournamentsList = document.getElementById('adminTournamentsList');
        if (!adminTournamentsList) return;
        
        adminTournamentsList.innerHTML = '';

        const tournaments = window.tournamentsManager.getAllTournaments();
        tournaments.forEach(tournament => {
            const item = document.createElement('div');
            item.className = 'admin-tournament-item';
            
            const playerNames = tournament.players.map(playerId => {
                const user = window.usersManager.findUserById(playerId);
                return user ? user.username : 'Unknown';
            });

            item.innerHTML = `
                <div>
                    <strong>${tournament.name}</strong><br>
                    <small>Date: ${new Date(tournament.date).toLocaleDateString()}</small><br>
                    <small>Players: ${playerNames.join(', ')}</small><br>
                    <small>Status: ${tournament.status}</small>
                </div>
                <div class="admin-actions">
                    ${tournament.players.length >= 2 && !tournament.bracketHTML ? 
                        `<button class="btn-generate" onclick="tournamentManager.generateTournamentBracket(${tournament.id})">Generate Bracket</button>` : 
                        ''
                    }
                    <button class="btn-danger" onclick="tournamentManager.deleteTournament(${tournament.id})">Delete</button>
                </div>
            `;

            adminTournamentsList.appendChild(item);
        });
    }

    loadAdminUsers() {
        const adminUsersList = document.getElementById('adminUsersList');
        if (!adminUsersList) return;
        
        adminUsersList.innerHTML = '';

        const users = window.usersManager.getRegularUsers();
        users.forEach(user => {
            const item = document.createElement('div');
            item.className = 'admin-user-item';

            item.innerHTML = `
                <div>
                    <strong>${user.username}</strong><br>
                    <small>Tournaments: ${user.joinedTournaments.length}</small><br>
                    <small>W/L: ${user.wins}/${user.losses}</small>
                </div>
                <div class="admin-actions">
                    <button class="btn-danger" onclick="tournamentManager.deleteUser(${user.id})">Delete</button>
                </div>
            `;

            adminUsersList.appendChild(item);
        });
    }

    handleAddTournament() {
        const name = document.getElementById('tournamentName').value;
        const date = document.getElementById('tournamentDate').value;
        const maxPlayers = parseInt(document.getElementById('maxPlayers').value);

        if (!name || !date || !maxPlayers) {
            this.showMessage('Please fill in all fields!', 'error');
            return;
        }

        const newTournament = window.tournamentsManager.createTournament(name, date, maxPlayers, this.currentUser.id);
        
        // Clear form
        document.getElementById('addTournamentForm').reset();
        
        this.showMessage('Tournament added successfully!', 'success');
        
        // Auto-refresh will happen via data sync
    }

    deleteTournament(tournamentId) {
        if (confirm('Are you sure you want to delete this tournament?')) {
            // Remove tournament from all users first
            const users = window.usersManager.getAllUsers();
            users.forEach(user => {
                window.usersManager.removeTournamentFromUser(user.id, tournamentId);
            });
            
            // Delete tournament
            window.tournamentsManager.deleteTournament(tournamentId);
            
            this.loadAdminTournaments();
            this.loadTournaments();
            this.showMessage('Tournament deleted successfully!', 'success');
        }
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user?')) {
            // Remove user from all tournaments first
            const tournaments = window.tournamentsManager.getAllTournaments();
            tournaments.forEach(tournament => {
                window.tournamentsManager.removePlayerFromTournament(tournament.id, userId);
            });
            
            // Delete user
            window.usersManager.deleteUser(userId);
            
            this.loadAdminUsers();
            this.loadTournaments();
            this.showMessage('User deleted successfully!', 'success');
        }
    }

    generateTournamentBracket(tournamentId) {
        const bracketHTML = window.tournamentsManager.generateTournamentBracket(tournamentId);
        if (bracketHTML) {
            this.loadAdminTournaments();
            this.showMessage('Bracket generated successfully!', 'success');
        }
    }

    // Bracket Generation
    generateBracket(players) {
        if (players.length < 2) {
            return '<p>Not enough players for a bracket.</p>';
        }

        // Pad players to next power of 2
        const targetSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
        while (players.length < targetSize) {
            players.push('TBD');
        }

        // Create bracket structure
        const bracket = {
            rounds: Math.log2(targetSize),
            matches: {}
        };

        // Initialize first round matches
        for (let i = 0; i < players.length; i += 2) {
            const matchId = `r0m${i/2}`;
            bracket.matches[matchId] = {
                round: 0,
                player1: players[i],
                player2: players[i + 1] || 'TBD',
                winner: null
            };
        }

        return this.renderBracket(bracket);
    }

    renderBracket(bracket) {
        let html = '<div class="bracket">';
        
        for (let round = 0; round < bracket.rounds; round++) {
            html += '<div class="bracket-round">';
            html += `<div class="round-title">Round ${round + 1}</div>`;
            
            const matchesInRound = Math.pow(2, bracket.rounds - round - 1);
            
            for (let match = 0; match < matchesInRound; match++) {
                const matchId = `r${round}m${match}`;
                const matchData = bracket.matches[matchId];
                
                html += '<div class="bracket-match" data-match-id="' + matchId + '">';
                
                if (matchData) {
                    // Match exists - show players
                    const isAdmin = this.currentUser && this.currentUser.isAdmin;
                    const canSelect = isAdmin && matchData.player1 !== 'TBD' && matchData.player2 !== 'TBD' && !matchData.winner;
                    
                    html += `
                        <div class="bracket-player ${matchData.winner === matchData.player1 ? 'winner' : ''} ${canSelect ? 'selectable' : ''}" 
                             ${canSelect ? `onclick="tournamentManager.selectWinner('${matchId}', '${matchData.player1}')"` : ''}>
                            ${matchData.player1}
                        </div>
                        <div class="bracket-vs">VS</div>
                        <div class="bracket-player ${matchData.winner === matchData.player2 ? 'winner' : ''} ${canSelect ? 'selectable' : ''}"
                             ${canSelect ? `onclick="tournamentManager.selectWinner('${matchId}', '${matchData.player2}')"` : ''}>
                            ${matchData.player2}
                        </div>
                    `;
                } else {
                    // Match doesn't exist yet - show placeholder
                    html += `
                        <div class="bracket-player">TBD</div>
                        <div class="bracket-vs">VS</div>
                        <div class="bracket-player">TBD</div>
                    `;
                }
                
                html += '</div>';
            }
            html += '</div>';
        }
        
        html += '</div>';
        return html;
    }

    selectWinner(matchId, winner) {
        if (!this.currentUser || !this.currentUser.isAdmin) {
            this.showMessage('Only admins can select winners!', 'error');
            return;
        }

        // Find the tournament with this bracket
        const tournaments = window.tournamentsManager.getAllTournaments();
        const tournament = tournaments.find(t => t.bracketHTML && t.bracketHTML.includes(matchId));
        if (!tournament) return;

        // Parse the current bracket structure from the modal
        const modal = document.getElementById('bracketModal');
        const currentMatch = modal.querySelector(`[data-match-id="${matchId}"]`);
        if (!currentMatch) return;

        // Extract round and match info
        const roundMatch = matchId.match(/r(\d+)m(\d+)/);
        const round = parseInt(roundMatch[1]);
        const matchIndex = parseInt(roundMatch[2]);

        // Update the visual bracket
        const players = currentMatch.querySelectorAll('.bracket-player');
        players.forEach(player => {
            player.classList.remove('winner', 'selectable');
            if (player.textContent === winner) {
                player.classList.add('winner');
            }
        });

        // Advance winner to next round
        const nextRound = round + 1;
        const nextMatchIndex = Math.floor(matchIndex / 2);
        const nextMatchId = `r${nextRound}m${nextMatchIndex}`;
        const nextMatch = modal.querySelector(`[data-match-id="${nextMatchId}"]`);
        
        if (nextMatch) {
            const nextPlayers = nextMatch.querySelectorAll('.bracket-player');
            const playerPosition = matchIndex % 2; // 0 for first player, 1 for second player
            
            if (nextPlayers[playerPosition]) {
                nextPlayers[playerPosition].textContent = winner;
                
                // Make next match selectable if both players are set
                if (nextPlayers[0].textContent !== 'TBD' && nextPlayers[1].textContent !== 'TBD') {
                    nextPlayers.forEach(player => {
                        player.classList.add('selectable');
                        const playerName = player.textContent;
                        player.setAttribute('onclick', `tournamentManager.selectWinner('${nextMatchId}', '${playerName}')`);
                    });
                }
            }
        }

        // Update tournament bracket HTML
        const updatedBracketHTML = modal.querySelector('.bracket').outerHTML;
        window.tournamentsManager.updateTournament(tournament.id, { bracketHTML: updatedBracketHTML });
        
        this.showMessage(`${winner} advances to the next round!`, 'success');
    }

    viewBracket(tournamentId) {
        const tournament = window.tournamentsManager.findTournamentById(tournamentId);
        if (!tournament) return;

        const modal = document.getElementById('bracketModal');
        const title = document.getElementById('bracketTitle');
        const content = document.getElementById('bracketContent');

        title.textContent = `${tournament.name} - Bracket`;
        
        if (tournament.bracketHTML) {
            content.innerHTML = tournament.bracketHTML;
        } else {
            content.innerHTML = '<p>Bracket not generated yet. Please wait for more players to join or for admin to generate the bracket.</p>';
        }

        modal.style.display = 'block';
    }

    closeBracketModal() {
        document.getElementById('bracketModal').style.display = 'none';
    }

    // Data Management Functions
    exportData() {
        const data = this.dataSync.export();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tournament-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showMessage('Data exported successfully!', 'success');
    }
    
    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.dataSync.import(data);
                this.loadData();
                this.refreshCurrentPage();
                this.showMessage('Data imported successfully!', 'success');
            } catch (error) {
                this.showMessage('Invalid file format!', 'error');
            }
        };
        reader.readAsText(file);
    }
    
    resetData() {
        if (confirm('Are you sure you want to reset ALL data? This cannot be undone!')) {
            this.dataSync.clear();
            this.currentUser = null;
            this.users = [];
            this.tournaments = [];
            this.updateNavigation();
            this.showPage('home');
            this.showMessage('All data has been reset!', 'success');
        }
    }
    
    // Utility Functions
    showMessage(message, type) {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.success, .error');
        existingMessages.forEach(msg => msg.remove());

        const messageDiv = document.createElement('div');
        messageDiv.className = type;
        messageDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(messageDiv, container.firstChild);

        // Auto remove after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// Global Functions (called from HTML)
let tournamentManager;

function showPage(pageId) {
    tournamentManager.showPage(pageId);
}

function logout() {
    tournamentManager.logout();
}

function filterTournaments(status) {
    tournamentManager.filterTournaments(status);
}

function closeBracketModal() {
    tournamentManager.closeBracketModal();
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('bracketModal');
    if (event.target === modal) {
        closeBracketModal();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    tournamentManager = new TournamentManager();
});
