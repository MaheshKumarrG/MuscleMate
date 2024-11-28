// AI-Powered Meal Planning System using HuggingFace
const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/';
const MODEL_ID = 'facebook/bart-large-mnli';  // Using BART for text classification
const API_KEY = 'YOUR_HUGGING_FACE_API_KEY';  // Replace with your API key

// Meal database for fallback and suggestions
const mealDatabase = {
    vegetarian: {
        breakfast: [
            { name: "Masala Dosa with Sambar", price: 60, restaurant: "South Indian Kitchen", protein: 8, calories: 400 },
            { name: "Oatmeal with Fruits and Nuts", price: 50, restaurant: "Health Cafe", protein: 10, calories: 350 },
            { name: "Poha with Peanuts", price: 40, restaurant: "Mumbai Kitchen", protein: 7, calories: 300 }
        ],
        lunch: [
            { name: "Dal Rice with Mixed Vegetables", price: 90, restaurant: "Home Kitchen", protein: 15, calories: 500 },
            { name: "Paneer Butter Masala with Roti", price: 120, restaurant: "Punjab Kitchen", protein: 20, calories: 550 },
            { name: "Vegetable Biryani", price: 100, restaurant: "Paradise", protein: 12, calories: 450 }
        ],
        snack: [
            { name: "Sprouts Chaat", price: 50, restaurant: "Healthy Bites", protein: 7, calories: 300 },
            { name: "Mixed Nuts and Dried Fruits", price: 60, restaurant: "Nature's Basket", protein: 8, calories: 280 },
            { name: "Vegetable Sandwich", price: 45, restaurant: "Quick Bites", protein: 6, calories: 250 }
        ],
        dinner: [
            { name: "Paneer Tikka with Roti", price: 100, restaurant: "North Indian Kitchen", protein: 18, calories: 450 },
            { name: "Mixed Vegetable Curry with Rice", price: 90, restaurant: "Home Style", protein: 14, calories: 400 },
            { name: "Quinoa Bowl with Roasted Veggies", price: 110, restaurant: "Health Hub", protein: 16, calories: 380 }
        ]
    },
    nonVegetarian: {
        breakfast: [
            { name: "Egg Omelette with Toast", price: 60, restaurant: "Breakfast Club", protein: 15, calories: 400 },
            { name: "Chicken Sandwich", price: 70, restaurant: "Quick Bites", protein: 18, calories: 450 },
            { name: "Egg Bhurji with Paratha", price: 65, restaurant: "North Indian Kitchen", protein: 16, calories: 420 }
        ],
        lunch: [
            { name: "Chicken Rice Bowl", price: 110, restaurant: "Bowl Company", protein: 25, calories: 500 },
            { name: "Fish Curry with Rice", price: 130, restaurant: "Coastal Kitchen", protein: 22, calories: 480 },
            { name: "Chicken Biryani", price: 120, restaurant: "Paradise", protein: 24, calories: 550 }
        ],
        snack: [
            { name: "Grilled Chicken Sandwich", price: 80, restaurant: "Healthy Bites", protein: 15, calories: 300 },
            { name: "Chicken Roll", price: 70, restaurant: "Roll House", protein: 14, calories: 320 },
            { name: "Protein Shake", price: 60, restaurant: "Fitness Cafe", protein: 20, calories: 250 }
        ],
        dinner: [
            { name: "Grilled Fish with Rice", price: 140, restaurant: "Seafood Kitchen", protein: 24, calories: 450 },
            { name: "Chicken Curry with Roti", price: 120, restaurant: "Home Style", protein: 22, calories: 480 },
            { name: "Mutton Curry with Rice", price: 150, restaurant: "Spice Kitchen", protein: 26, calories: 520 }
        ]
    }
};

async function query(data) {
    const response = await fetch(
        `${HUGGING_FACE_API}${MODEL_ID}`,
        {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify(data)
        }
    );
    const result = await response.json();
    return result;
}

async function generateAIMealPlan(userData) {
    try {
        const weeklyPlan = {};
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        
        // Generate context for AI model
        const userContext = `
            Diet type: ${userData.dietType}
            Fitness goal: ${userData.fitnessGoal}
            Daily calorie target: ${userData.calorieTarget}
            Preferences: Indian cuisine
            Restrictions: None
        `;

        // Get AI recommendations for the week
        const aiRecommendations = await query({
            inputs: [
                userContext,
                "Generate personalized meal recommendations"
            ]
        });

        for (const day of days) {
            const dayPlan = await generateAIDayMealPlan(userData, aiRecommendations);
            weeklyPlan[day] = dayPlan;
        }

        return weeklyPlan;
    } catch (error) {
        console.error('Error generating AI meal plan:', error);
        return generateFallbackWeeklyPlan(userData);
    }
}

