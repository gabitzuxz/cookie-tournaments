
// Tournaments Management System
class TournamentsManager {
    constructor() {
        this.dataSync = DataSync.getInstance();
        this.storageKey = 'tournaments';
        this.tournaments = [];
        this.init();
    }

    init() {
        this.loadTournaments();
        this.setupSync();
    }

    setupSync() {
        this.dataSync.subscribe((event, key, value) => {
            if (event === 'dataChanged' && key === this.storageKey) {
                this.tournaments = value ? JSON.parse(value) : [];
                this.notifyListeners('tournamentsChanged', this.tournaments);
            }
        });
    }

    loadTournaments() {
        this.tournaments = this.dataSync.load(this.storageKey) || [];
        if (this.tournaments.length === 0) {
            this.initializeMockTournaments();
        }
    }

    saveTournaments() {
        this.dataSync.save(this.storageKey, this.tournaments);
    }

    initializeMockTournaments() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);

        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        this.tournaments = [
            {
                id: 1,
                name: 'Weekly Championship',
                date: tomorrow.toISOString().split('T')[0],
                maxPlayers: 8,
                players: [2, 3],
                status: 'upcoming',
                bracketHTML: '',
                createdAt: new Date().toISOString(),
                createdBy: 1
            },
            {
                id: 2,
                name: 'Speed Masters Cup',
                date: nextWeek.toISOString().split('T')[0],
                maxPlayers: 4,
                players: [2, 4],
                status: 'upcoming',
                bracketHTML: '',
                createdAt: new Date().toISOString(),
                createdBy: 1
            },
            {
                id: 3,
                name: 'Beginner\'s Race',
                date: lastWeek.toISOString().split('T')[0],
                maxPlayers: 4,
                players: [2, 3, 4],
                status: 'finished',
                bracketHTML: this.generateBracket(['SpeedRacer', 'KartMaster', 'TurboDriver', 'Player4']),
                createdAt: new Date().toISOString(),
                createdBy: 1
            }
        ];
        this.saveTournaments();
    }

    // Tournament Operations
    createTournament(name, date, maxPlayers, createdBy) {
        const newTournament = {
            id: this.generateId(),
            name,
            date,
            maxPlayers,
            players: [],
            status: 'upcoming',
            bracketHTML: '',
            createdAt: new Date().toISOString(),
            createdBy,
            lastModified: new Date().toISOString()
        };

        this.tournaments.push(newTournament);
        this.saveTournaments();
        return newTournament;
    }

    findTournamentById(id) {
        return this.tournaments.find(tournament => tournament.id === id);
    }

    updateTournament(tournamentId, updates) {
        const tournamentIndex = this.tournaments.findIndex(t => t.id === tournamentId);
        if (tournamentIndex !== -1) {
            this.tournaments[tournamentIndex] = { 
                ...this.tournaments[tournamentIndex], 
                ...updates, 
                lastModified: new Date().toISOString() 
            };
            this.saveTournaments();
            return this.tournaments[tournamentIndex];
        }
        return null;
    }

    deleteTournament(tournamentId) {
        const tournamentIndex = this.tournaments.findIndex(t => t.id === tournamentId);
        if (tournamentIndex !== -1) {
            const deletedTournament = this.tournaments.splice(tournamentIndex, 1)[0];
            this.saveTournaments();
            return deletedTournament;
        }
        return null;
    }

    addPlayerToTournament(tournamentId, playerId) {
        const tournament = this.findTournamentById(tournamentId);
        if (tournament && !tournament.players.includes(playerId) && tournament.players.length < tournament.maxPlayers) {
            tournament.players.push(playerId);
            tournament.lastModified = new Date().toISOString();
            this.saveTournaments();
            return true;
        }
        return false;
    }

    removePlayerFromTournament(tournamentId, playerId) {
        const tournament = this.findTournamentById(tournamentId);
        if (tournament) {
            tournament.players = tournament.players.filter(id => id !== playerId);
            tournament.lastModified = new Date().toISOString();
            this.saveTournaments();
            return true;
        }
        return false;
    }

    updateTournamentStatus(tournamentId, status) {
        const tournament = this.findTournamentById(tournamentId);
        if (tournament) {
            tournament.status = status;
            tournament.lastModified = new Date().toISOString();
            this.saveTournaments();
            return true;
        }
        return false;
    }

    generateTournamentBracket(tournamentId) {
        const tournament = this.findTournamentById(tournamentId);
        if (!tournament) return null;

        const playerNames = tournament.players.map(playerId => {
            const user = window.usersManager.findUserById(playerId);
            return user ? user.username : 'Unknown';
        });

        tournament.bracketHTML = this.generateBracket(playerNames);
        tournament.lastModified = new Date().toISOString();
        this.saveTournaments();
        return tournament.bracketHTML;
    }

    generateBracket(players) {
        if (players.length < 2) {
            return '<p>Not enough players for a bracket.</p>';
        }

        const targetSize = Math.pow(2, Math.ceil(Math.log2(players.length)));
        while (players.length < targetSize) {
            players.push('TBD');
        }

        const bracket = {
            rounds: Math.log2(targetSize),
            matches: {}
        };

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
                    const canSelect = matchData.player1 !== 'TBD' && matchData.player2 !== 'TBD' && !matchData.winner;
                    
                    html += `
                        <div class="bracket-player ${matchData.winner === matchData.player1 ? 'winner' : ''} ${canSelect ? 'selectable' : ''}" 
                             ${canSelect ? `onclick="window.tournamentsManager.selectWinner('${matchId}', '${matchData.player1}')"` : ''}>
                            ${matchData.player1}
                        </div>
                        <div class="bracket-vs">VS</div>
                        <div class="bracket-player ${matchData.winner === matchData.player2 ? 'winner' : ''} ${canSelect ? 'selectable' : ''}"
                             ${canSelect ? `onclick="window.tournamentsManager.selectWinner('${matchId}', '${matchData.player2}')"` : ''}>
                            ${matchData.player2}
                        </div>
                    `;
                } else {
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
        // This method will be called from the bracket interface
        // Implementation depends on the tournament structure
        console.log(`Winner selected: ${winner} for match ${matchId}`);
    }

    // Filtering and Querying
    getTournamentsByStatus(status) {
        if (status === 'all') return this.tournaments;
        return this.tournaments.filter(tournament => tournament.status === status);
    }

    getUpcomingTournaments() {
        return this.tournaments.filter(tournament => tournament.status === 'upcoming');
    }

    getOngoingTournaments() {
        return this.tournaments.filter(tournament => tournament.status === 'ongoing');
    }

    getFinishedTournaments() {
        return this.tournaments.filter(tournament => tournament.status === 'finished');
    }

    getTournamentsByPlayer(playerId) {
        return this.tournaments.filter(tournament => 
            tournament.players.includes(playerId)
        );
    }

    getTournamentsByDate(date) {
        return this.tournaments.filter(tournament => tournament.date === date);
    }

    searchTournaments(query) {
        return this.tournaments.filter(tournament => 
            tournament.name.toLowerCase().includes(query.toLowerCase())
        );
    }

    // Statistics
    getTournamentStats() {
        return {
            total: this.tournaments.length,
            upcoming: this.getUpcomingTournaments().length,
            ongoing: this.getOngoingTournaments().length,
            finished: this.getFinishedTournaments().length,
            totalPlayers: this.tournaments.reduce((sum, t) => sum + t.players.length, 0)
        };
    }

    generateId() {
        return Math.max(...this.tournaments.map(t => t.id), 0) + 1;
    }

    // Event System
    listeners = [];

    subscribe(callback) {
        this.listeners.push(callback);
    }

    unsubscribe(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    }

    notifyListeners(event, data) {
        this.listeners.forEach(callback => {
            callback(event, data);
        });
    }

    // Export/Import
    exportTournaments() {
        return {
            tournaments: this.tournaments,
            exportTimestamp: new Date().toISOString()
        };
    }

    importTournaments(data) {
        if (data.tournaments && Array.isArray(data.tournaments)) {
            this.tournaments = data.tournaments;
            this.saveTournaments();
            return true;
        }
        return false;
    }

    // Utility Methods
    getAllTournaments() {
        return [...this.tournaments];
    }

    getTournamentCount() {
        return this.tournaments.length;
    }

    getRecentTournaments(count = 5) {
        return this.tournaments
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, count);
    }

    getPopularTournaments(count = 5) {
        return this.tournaments
            .sort((a, b) => b.players.length - a.players.length)
            .slice(0, count);
    }
}

// Global instance
window.tournamentsManager = new TournamentsManager();
