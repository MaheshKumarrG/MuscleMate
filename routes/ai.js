const express = require('express');
const router = express.Router();
require('dotenv').config();

// Function to call Ollama API
async function analyzeWithOllama(imageData) {
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama2",
                prompt: `Analyze this food image (base64: ${imageData}) and provide:
                1. Name of the food items visible in the image
                2. Estimated calories for each item and total
                3. Nutritional breakdown (protein, carbs, fats, fiber)
                4. Health rating (good/moderate/poor)
                5. Health benefits
                6. Potential concerns or allergens
                7. Suggestions for making it healthier`,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Ollama API error:', error);
        throw error;
    }
}

// Analyze food image
router.post('/analyze-image', async (req, res) => {
    try {
        const { imageData } = req.body;
        
        // Try Ollama first
        try {
            const analysis = await analyzeWithOllama(imageData);
            return res.json({ analysis });
        } catch (ollamaError) {
            console.error('Ollama failed, falling back to Groq:', ollamaError);
            
            // Fallback to Groq
            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "mixtral-8x7b-32768",
                    messages: [
                        {
                            role: "system",
                            content: "You are a nutritional analysis expert."
                        },
                        {
                            role: "user",
                            content: `Analyze this food and provide:
                            1. Identify the food items
                            2. Estimated calories for each item and total
                            3. Nutritional breakdown (protein, carbs, fats, fiber)
                            4. Health rating (good/moderate/poor)
                            5. Health benefits
                            6. Potential concerns or allergens
                            7. Suggestions for making it healthier`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 1024
                })
            });

            if (!groqResponse.ok) {
                throw new Error(`Groq API error: ${groqResponse.status}`);
            }

            const groqData = await groqResponse.json();
            return res.json({ analysis: groqData.choices[0].message.content });
        }
    } catch (error) {
        console.error('Error analyzing image:', error);
        res.status(500).json({ error: error.message });
    }
});

// Analyze ingredients
router.post('/analyze-ingredients', async (req, res) => {
    try {
        const { ingredients } = req.body;
        
        const prompt = `Analyze these ingredients and provide: 
            1. Total calories
            2. Nutritional breakdown (protein, carbs, fats)
            3. Health benefits
            4. Potential concerns or allergies
            5. Suggested complementary ingredients
            
            Ingredients: ${ingredients}`;

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error analyzing ingredients:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