async function generateAIDayMealPlan(userData, aiRecommendations) {
    try {
        const isVegetarian = userData.dietType === 'vegetarian' || userData.dietType === 'vegan';
        const isWeightLoss = userData.fitnessGoal === 'weight-loss';
        const calorieMultiplier = isWeightLoss ? 0.8 : 1;
        const mealType = isVegetarian ? 'vegetarian' : 'nonVegetarian';

        // Get AI suggestions for meal timing
        const timingPrompt = `Suggest optimal meal timings for ${userData.fitnessGoal} goal`;
        const timingResponse = await query({
            inputs: [userData.fitnessGoal, timingPrompt]
        });

        const meals = {
            breakfast: {
                time: timingResponse?.breakfast_time || '8:00 AM',
                calories: Math.round(400 * calorieMultiplier),
                suggestions: [getRandomMeal(mealDatabase[mealType].breakfast, calorieMultiplier)]
            },
            lunch: {
                time: timingResponse?.lunch_time || '1:00 PM',
                calories: Math.round(500 * calorieMultiplier),
                suggestions: [getRandomMeal(mealDatabase[mealType].lunch, calorieMultiplier)]
            },
            snack: {
                time: timingResponse?.snack_time || '4:30 PM',
                calories: Math.round(300 * calorieMultiplier),
                suggestions: [getRandomMeal(mealDatabase[mealType].snack, calorieMultiplier)]
            },
            dinner: {
                time: timingResponse?.dinner_time || '8:00 PM',
                calories: Math.round(450 * calorieMultiplier),
                suggestions: [getRandomMeal(mealDatabase[mealType].dinner, calorieMultiplier)]
            }
        };

        // Calculate totals
        const totalCalories = Object.values(meals).reduce((sum, meal) => sum + meal.calories, 0);
        const totalProtein = Object.values(meals).reduce((sum, meal) => sum + meal.suggestions[0].protein, 0);
        const totalCost = Object.values(meals).reduce((sum, meal) => sum + meal.suggestions[0].price, 0);

        // Get AI-generated recommendations
        const recommendationPrompt = `Generate personalized diet recommendations for ${userData.fitnessGoal} goal with ${totalCalories} daily calories`;
        const recommendations = await query({
            inputs: [userData.fitnessGoal, recommendationPrompt]
        });

        return {
            ...meals,
            totalCalories,
            totalProtein,
            totalCost,
            recommendations: recommendations || [
                "Try to eat at fixed times each day",
                "Drink water 30 minutes before each meal",
                "Include protein in every meal",
                "Avoid heavy meals close to bedtime"
            ]
        };
    } catch (error) {
        console.error('Error generating AI day meal plan:', error);
        return generateDayMealPlan(userData);
    }
}

function getRandomMeal(meals, calorieMultiplier) {
    const meal = meals[Math.floor(Math.random() * meals.length)];
    return {
        ...meal,
        calories: Math.round(meal.calories * calorieMultiplier),
        delivery: true
    };
}

function generateFallbackWeeklyPlan(userData) {
    const weeklyPlan = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of days) {
        weeklyPlan[day] = generateDayMealPlan(userData);
    }
    
    return weeklyPlan;
}

// Original generateDayMealPlan function kept as fallback
function generateDayMealPlan(userData) {
    const isVegetarian = userData.dietType === 'vegetarian' || userData.dietType === 'vegan';
    const isWeightLoss = userData.fitnessGoal === 'weight-loss';
    const calorieMultiplier = isWeightLoss ? 0.8 : 1;
    const mealType = isVegetarian ? 'vegetarian' : 'nonVegetarian';
    
    const meals = {
        breakfast: {
            time: '8:00 AM',
            calories: Math.round(400 * calorieMultiplier),
            suggestions: [getRandomMeal(mealDatabase[mealType].breakfast, calorieMultiplier)]
        },
        lunch: {
            time: '1:00 PM',
            calories: Math.round(500 * calorieMultiplier),
            suggestions: [getRandomMeal(mealDatabase[mealType].lunch, calorieMultiplier)]
        },
        snack: {
            time: '4:30 PM',
            calories: Math.round(300 * calorieMultiplier),
            suggestions: [getRandomMeal(mealDatabase[mealType].snack, calorieMultiplier)]
        },
        dinner: {
            time: '8:00 PM',
            calories: Math.round(450 * calorieMultiplier),
            suggestions: [getRandomMeal(mealDatabase[mealType].dinner, calorieMultiplier)]
        }
    };

    const totalCalories = Object.values(meals).reduce((sum, meal) => sum + meal.calories, 0);
    const totalProtein = Object.values(meals).reduce((sum, meal) => sum + meal.suggestions[0].protein, 0);
    const totalCost = Object.values(meals).reduce((sum, meal) => sum + meal.suggestions[0].price, 0);

    return {
        ...meals,
        totalCalories,
        totalProtein,
        totalCost,
        recommendations: [
            "Try to eat at fixed times each day",
            "Drink water 30 minutes before each meal",
            "Include protein in every meal",
            "Avoid heavy meals close to bedtime"
        ]
    };
}

export { generateAIMealPlan };
