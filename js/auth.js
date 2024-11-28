// API configuration
const API_URL = 'http://localhost:5000/api';

// Modal handling
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeModalOnOutsideClick(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();
    
    try {
        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;

        // Validate inputs
        if (!name || !email || !password || !confirmPassword) {
            showError('All fields are required');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters long');
            return;
        }

        // Show loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Signing up...';

        console.log('Sending signup request to:', `${API_URL}/auth/signup`);
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Invalid response from server');
        }

        if (!response.ok) {
            throw new Error(data.error || 'Failed to sign up');
        }

        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Update UI
        updateUIForLoggedInUser(data.user);
        hideModal('signup-modal');

        // Clear form
        event.target.reset();

        // Show success message
        showSuccess('Successfully signed up! Redirecting to onboarding...');

        // Redirect to onboarding
        setTimeout(() => {
            window.location.href = '/pages/onboarding.html';
        }, 1500);
    } catch (error) {
        console.error('Signup error:', error);
        showError(error.message || 'Failed to sign up. Please try again.');
    } finally {
        // Reset button state
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Sign Up';
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    try {
        const email = document.getElementById('signin-email').value.trim();
        const password = document.getElementById('signin-password').value;

        if (!email || !password) {
            showError('Email and password are required');
            return;
        }

        // Show loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Signing in...';

        console.log('Sending login request to:', `${API_URL}/auth/login`);
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        let data;
        try {
            data = await response.json();
        } catch (e) {
            throw new Error('Invalid response from server');
        }

        if (!response.ok) {
            throw new Error(data.error || 'Failed to log in');
        }

        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Update UI
        updateUIForLoggedInUser(data.user);
        hideModal('signin-modal');

        // Clear form
        event.target.reset();

        // Show success message
        showSuccess('Successfully logged in! Redirecting...');

        // Check if user has completed onboarding
        const userResponse = await fetch(`${API_URL}/user`, {
            headers: {
                'Authorization': `Bearer ${data.token}`,
                'Accept': 'application/json'
            }
        });

        let userData;
        try {
            userData = await userResponse.json();
        } catch (e) {
            throw new Error('Invalid response from server');
        }

        if (!userResponse.ok) {
            throw new Error(userData.error || 'Failed to fetch user data');
        }

        // Redirect based on onboarding status
        setTimeout(() => {
            if (userData.user.onboardingCompleted) {
                window.location.href = '/pages/dashboard.html';
            } else {
                window.location.href = '/pages/onboarding.html';
            }
        }, 1500);
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Failed to log in. Please try again.');
    } finally {
        // Reset button state
        const submitButton = event.target.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = 'Sign In';
    }
}

// Update UI for logged-in user
function updateUIForLoggedInUser(user) {
    const signInBtn = document.querySelector('.signin-btn');
    const signUpBtn = document.querySelector('.signup-btn');
    const navLinks = document.querySelector('.nav-links');

    if (signInBtn && signUpBtn) {
        signInBtn.style.display = 'none';
        signUpBtn.style.display = 'none';

        // Add user menu
        const userMenu = document.createElement('div');
        userMenu.className = 'user-menu';
        userMenu.innerHTML = `
            <span>Welcome, ${user.name}</span>
            <button onclick="handleLogout()">Logout</button>
        `;
        navLinks.appendChild(userMenu);
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-error';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);

    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Show success message
function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'alert alert-success';
    successDiv.textContent = message;
    document.body.appendChild(successDiv);

    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

// Check auth status on page load
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (token && user) {
        updateUIForLoggedInUser(user);
    }
}

// Initialize auth
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners to forms
    const signupForm = document.getElementById('signup-form');
    const signinForm = document.getElementById('signin-form');

    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    if (signinForm) {
        signinForm.addEventListener('submit', handleLogin);
    }

    // Add event listeners to modals
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', closeModalOnOutsideClick);
    });

    // Check auth status
    checkAuthStatus();
});
