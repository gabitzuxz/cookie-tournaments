// Main application logic will go here
// This file will orchestrate interactions between data, UI, and auth.

const App = (() => {
    // Initial load function
    function init() {
        console.log("App Initializing...");
        Data.loadData(); // Load data from localStorage
        Router.init();   // Initialize the router (this will also call UI.updateNavbar and render initial page)
        // UI.updateNavbar() is called by Router.handleRouteChange now
        // Initial page rendering is handled by Router.init() -> Router.handleRouteChange()
        console.log("App Initialized.");
    }

    // --- Tournament Actions ---
    function handleTournamentAdd(event) {
        event.preventDefault();
        const name = document.getElementById('tournament-name').value;
        const date = document.getElementById('tournament-date').value;
        const maxPlayers = document.getElementById('tournament-max-players').value;
        const messageElement = document.getElementById('add-tournament-message');

        if (!name || !date || !maxPlayers) {
            messageElement.textContent = 'All fields are required.';
            messageElement.style.color = 'red';
            return;
        }

        Data.addTournament(name, date, maxPlayers);
        messageElement.textContent = 'Tournament added successfully!';
        messageElement.style.color = 'lightgreen';

        document.getElementById('add-tournament-form').reset(); // Reset form

        // Refresh relevant UI parts
        if (window.location.hash === '#admin') {
            UI._renderAdminTournamentsList(); // Refresh tournament list in admin panel
        }
        // If user is on tournaments page, refresh that too (though less common for admin)
        if (window.location.hash === '#tournaments') {
            UI.renderTournamentsPage();
        }
    }

    function deleteTournament(tournamentId) {
        if (confirm('Are you sure you want to delete this tournament? This cannot be undone.')) {
            Data.deleteTournament(tournamentId);
            console.log(`Tournament ${tournamentId} deleted.`);
            // Refresh UI
            if (window.location.hash === '#admin') {
                UI._renderAdminTournamentsList();
            }
            if (window.location.hash === '#tournaments') {
                UI.renderTournamentsPage(); // If a user is somehow viewing it
            }
            // Potentially refresh profile page if a user had this tournament listed
        }
    }

    function joinTournament(tournamentId) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            alert("Please login to join a tournament.");
            Router.navigateTo('login');
            return;
        }

        const success = Data.joinTournament(tournamentId, currentUser.username);
        if (success) {
            alert("Successfully joined tournament!");
            // Refresh the tournaments page to show updated player count and button state
            UI.renderTournamentsPage();
            // If on profile page, that would need a refresh too if it's implemented to show joined tournaments.
            // For now, direct refresh of current page is enough.
        } else {
            alert("Failed to join tournament. It might be full, you might have already joined, or an error occurred.");
            UI.renderTournamentsPage(); // Refresh to ensure UI is consistent
        }
    }

    // --- Bracket Generation ---
    function generateBracket(tournamentId) {
        const tournament = Data.findTournament(tournamentId);
        if (!tournament) {
            alert("Tournament not found.");
            return;
        }

        const players = tournament.players;
        if (![2, 4, 8, 16].includes(players.length)) {
            alert(`Cannot generate bracket. Tournament needs 2, 4, 8, or 16 players. Currently has ${players.length}.`);
            return;
        }

        // Simple HTML bracket generation
        let bracketHTML = '<div class="bracket">';
        let currentRoundPlayers = [...players]; // Shuffle for randomness? For now, use join order.

        // Optional: Shuffle players for first round matchups
        // currentRoundPlayers.sort(() => Math.random() - 0.5);


        let roundNum = 1;
        while(currentRoundPlayers.length >= 2) {
            bracketHTML += `<div class="round" id="round-${roundNum}"><h4>Round ${roundNum}</h4>`;
            let nextRoundPlayers = [];
            for (let i = 0; i < currentRoundPlayers.length; i += 2) {
                const player1 = currentRoundPlayers[i];
                const player2 = (i + 1 < currentRoundPlayers.length) ? currentRoundPlayers[i+1] : "BYE"; // Handle BYE for odd numbers if we allowed them

                bracketHTML += `
                    <div class="match" id="match-${roundNum}-${(i/2)+1}">
                        <span class="player">${player1}</span>
                        <span class="player">${player2}</span>
                    </div>
                `;
                // For this simple generation, we don't know winners yet.
                // In a more complex system, we'd add placeholders for winners to advance.
                // For now, the bracket is just a display of initial matchups.
                // If we want to simulate progression, we'd need a way to input winners.
                // For now, we'll just assume the first player of a pair wins for demonstration if needed.
                if (player2 !== "BYE") { // Only advance if it's a real match
                    nextRoundPlayers.push(`Winner of (${player1} vs ${player2})`);
                } else {
                    nextRoundPlayers.push(player1); // Player with BYE advances
                }
            }
            bracketHTML += `</div>`; // End round

            if (currentRoundPlayers.length === 2 && roundNum > 1) { //This was the final
                 bracketHTML += `<div class="round" id="round-${roundNum+1}"><h4>Winner</h4>
                    <div class="match winner-final">
                        <span class="player">TBD</span>
                    </div>
                 </div>`;
            }


            if (currentRoundPlayers.length === 1) break; // Winner found (or only one player left after byes)

            // Prepare for next round (simplified: not actually progressing winners here)
            // If we were actually progressing, nextRoundPlayers would be populated by actual winners.
            // Since we're just displaying, we stop if the next round would have fewer than 2 "TBD" players.
            if (nextRoundPlayers.length < 2 && currentRoundPlayers.length > 1) { // If only one "winner" slot left, that's the champion.
                 if (currentRoundPlayers.length === 2) { // If previous round was the final match
                    // The "Winner TBD" is already handled by the final match display.
                 } else { // If it was a bye that led to one player
                    bracketHTML += `<div class="round" id="round-${roundNum+1}"><h4>Winner</h4>
                        <div class="match winner-final">
                            <span class="player">${nextRoundPlayers[0]}</span>
                        </div>
                    </div>`;
                 }
                break;
            }
            currentRoundPlayers = nextRoundPlayers; // This is for loop continuation with "Winner of..."
            if (currentRoundPlayers.every(p => p.startsWith("Winner of")) && currentRoundPlayers.length === 1) break;


            roundNum++;
            if (roundNum > 5) break; // Safety break for very large (unexpected) player counts
        }
        bracketHTML += '</div>'; // End bracket

        Data.updateTournamentBracket(tournamentId, bracketHTML);
        Data.updateTournamentStatus(tournamentId, 'Ongoing'); // Or set based on admin action

        alert("Bracket generated successfully!");

        // Refresh UI
        if (window.location.hash === '#admin') {
            UI._renderAdminTournamentsList();
        }
        // Also refresh tournaments page if user is there, or if they view the bracket
        UI.renderTournamentsPage(); // general refresh
    }


    // Public API
    return {
        init,
        handleTournamentAdd,
        deleteTournament,
        joinTournament,
        generateBracket
    };

})();

// Ensure the DOM is fully loaded before initializing the app
document.addEventListener('DOMContentLoaded', App.init);
console.log("app.js loaded and App object created");
