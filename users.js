
// Users Management System
class UsersManager {
    constructor() {
        this.dataSync = DataSync.getInstance();
        this.storageKey = 'tournamentUsers';
        this.users = [];
        this.init();
    }

    init() {
        this.loadUsers();
        this.setupSync();
    }

    setupSync() {
        this.dataSync.subscribe((event, key, value) => {
            if (event === 'dataChanged' && key === this.storageKey) {
                this.users = value ? JSON.parse(value) : [];
                this.notifyListeners('usersChanged', this.users);
            }
        });
    }

    loadUsers() {
        this.users = this.dataSync.load(this.storageKey) || [];
        if (this.users.length === 0) {
            this.initializeMockUsers();
        }
    }

    saveUsers() {
        this.dataSync.save(this.storageKey, this.users);
    }

    initializeMockUsers() {
        this.users = [
            {
                id: 1,
                username: 'admin',
                password: 'admin123',
                isAdmin: true,
                joinedTournaments: [],
                wins: 0,
                losses: 0,
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                username: 'SpeedRacer',
                password: 'password',
                isAdmin: false,
                joinedTournaments: [1, 2],
                wins: 5,
                losses: 2,
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                username: 'KartMaster',
                password: 'password',
                isAdmin: false,
                joinedTournaments: [1],
                wins: 3,
                losses: 4,
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                username: 'TurboDriver',
                password: 'password',
                isAdmin: false,
                joinedTournaments: [2],
                wins: 7,
                losses: 1,
                createdAt: new Date().toISOString()
            }
        ];
        this.saveUsers();
    }

    // User Operations
    createUser(username, password, isAdmin = false) {
        if (this.findUserByUsername(username)) {
            throw new Error('Username already exists');
        }

        const newUser = {
            id: this.generateId(),
            username,
            password,
            isAdmin,
            joinedTournaments: [],
            wins: 0,
            losses: 0,
            createdAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveUsers();
        return newUser;
    }

    findUserByUsername(username) {
        return this.users.find(user => user.username === username);
    }

    findUserById(id) {
        return this.users.find(user => user.id === id);
    }

    authenticateUser(username, password) {
        const user = this.findUserByUsername(username);
        if (user && user.password === password) {
            user.lastActivity = new Date().toISOString();
            this.saveUsers();
            return user;
        }
        return null;
    }

    updateUser(userId, updates) {
        const userIndex = this.users.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            this.users[userIndex] = { 
                ...this.users[userIndex], 
                ...updates, 
                lastActivity: new Date().toISOString() 
            };
            this.saveUsers();
            return this.users[userIndex];
        }
        return null;
    }

    deleteUser(userId) {
        const userIndex = this.users.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            const deletedUser = this.users.splice(userIndex, 1)[0];
            this.saveUsers();
            return deletedUser;
        }
        return null;
    }

    addTournamentToUser(userId, tournamentId) {
        const user = this.findUserById(userId);
        if (user && !user.joinedTournaments.includes(tournamentId)) {
            user.joinedTournaments.push(tournamentId);
            user.lastActivity = new Date().toISOString();
            this.saveUsers();
            return true;
        }
        return false;
    }

    removeTournamentFromUser(userId, tournamentId) {
        const user = this.findUserById(userId);
        if (user) {
            user.joinedTournaments = user.joinedTournaments.filter(id => id !== tournamentId);
            user.lastActivity = new Date().toISOString();
            this.saveUsers();
            return true;
        }
        return false;
    }

    updateUserStats(userId, wins, losses) {
        const user = this.findUserById(userId);
        if (user) {
            user.wins = wins;
            user.losses = losses;
            user.lastActivity = new Date().toISOString();
            this.saveUsers();
            return true;
        }
        return false;
    }

    getLeaderboard() {
        return this.users
            .filter(user => !user.isAdmin)
            .sort((a, b) => {
                const aScore = a.wins - a.losses;
                const bScore = b.wins - b.losses;
                if (bScore !== aScore) return bScore - aScore;
                return b.wins - a.wins;
            });
    }

    getAdminUsers() {
        return this.users.filter(user => user.isAdmin);
    }

    getRegularUsers() {
        return this.users.filter(user => !user.isAdmin);
    }

    generateId() {
        return Math.max(...this.users.map(u => u.id), 0) + 1;
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
    exportUsers() {
        return {
            users: this.users,
            exportTimestamp: new Date().toISOString()
        };
    }

    importUsers(data) {
        if (data.users && Array.isArray(data.users)) {
            this.users = data.users;
            this.saveUsers();
            return true;
        }
        return false;
    }

    // Utility Methods
    getAllUsers() {
        return [...this.users];
    }

    getUserCount() {
        return this.users.length;
    }

    getActiveUsers(daysAgo = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
        
        return this.users.filter(user => {
            const lastActivity = new Date(user.lastActivity || user.createdAt);
            return lastActivity >= cutoffDate;
        });
    }

    searchUsers(query) {
        return this.users.filter(user => 
            user.username.toLowerCase().includes(query.toLowerCase())
        );
    }

    getUsersByTournament(tournamentId) {
        return this.users.filter(user => 
            user.joinedTournaments.includes(tournamentId)
        );
    }
}

// Global instance
window.usersManager = new UsersManager();
