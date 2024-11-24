const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const sharp = require('sharp');

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Local food database
const foodDatabase = {
    'pizza': { calories: 266, protein: 11, carbs: 33, fat: 10, fiber: 2.2 },
    'burger': { calories: 295, protein: 15, carbs: 30, fat: 12, fiber: 1.5 },
    'salad': { calories: 100, protein: 3, carbs: 10, fat: 2, fiber: 4 },
    'pasta': { calories: 158, protein: 6, carbs: 43, fat: 1, fiber: 2.5 },
    'rice': { calories: 130, protein: 3, carbs: 28, fat: 0.3, fiber: 0.4 },
    'chicken': { calories: 239, protein: 27, carbs: 0, fat: 14, fiber: 0 },
    'fish': { calories: 206, protein: 22, carbs: 0, fat: 12, fiber: 0 },
    'soup': { calories: 85, protein: 4, carbs: 15, fat: 3, fiber: 2 },
    'sandwich': { calories: 250, protein: 13, carbs: 28, fat: 8, fiber: 2 },
    'default': { calories: 200, protein: 10, carbs: 25, fat: 8, fiber: 2 }
};

async function processImage(buffer) {
    try {
        const processedImage = await sharp(buffer)
            .resize(224, 224)
            .jpeg({ quality: 80 })
            .toBuffer();
        return processedImage;
    } catch (error) {
        console.error('Error processing image:', error);
        throw error;
    }
}

async function getNutritionalData(foodName, weight) {
    try {
        // Try OpenFoodFacts API
        const response = await axios.get(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&json=1`);
        
        if (response.data.products && response.data.products.length > 0) {
            const product = response.data.products[0];
            const nutriments = product.nutriments;

            if (nutriments['energy-kcal_100g']) {
                return {
                    calories: (nutriments['energy-kcal_100g'] * weight / 100) || 0,
                    protein: (nutriments.proteins_100g * weight / 100) || 0,
                    carbs: (nutriments.carbohydrates_100g * weight / 100) || 0,
                    fat: (nutriments.fat_100g * weight / 100) || 0,
                    fiber: (nutriments.fiber_100g * weight / 100) || 0
                };
            }
        }

        // Fallback to local database
        const foodData = foodDatabase[foodName.toLowerCase()] || foodDatabase.default;
        return {
            calories: (foodData.calories * weight / 100),
            protein: (foodData.protein * weight / 100),
            carbs: (foodData.carbs * weight / 100),
            fat: (foodData.fat * weight / 100),
            fiber: (foodData.fiber * weight / 100)
        };
    } catch (error) {
        console.error('Error fetching nutritional data:', error);
        // Fallback to local database
        const foodData = foodDatabase[foodName.toLowerCase()] || foodDatabase.default;
        return {
            calories: (foodData.calories * weight / 100),
            protein: (foodData.protein * weight / 100),
            carbs: (foodData.carbs * weight / 100),
            fat: (foodData.fat * weight / 100),
            fiber: (foodData.fiber * weight / 100)
        };
    }
}

function calculateHealthScore(nutrition) {
    let score = 70; // Base score

    // Prevent division by zero
    if (nutrition.calories === 0) return score;

    // Calculate macronutrient percentages
    const totalCals = nutrition.calories;
    const proteinCals = nutrition.protein * 4;
    const carbsCals = nutrition.carbs * 4;
    const fatCals = nutrition.fat * 9;

    // Protein score (ideal: 20-30% of total calories)
    const proteinPercentage = (proteinCals / totalCals) * 100;
    if (proteinPercentage >= 20 && proteinPercentage <= 30) score += 10;
    else if (proteinPercentage > 30) score += 5;
    else score -= 5;

    // Carbs score (ideal: 45-65% of total calories)
    const carbsPercentage = (carbsCals / totalCals) * 100;
    if (carbsPercentage >= 45 && carbsPercentage <= 65) score += 10;
    else if (carbsPercentage < 45) score -= 5;
    else score -= 10;

    // Fat score (ideal: 20-35% of total calories)
    const fatPercentage = (fatCals / totalCals) * 100;
    if (fatPercentage >= 20 && fatPercentage <= 35) score += 10;
    else if (fatPercentage > 35) score -= 10;
    else score -= 5;

    // Fiber bonus
    if (nutrition.fiber >= 4) score += 10;
    else if (nutrition.fiber >= 2) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
}

function generateRecommendations(healthScore, nutrition) {
    const recommendations = [];

    if (healthScore < 50) {
        recommendations.push('Consider choosing more nutrient-dense foods');
    }

    if (nutrition.protein < 20) {
        recommendations.push('Try adding more protein-rich foods to your meal');
    }

    if (nutrition.fiber < 3) {
        recommendations.push('Include more fiber-rich foods like vegetables or whole grains');
    }

    if (healthScore >= 80) {
        recommendations.push('Great choice! This meal has a good balance of nutrients');
    }

    return recommendations;
}

router.post('/analyze-food-image', upload.single('image'), async (req, res) => {
    try {
        console.log('Received request:', {
            body: req.body,
            file: req.file ? 'File received' : 'No file'
        });

        if (!req.file && !req.body.dishName) {
            return res.status(400).json({ error: 'Please provide an image or dish name' });
        }

        const weight = parseFloat(req.body.weight) || 100;
        let foodName = req.body.dishName;

        console.log('Processing request for:', {
            foodName,
            weight
        });

        // If image is provided, process it
        if (req.file) {
            const processedImage = await processImage(req.file.buffer);
            // Add AI image analysis here if needed
        }

        // Get nutritional data
        const nutritionData = await getNutritionalData(foodName, weight);
        
        console.log('Nutritional data:', nutritionData);

        // Calculate health score
        const healthScore = calculateHealthScore(nutritionData);

        // Generate recommendations
        const recommendations = generateRecommendations(healthScore, nutritionData);

        // Send response
        res.json({
            foodName: foodName,
            weight: weight,
            ...nutritionData,
            healthScore: healthScore,
            recommendations: recommendations
        });

    } catch (error) {
        console.error('Error analyzing food:', error);
        res.status(500).json({ 
            error: 'Failed to analyze food',
            details: error.message 
        });
    }
});

module.exports = router;
