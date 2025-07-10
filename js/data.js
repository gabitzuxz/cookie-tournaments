// Data management: localStorage interactions, mock data

const Data = (() => {
    let state = {
        users: [],
        tournaments: [],
        currentUser: null // Can be username or user object
    };

    const USERS_KEY = 'smashKartsUsers';
    const TOURNAMENTS_KEY = 'smashKartsTournaments';
    const CURRENT_USER_KEY = 'smashKartsCurrentUser'; // For session persistence

    function saveData() {
        localStorage.setItem(USERS_KEY, JSON.stringify(state.users));
        localStorage.setItem(TOURNAMENTS_KEY, JSON.stringify(state.tournaments));
        if (state.currentUser) {
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(state.currentUser));
        } else {
            localStorage.removeItem(CURRENT_USER_KEY);
        }
        console.log("Data saved to localStorage.");
    }

    function loadData() {
        const users = localStorage.getItem(USERS_KEY);
        const tournaments = localStorage.getItem(TOURNAMENTS_KEY);
        const currentUser = localStorage.getItem(CURRENT_USER_KEY);

        state.users = users ? JSON.parse(users) : [];
        state.tournaments = tournaments ? JSON.parse(tournaments) : [];
        state.currentUser = currentUser ? JSON.parse(currentUser) : null;

        if (state.users.length === 0 && state.tournaments.length === 0) {
            console.log("No data found in localStorage, initializing with mock data.");
            _addMockData();
            saveData(); // Save mock data if it's the first time
        }
        console.log("Data loaded from localStorage:", state);
    }

    function _addMockData() {
        // Add a default admin user
        state.users.push({
            username: 'admin',
            password: 'adminpassword', // In a real app, hash passwords!
            isAdmin: true,
            joinedTournaments: [],
            wins: 0,
            losses: 0
        });
        state.users.push({
            username: 'player1',
            password: 'password1',
            isAdmin: false,
            joinedTournaments: [],
            wins: 5,
            losses: 2
        });
        state.users.push({
            username: 'player2',
            password: 'password2',
            isAdmin: false,
            joinedTournaments: [],
            wins: 3,
            losses: 3
        });

        // Add some mock tournaments
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() -1);


        state.tournaments.push({
            id: `tmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: 'Kart Klash Weekly #1',
            date: tomorrow.toISOString().split('T')[0] + 'T18:00', // Tomorrow 6 PM
            maxPlayers: 8,
            players: [], // Array of usernames
            status: 'Upcoming', // Upcoming / Ongoing / Finished
            bracketHTML: ''
        });
        state.tournaments.push({
            id: `tmt_${Date.now() + 1000}_${Math.random().toString(36).substr(2, 9)}`,
            name: 'Weekend Warriors Cup',
            date: new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0] + 'T14:00', // Next week
            maxPlayers: 16,
            players: ['player1'],
            status: 'Upcoming',
            bracketHTML: ''
        });
         state.tournaments.push({
            id: `tmt_${Date.now() - 2000}_${Math.random().toString(36).substr(2, 9)}`,
            name: 'Retro Rumble',
            date: yesterday.toISOString().split('T')[0] + 'T10:00',
            maxPlayers: 4,
            players: ['player1', 'player2', 'admin', 'cpu1'], // Assuming a CPU or another mock player
            status: 'Finished',
            bracketHTML: '<p>Bracket for Retro Rumble (Finished)</p>' // Example, will be generated later
        });
    }

    // --- User Management ---
    function addUser(username, password, isAdmin = false) {
        if (state.users.find(user => user.username === username)) {
            return null; // User already exists
        }
        const newUser = {
            username,
            password, // Remember: HASH PASSWORDS IN REAL APPS!
            isAdmin,
            joinedTournaments: [],
            wins: 0,
            losses: 0
        };
        state.users.push(newUser);
        saveData();
        return newUser;
    }

    function findUser(username) {
        return state.users.find(user => user.username === username);
    }

    function getCurrentUser() {
        if (!state.currentUser) return null;
        // Return a fresh copy from the users array to ensure data consistency
        return findUser(state.currentUser.username);
    }

    function setCurrentUser(user) { // user can be user object or null
        state.currentUser = user ? { username: user.username, isAdmin: user.isAdmin } : null;
        saveData();
    }


    // --- Tournament Management ---
    function addTournament(name, date, maxPlayers) {
        const newTournament = {
            id: `tmt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name,
            date,
            maxPlayers: parseInt(maxPlayers, 10),
            players: [],
            status: 'Upcoming',
            bracketHTML: ''
        };
        state.tournaments.push(newTournament);
        saveData();
        return newTournament;
    }

    function findTournament(tournamentId) {
        return state.tournaments.find(t => t.id === tournamentId);
    }

    function deleteTournament(tournamentId) {
        state.tournaments = state.tournaments.filter(t => t.id !== tournamentId);
        // Also remove this tournament from any users who joined it
        state.users.forEach(user => {
            user.joinedTournaments = user.joinedTournaments.filter(id => id !== tournamentId);
        });
        saveData();
    }

    function joinTournament(tournamentId, username) {
        const tournament = findTournament(tournamentId);
        const user = findUser(username);

        if (!tournament || !user) return false;
        if (tournament.players.length >= tournament.maxPlayers) return false; // Tournament full
        if (tournament.players.includes(username)) return false; // Already joined

        tournament.players.push(username);
        user.joinedTournaments.push(tournamentId);
        saveData();
        return true;
    }

    function updateTournamentBracket(tournamentId, bracketHTML) {
        const tournament = findTournament(tournamentId);
        if (tournament) {
            tournament.bracketHTML = bracketHTML;
            saveData();
        }
    }

    function updateTournamentStatus(tournamentId, status) {
        const tournament = findTournament(tournamentId);
        if (tournament) {
            tournament.status = status;
            saveData();
        }
    }


    // --- Getters for UI ---
    function getAllTournaments() {
        return [...state.tournaments].sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date
    }

    function getAllUsers() {
        return [...state.users];
    }

    // Public API
    return {
        loadData,
        saveData,
        addUser,
        findUser,
        setCurrentUser,
        getCurrentUser,
        addTournament,
        findTournament,
        deleteTournament,
        joinTournament,
        updateTournamentBracket,
        updateTournamentStatus,
        getAllTournaments,
        getAllUsers,
        // Expose state directly for read-only purposes if needed, or create more getters
        getState: () => state
    };
})();

console.log("data.js loaded");
