// Fitness Analysis using HuggingFace Model
const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/';
const MODEL_ID = 'facebook/bart-large-mnli';  // Using BART for text classification
const API_KEY = 'YOUR_HUGGING_FACE_API_KEY';  // Replace with your API key

export async function analyzeFitness(userData) {
    try {
        // Prepare user data for analysis
        const userProfile = {
            age: parseInt(userData.age),
            weight: parseFloat(userData.weight),
            height: parseFloat(userData.height),
            gender: userData.gender,
            activityLevel: userData.activityLevel,
            fitnessGoal: userData.fitnessGoal,
            exerciseHours: parseInt(userData.exerciseHours)
        };

        // Calculate BMI
        const bmi = calculateBMI(userProfile.weight, userProfile.height);
        
        // Calculate daily calorie needs
        const dailyCalories = calculateDailyCalories(userProfile);
        
        // Generate fitness analysis using HuggingFace model
        const analysis = await generateFitnessAnalysis(userProfile);
        
        return {
            bmi,
            dailyCalories,
            macroSplit: calculateMacroSplit(userProfile.fitnessGoal),
            mealTiming: generateMealTiming(userProfile.activityLevel),
            recommendations: analysis.recommendations,
            weeklyPlan: generateWeeklyPlan(dailyCalories, analysis)
        };
    } catch (error) {
        console.error('Error in fitness analysis:', error);
        throw error;
    }
}

function calculateBMI(weight, height) {
    // Height in meters
    const heightInM = height / 100;
    return (weight / (heightInM * heightInM)).toFixed(1);
}

function calculateDailyCalories(profile) {
    // Harris-Benedict Formula
    let bmr;
    if (profile.gender === 'male') {
        bmr = 88.362 + (13.397 * profile.weight) + (4.799 * profile.height) - (5.677 * profile.age);
    } else {
        bmr = 447.593 + (9.247 * profile.weight) + (3.098 * profile.height) - (4.330 * profile.age);
    }

    // Activity multiplier
    const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        very: 1.725,
        extreme: 1.9
    };

    let calories = bmr * activityMultipliers[profile.activityLevel];

    // Adjust based on goal
    switch (profile.fitnessGoal) {
        case 'weight-loss':
            calories *= 0.8;  // 20% deficit
            break;
        case 'muscle-gain':
            calories *= 1.1;  // 10% surplus
            break;
    }

    return Math.round(calories);
}

function calculateMacroSplit(goal) {
    switch (goal) {
        case 'weight-loss':
            return { protein: 40, carbs: 25, fats: 35 };
        case 'muscle-gain':
            return { protein: 30, carbs: 50, fats: 20 };
        case 'maintenance':
            return { protein: 30, carbs: 40, fats: 30 };
        case 'endurance':
            return { protein: 20, carbs: 60, fats: 20 };
        default:
            return { protein: 30, carbs: 40, fats: 30 };
    }
}

function generateMealTiming(activityLevel) {
    const baseMeals = {
        morning: { time: '08:00', portion: 0.25 },
        afternoon: { time: '13:00', portion: 0.35 },
        evening: { time: '16:00', portion: 0.15 },
        night: { time: '20:00', portion: 0.25 }
    };

    // Adjust timing based on activity level
    if (activityLevel === 'very' || activityLevel === 'extreme') {
        baseMeals.morning.time = '07:00';
        baseMeals.afternoon.time = '12:30';
        baseMeals.evening.time = '15:30';
        baseMeals.night.time = '19:30';
    }

    return baseMeals;
}

