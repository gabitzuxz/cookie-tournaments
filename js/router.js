// Simple client-side router

const Router = (() => {
    const routes = {
        'home': UI.renderHomePage,
        'tournaments': UI.renderTournamentsPage,
        'leaderboard': UI.renderLeaderboardPage,
        'profile': UI.renderProfilePage,
        'login': UI.renderLoginPage,
        'register': UI.renderRegisterPage,
        'admin': UI.renderAdminPanel,
        'tournaments/bracket/:id': (id) => UI.renderBracketView(id) //Parameterized route
    };

    function getPathSegments(hash) {
        return hash.substring(1).split('/'); // Remove # and split
    }

    function handleRouteChange() {
        const hash = window.location.hash || '#home';
        const pathSegments = getPathSegments(hash);
        const baseRoute = pathSegments[0];

        UI.updateNavbar(); // Update navbar on every route change to reflect login state and active link

        let routeHandler = routes[baseRoute];
        let params = [];

        if (!routeHandler) {
            // Check for parameterized routes
            for (const routeKey in routes) {
                if (routeKey.includes(':')) {
                    const routeKeySegments = routeKey.split('/');
                    if (routeKeySegments.length === pathSegments.length) {
                        let match = true;
                        params = [];
                        for (let i = 0; i < routeKeySegments.length; i++) {
                            if (routeKeySegments[i].startsWith(':')) {
                                params.push(pathSegments[i]);
                            } else if (routeKeySegments[i] !== pathSegments[i]) {
                                match = false;
                                break;
                            }
                        }
                        if (match) {
                            routeHandler = routes[routeKey];
                            break;
                        }
                    }
                }
            }
        }


        if (routeHandler) {
            if (params.length > 0) {
                routeHandler(...params); // Call with extracted parameters
            } else {
                routeHandler(); // Call simple route handler
            }
        } else {
            console.warn(`No route found for hash: ${hash}. Defaulting to home.`);
            UI.renderHomePage(); // Default to home page if route not found
        }
        UI.setActiveNavLink(); // Ensure correct nav link is highlighted
    }

    function navigateTo(path) {
        window.location.hash = path;
        // handleRouteChange will be triggered by the 'hashchange' event
    }

    function init() {
        window.addEventListener('hashchange', handleRouteChange);
        handleRouteChange(); // Initial route handling
        console.log("Router initialized.");
    }

    return {
        init,
        navigateTo
    };
})();

console.log("router.js loaded");
