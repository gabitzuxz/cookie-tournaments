// UI rendering logic

const UI = (() => {
    const appContent = document.getElementById('app-content');
    const navbar = document.getElementById('navbar');

    function clearContent() {
        appContent.innerHTML = '';
    }

    function updateNavbar() {
        const currentUser = Auth.getCurrentUser();
        let navLinks = `
            <a href="#home" class="nav-link">Home</a>
            <a href="#tournaments" class="nav-link">Tournaments</a>
            <a href="#leaderboard" class="nav-link">Leaderboard</a>
        `;

        if (currentUser) {
            navLinks += `<a href="#profile" class="nav-link">Profile</a>`;
            if (currentUser.isAdmin) {
                navLinks += `<a href="#admin" class="nav-link">Admin Panel</a>`;
            }
            navLinks += `<a href="#logout" id="logout-link" class="nav-link">Logout</a>`;
        } else {
            navLinks += `<a href="#login" class="nav-link">Login</a>`;
            navLinks += `<a href="#register" class="nav-link">Register</a>`;
        }
        navbar.innerHTML = navLinks;

        // Add event listener for logout if the link exists
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                Auth.logout();
                // No need to call updateNavbar here, Router.navigateTo will trigger hash change
                // which re-renders and calls updateNavbar via App.init or route handler.
                Router.navigateTo('home');
            });
        }
        setActiveNavLink();
    }

    function setActiveNavLink() {
        const currentHash = window.location.hash || '#home';
        document.querySelectorAll('#navbar a').forEach(link => {
            if (link.getAttribute('href') === currentHash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    function renderHomePage() {
        clearContent();
        const homeHTML = `
            <div class="text-center">
                <h1>Welcome to Cookie's Tournaments!</h1>
                <p>Your one-stop place for Smash Karts action. Join tournaments, climb the leaderboard, and become a champion!</p>
                <img src="https://via.placeholder.com/600x300?text=Smash+Karts+Action" alt="Smash Karts" style="max-width: 100%; border-radius: 8px; margin: 20px 0;">
                <p>Ready to race?</p>
                <a href="#tournaments" class="cta-button">Join a Tournament!</a>
            </div>
        `;
        appContent.innerHTML = homeHTML;
    }

    function renderTournamentsPage() {
        clearContent();
        const tournaments = Data.getAllTournaments();
        const currentUser = Auth.getCurrentUser();

        let tournamentsHTML = '<h1>Tournaments</h1>';
        if (tournaments.length === 0) {
            tournamentsHTML += '<p>No tournaments scheduled yet. Check back soon!</p>';
        } else {
            tournaments.forEach(t => {
                const isJoined = currentUser && t.players.includes(currentUser.username);
                const isFull = t.players.length >= t.maxPlayers;
                const canJoin = currentUser && !isJoined && !isFull && t.status === 'Upcoming';
                const tournamentDate = new Date(t.date);

                tournamentsHTML += `
                    <div class="tournament-card">
                        <h3>${t.name}</h3>
                        <p><strong>Date:</strong> ${tournamentDate.toLocaleString()}</p>
                        <p><strong>Players:</strong> ${t.players.length} / ${t.maxPlayers}</p>
                        <p><strong>Status:</strong> <span class="status-${t.status.toLowerCase()}">${t.status}</span></p>
                        ${currentUser ?
                            (canJoin ? `<button onclick="App.joinTournament('${t.id}')">Join</button>` :
                            (isJoined ? '<button disabled>Joined</button>' :
                            (isFull ? '<button disabled>Full</button>' :
                            (t.status !== 'Upcoming' ? `<button disabled>${t.status}</button>` : ''))))
                            : '<p><a href="#login">Login</a> to join tournaments.</p>'}
                        ${t.bracketHTML || (t.status !== 'Upcoming' && t.players.length > 0) ? `<button onclick="UI.renderBracketView('${t.id}')" class="mt-1">View Bracket</button>` : ''}
                    </div>
                `;
            });
        }
        appContent.innerHTML = tournamentsHTML;
    }

    function renderBracketView(tournamentId) {
        clearContent();
        const tournament = Data.findTournament(tournamentId);
        if (!tournament) {
            appContent.innerHTML = '<h1>Bracket Not Found</h1><p>This tournament does not exist.</p><a href="#tournaments">Back to Tournaments</a>';
            return;
        }

        let bracketHTML = `<h1>Bracket: ${tournament.name}</h1>`;
        if (tournament.bracketHTML) {
            bracketHTML += tournament.bracketHTML;
        } else if (tournament.status === 'Upcoming' && tournament.players.length > 0) {
             bracketHTML += `<p>The bracket for this tournament has not been generated yet. It will appear here once the admin generates it.</p>`;
        } else if (tournament.players.length === 0) {
            bracketHTML += `<p>No players have joined this tournament yet. A bracket cannot be displayed.</p>`;
        }
        else {
            bracketHTML += `<p>The bracket for this tournament is not available or has not been generated.</p>`;
        }
        bracketHTML += `<br><button onclick="Router.navigateTo('tournaments')">Back to Tournaments</button>`;
        appContent.innerHTML = bracketHTML;
    }

    function renderLeaderboardPage() {
        clearContent();
        const users = Data.getAllUsers().filter(u => !u.isAdmin); // Don't show admins on leaderboard
        // Sort by wins (descending), then by losses (ascending) as a tie-breaker
        users.sort((a, b) => {
            if (b.wins !== a.wins) {
                return b.wins - a.wins;
            }
            return a.losses - b.losses;
        });

        let leaderboardHTML = '<h1>Leaderboard</h1>';
        if (users.length === 0) {
            leaderboardHTML += '<p>No player data available yet.</p>';
        } else {
            leaderboardHTML += `
                <table id="leaderboard-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Username</th>
                            <th>Wins</th>
                            <th>Losses</th>
                            <th>Tournaments Joined</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            users.forEach((user, index) => {
                leaderboardHTML += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${user.username}</td>
                        <td>${user.wins}</td>
                        <td>${user.losses}</td>
                        <td>${user.joinedTournaments.length}</td>
                    </tr>
                `;
            });
            leaderboardHTML += '</tbody></table>';
        }
        appContent.innerHTML = leaderboardHTML;
    }

    function renderProfilePage() {
        clearContent();
        const currentUser = Auth.getCurrentUser(); // Gets the full user object
        if (!currentUser) {
            appContent.innerHTML = '<h1>Profile</h1><p>You must be logged in to view your profile.</p><a href="#login">Login</a>';
            return;
        }

        const joinedTournamentsDetails = currentUser.joinedTournaments.map(id => {
            const t = Data.findTournament(id);
            return t ? `<li>${t.name} (${t.status}) - <a href="#tournaments/bracket/${t.id}">View Bracket</a></li>` : `<li>Unknown Tournament (ID: ${id})</li>`;
        }).join('');

        const profileHTML = `
            <h1>Your Profile</h1>
            <div class="profile-info">
                <p><strong>Username:</strong> ${currentUser.username}</p>
                <p><strong>Admin:</strong> ${currentUser.isAdmin ? 'Yes' : 'No'}</p>
            </div>
            <div class="user-stats">
                <h2>Stats</h2>
                <p><strong>Wins:</strong> ${currentUser.wins}</p>
                <p><strong>Losses:</strong> ${currentUser.losses}</p>
            </div>
            <div class="user-tournaments">
                <h2>Joined Tournaments</h2>
                ${currentUser.joinedTournaments.length > 0 ? `<ul>${joinedTournamentsDetails}</ul>` : '<p>You have not joined any tournaments yet.</p>'}
            </div>
        `;
        appContent.innerHTML = profileHTML;
    }

    function renderLoginPage() {
        clearContent();
        const loginHTML = `
            <h1>Login</h1>
            <form id="login-form">
                <div>
                    <label for="username">Username:</label>
                    <input type="text" id="login-username" name="username" required>
                </div>
                <div>
                    <label for="password">Password:</label>
                    <input type="password" id="login-password" name="password" required>
                </div>
                <button type="submit">Login</button>
                <p id="login-error" style="color: red;"></p>
            </form>
            <p class="mt-1">Don't have an account? <a href="#register">Register here</a>.</p>
        `;
        appContent.innerHTML = loginHTML;
        document.getElementById('login-form').addEventListener('submit', Auth.handleLogin);
    }

    function renderRegisterPage() {
        clearContent();
        const registerHTML = `
            <h1>Register</h1>
            <form id="register-form">
                <div>
                    <label for="username">Username:</label>
                    <input type="text" id="register-username" name="username" required>
                </div>
                <div>
                    <label for="password">Password:</label>
                    <input type="password" id="register-password" name="password" required>
                </div>
                <div>
                    <label for="confirm-password">Confirm Password:</label>
                    <input type="password" id="register-confirm-password" name="confirm-password" required>
                </div>
                <button type="submit">Register</button>
                <p id="register-error" style="color: red;"></p>
            </form>
            <p class="mt-1">Already have an account? <a href="#login">Login here</a>.</p>
        `;
        appContent.innerHTML = registerHTML;
        document.getElementById('register-form').addEventListener('submit', Auth.handleRegister);
    }

    function renderAdminPanel() {
        clearContent();
        const currentUser = Auth.getCurrentUser();
        if (!currentUser || !currentUser.isAdmin) {
            appContent.innerHTML = '<h1>Access Denied</h1><p>You do not have permission to view this page.</p>';
            Router.navigateTo('home'); // Redirect if not admin
            return;
        }

        // Section: Add New Tournament
        let adminHTML = `<h1>Admin Panel</h1>
            <section class="admin-section" id="admin-add-tournament">
                <h2>Add New Tournament</h2>
                <form id="add-tournament-form">
                    <div>
                        <label for="tournament-name">Name:</label>
                        <input type="text" id="tournament-name" required>
                    </div>
                    <div>
                        <label for="tournament-date">Date and Time:</label>
                        <input type="datetime-local" id="tournament-date" required>
                    </div>
                    <div>
                        <label for="tournament-max-players">Max Players:</label>
                        <input type="number" id="tournament-max-players" min="2" value="8" required>
                    </div>
                    <button type="submit">Add Tournament</button>
                    <p id="add-tournament-message" style="color: lightgreen;"></p>
                </form>
            </section>
        `;

        // Section: Manage Tournaments (Delete, View Participants, Generate Bracket)
        adminHTML += `
            <section class="admin-section" id="admin-manage-tournaments">
                <h2>Manage Tournaments</h2>
                <div id="admin-tournaments-list"></div>
            </section>
        `;

        // Section: Registered Users
        adminHTML += `
            <section class="admin-section" id="admin-view-users">
                <h2>Registered Users</h2>
                <div id="admin-users-list"></div>
            </section>
        `;

        appContent.innerHTML = adminHTML;
        document.getElementById('add-tournament-form').addEventListener('submit', App.handleTournamentAdd);

        _renderAdminTournamentsList();
        _renderAdminUsersList();
    }

    function _renderAdminTournamentsList() {
        const tournamentsListDiv = document.getElementById('admin-tournaments-list');
        if (!tournamentsListDiv) return; // In case the section is not on the page

        const tournaments = Data.getAllTournaments();
        if (tournaments.length === 0) {
            tournamentsListDiv.innerHTML = '<p>No tournaments created yet.</p>';
            return;
        }

        let listHTML = '<table><thead><tr><th>Name</th><th>Date</th><th>Players</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        tournaments.forEach(t => {
            const canGenerateBracket = (t.status === 'Upcoming' || t.status === 'Ongoing') &&
                                   (t.players.length === 2 || t.players.length === 4 || t.players.length === 8 || t.players.length === 16) &&
                                   !t.bracketHTML; // Only if bracket not already generated
            const tournamentDate = new Date(t.date);
            listHTML += `
                <tr>
                    <td>${t.name}</td>
                    <td>${tournamentDate.toLocaleString()}</td>
                    <td>${t.players.length} / ${t.maxPlayers} (${t.players.join(', ') || 'None'})</td>
                    <td>${t.status}</td>
                    <td>
                        <button onclick="App.deleteTournament('${t.id}')">Delete</button>
                        ${canGenerateBracket ? `<button onclick="App.generateBracket('${t.id}')">Generate Bracket</button>` : ''}
                        ${t.bracketHTML ? `<button onclick="UI.renderBracketView('${t.id}')">View Bracket</button>` : ''}
                    </td>
                </tr>
            `;
        });
        listHTML += '</tbody></table>';
        tournamentsListDiv.innerHTML = listHTML;
    }

    function _renderAdminUsersList() {
        const usersListDiv = document.getElementById('admin-users-list');
        if(!usersListDiv) return;

        const users = Data.getAllUsers();
        if (users.length === 0) {
            usersListDiv.innerHTML = '<p>No registered users.</p>';
            return;
        }
        let listHTML = '<table><thead><tr><th>Username</th><th>Is Admin?</th><th>Joined Tournaments</th><th>Wins</th><th>Losses</th></tr></thead><tbody>';
        users.forEach(u => {
            listHTML += `
                <tr>
                    <td>${u.username}</td>
                    <td>${u.isAdmin ? 'Yes' : 'No'}</td>
                    <td>${u.joinedTournaments.length}</td>
                    <td>${u.wins}</td>
                    <td>${u.losses}</td>
                </tr>
            `;
        });
        listHTML += '</tbody></table>';
        usersListDiv.innerHTML = listHTML;
    }


    // Public API
    return {
        updateNavbar,
        setActiveNavLink,
        renderHomePage,
        renderTournamentsPage,
        renderBracketView,
        renderLeaderboardPage,
        renderProfilePage,
        renderLoginPage,
        renderRegisterPage,
        renderAdminPanel,
        _renderAdminTournamentsList, // Expose for refresh
        _renderAdminUsersList // Expose for refresh
    };
})();

console.log("ui.js loaded");
