const express = require('express');
const cors = require('cors');
const path = require('path');
const imageAnalysisRoutes = require('./routes/image-analysis');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));
app.use(express.static('pages'));

// Basic route for testing
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

// Routes
app.use('/api', imageAnalysisRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ 
        error: 'Something went wrong!',
        details: err.message
    });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