async function generateFitnessAnalysis(profile) {
    try {
        // Prepare context for the model
        const context = `
            User Profile:
            - Age: ${profile.age}
            - Weight: ${profile.weight}kg
            - Height: ${profile.height}cm
            - Activity Level: ${profile.activityLevel}
            - Fitness Goal: ${profile.fitnessGoal}
            - Exercise Hours: ${profile.exerciseHours} per week
        `;

        // Make API call to HuggingFace
        const response = await fetch(`${HUGGING_FACE_API}${MODEL_ID}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: context,
                parameters: {
                    max_length: 500,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get analysis from HuggingFace');
        }

        const result = await response.json();
        
        // Process and structure the recommendations
        return {
            recommendations: processRecommendations(result[0].generated_text)
        };
    } catch (error) {
        console.error('Error generating fitness analysis:', error);
        // Fallback to basic recommendations if API fails
        return {
            recommendations: generateBasicRecommendations(profile)
        };
    }
}

function generateBasicRecommendations(profile) {
    const recommendations = {
        workout: [],
        nutrition: [],
        lifestyle: []
    };

    // Basic workout recommendations
    switch (profile.fitnessGoal) {
        case 'weight-loss':
            recommendations.workout.push(
                'Include 30 minutes of cardio 3-4 times per week',
                'Add strength training 2-3 times per week'
            );
            break;
        case 'muscle-gain':
            recommendations.workout.push(
                'Focus on compound exercises 4-5 times per week',
                'Limit cardio to 20 minutes for warm-up'
            );
            break;
    }

    // Basic nutrition recommendations
    recommendations.nutrition.push(
        'Stay hydrated with 2-3 liters of water daily',
        'Eat protein with every meal',
        'Include vegetables in at least two meals'
    );

    // Basic lifestyle recommendations
    recommendations.lifestyle.push(
        'Aim for 7-8 hours of sleep',
        'Take rest days between workouts',
        'Track your progress weekly'
    );

    return recommendations;
}

function generateWeeklyPlan(dailyCalories, analysis) {
    // Generate a weekly meal plan based on daily calories and analysis
    const weeklyPlan = {
        monday: generateDayMeals(dailyCalories, 'monday'),
        tuesday: generateDayMeals(dailyCalories, 'tuesday'),
        wednesday: generateDayMeals(dailyCalories, 'wednesday'),
        thursday: generateDayMeals(dailyCalories, 'thursday'),
        friday: generateDayMeals(dailyCalories, 'friday'),
        saturday: generateDayMeals(dailyCalories, 'saturday'),
        sunday: generateDayMeals(dailyCalories, 'sunday')
    };

    return weeklyPlan;
}

function generateDayMeals(dailyCalories, day) {
    // This would typically connect to a food database
    // For now, returning a structured template
    return {
        morning: {
            calories: Math.round(dailyCalories * 0.25),
            suggestions: [
                {
                    name: "Oatmeal with fruits",
                    price: 150,
                    restaurant: "Healthy Bites",
                    delivery: true
                },
                {
                    name: "Egg white sandwich",
                    price: 180,
                    restaurant: "Fresh & Fit",
                    delivery: true
                }
            ]
        },
        afternoon: {
            calories: Math.round(dailyCalories * 0.35),
            suggestions: [
                {
                    name: "Grilled chicken salad",
                    price: 250,
                    restaurant: "Green Bowl",
                    delivery: true
                },
                {
                    name: "Quinoa bowl",
                    price: 220,
                    restaurant: "Nutrition Hub",
                    delivery: true
                }
            ]
        },
        evening: {
            calories: Math.round(dailyCalories * 0.15),
            suggestions: [
                {
                    name: "Protein smoothie",
                    price: 120,
                    restaurant: "Juice Bar",
                    delivery: true
                },
                {
                    name: "Greek yogurt parfait",
                    price: 150,
                    restaurant: "Health Cafe",
                    delivery: true
                }
            ]
        },
        night: {
            calories: Math.round(dailyCalories * 0.25),
            suggestions: [
                {
                    name: "Grilled fish with vegetables",
                    price: 300,
                    restaurant: "Fresh Catch",
                    delivery: true
                },
                {
                    name: "Turkey wrap",
                    price: 220,
                    restaurant: "Lean Meals",
                    delivery: true
                }
            ]
        }
    };
}
