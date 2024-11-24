const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Signup route
router.post('/signup', async (req, res) => {
    console.log('Received signup request:', req.body);
    try {
        const { fullName, email, password } = req.body;

        // Check if user already exists
        console.log('Checking for existing user with email:', email);
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            console.log('User already exists with email:', email);
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Create new user
        console.log('Creating new user with email:', email);
        const user = await User.create({
            fullName,
            email,
            password
        });
        console.log('User created successfully:', user.id);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('JWT token generated for user:', user.id);

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Detailed signup error:', error);
        console.error('Error stack:', error.stack);
        if (error.name === 'SequelizeValidationError') {
            return res.status(400).json({ 
                message: 'Validation error', 
                errors: error.errors.map(e => e.message)
            });
        }
        res.status(500).json({ 
            message: 'Error creating user', 
            error: error.message,
            details: error.name
        });
    }
});

// Login route
router.post('/login', async (req, res) => {
    console.log('Received login request:', req.body);
    try {
        const { email, password } = req.body;

        // Find user by email
        console.log('Looking for user with email:', email);
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log('No user found with email:', email);
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        console.log('User found:', user.id);

        // Validate password
        console.log('Validating password for user:', user.id);
        const isValidPassword = await user.validatePassword(password);
        if (!isValidPassword) {
            console.log('Invalid password for user:', user.id);
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        console.log('Password validated successfully for user:', user.id);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('JWT token generated for user:', user.id);

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Detailed login error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Error logging in', 
            error: error.message,
            details: error.name
        });
    }
});

module.exports = router;
