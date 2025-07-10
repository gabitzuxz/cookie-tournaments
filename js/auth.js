// Authentication logic: login, register, logout, session management

const Auth = (() => {

    function getCurrentUser() {
        return Data.getCurrentUser(); // Get from Data module which handles localStorage
    }

    function login(username, password) {
        const user = Data.findUser(username);
        if (user && user.password === password) { // Plain text password check (BAD for production)
            Data.setCurrentUser(user);
            console.log("Login successful for:", username);
            return true;
        }
        console.log("Login failed for:", username);
        return false;
    }

    function handleLogin(event) {
        event.preventDefault();
        const username = event.target.username.value;
        const password = event.target.password.value;
        const errorElement = document.getElementById('login-error');
        errorElement.textContent = '';

        if (login(username, password)) {
            UI.updateNavbar(); // Reflect login state immediately
            Router.navigateTo('home'); // Or profile page: Router.navigateTo('profile');
        } else {
            errorElement.textContent = 'Invalid username or password.';
        }
    }

    function register(username, password) {
        if (Data.findUser(username)) {
            console.log("Registration failed: Username already exists -", username);
            return { success: false, message: 'Username already exists.' };
        }
        const newUser = Data.addUser(username, password); // isAdmin defaults to false
        if (newUser) {
            console.log("Registration successful for:", username);
            // Optionally auto-login after registration
            // login(username, password);
            return { success: true, user: newUser };
        }
        return { success: false, message: 'An error occurred during registration.'};
    }

    function handleRegister(event) {
        event.preventDefault();
        const username = event.target.username.value;
        const password = event.target.password.value;
        const confirmPassword = event.target['confirm-password'].value;
        const errorElement = document.getElementById('register-error');
        errorElement.textContent = '';

        if (password !== confirmPassword) {
            errorElement.textContent = 'Passwords do not match.';
            return;
        }
        if (password.length < 6) { // Basic password length validation
            errorElement.textContent = 'Password must be at least 6 characters long.';
            return;
        }

        const registrationResult = register(username, password);
        if (registrationResult.success) {
            // Auto-login the user after successful registration
            if (login(username, password)) {
                 UI.updateNavbar();
                 Router.navigateTo('home'); // Or profile page
            } else {
                // This case should ideally not happen if registration and login logic are correct
                errorElement.textContent = 'Registration successful, but auto-login failed. Please try logging in manually.';
                Router.navigateTo('login');
            }
        } else {
            errorElement.textContent = registrationResult.message || 'Registration failed.';
        }
    }

    function logout() {
        Data.setCurrentUser(null); // Clear current user from Data module & localStorage
        console.log("User logged out.");
        // UI update and navigation will be handled by the caller or router
        // UI.updateNavbar();
        // Router.navigateTo('home');
    }

    // Public API
    return {
        getCurrentUser,
        login, // Expose for direct calls if needed elsewhere
        handleLogin,
        register, // Expose for direct calls
        handleRegister,
        logout
    };
})();

console.log("auth.js loaded");
