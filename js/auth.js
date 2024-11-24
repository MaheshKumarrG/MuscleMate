const API_URL = 'http://localhost:8080/api';

// Modal handling
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'flex';
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'none';
}

function closeModalOnOutsideClick(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Handle signup
async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;

    // Validate inputs
    if (!name || !email || !password || !confirmPassword) {
        alert('All fields are required');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Close modal
            hideModal('signup-modal');
            
            // Redirect to onboarding
            window.location.href = '/pages/onboarding.html';
        } else {
            // Show specific error message from server
            const errorMessage = data.error || 'Error during signup';
            console.error('Signup error:', errorMessage);
            alert(errorMessage);
        }
    } catch (error) {
        console.error('Network error during signup:', error);
        alert('Network error during signup. Please check your connection and try again.');
    }
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;

    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            // Close modal
            hideModal('signin-modal');

            // Check if user has completed onboarding
            const userResponse = await fetch(`${API_URL}/user`, {
                headers: {
                    'Authorization': data.token
                }
            });
            const userData = await userResponse.json();

            if (userData.user.onboardingCompleted) {
                window.location.href = '/'; // Go to main page
            } else {
                window.location.href = '/pages/onboarding.html'; // Go to onboarding
            }
        } else {
            alert(data.error || 'Invalid credentials');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error during login. Please try again.');
    }
}

// Update UI for logged-in user
function updateUIForLoggedInUser(user) {
    const authButtons = document.querySelector('.auth-buttons');
    const userMenu = document.querySelector('.user-menu');
    
    if (authButtons && userMenu) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        document.getElementById('user-name').textContent = user.name;
    }
}

// Handle logout
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Check auth status on page load
function checkAuthStatus() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

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
    window.onclick = function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };

    // Check auth status
    checkAuthStatus();
});
