// Fitness Analysis using HuggingFace Model
const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/';
const MODEL_ID = 'facebook/bart-large-mnli';  // Using BART for text classification
const API_KEY = 'YOUR_HUGGING_FACE_API_KEY';  // Replace with your API key

import { generateAIMealPlan } from './ai-meal-planner.js';

export async function analyzeFitness() {
    try {
        // Get user data from local storage
        const storedUserData = localStorage.getItem('userProfile');
        if (!storedUserData) {
            return {
                dietType: 'balanced',
                fitnessGoal: 'maintenance',
                dailyCalories: 2000,
                macroSplit: {
                    protein: 30,
                    carbs: 40,
                    fats: 30
                },
                mealTiming: {
                    breakfast: '8:00 AM',
                    lunch: '1:00 PM',
                    snack: '4:30 PM',
                    dinner: '8:00 PM'
                }
            };
        }

        const userData = JSON.parse(storedUserData);
        
        // Prepare user data for analysis
        const userProfile = {
            age: parseInt(userData.age) || 25,
            weight: parseFloat(userData.weight) || 70,
            height: parseFloat(userData.height) || 170,
            gender: userData.gender || 'male',
            activityLevel: userData.activityLevel || 'moderate',
            fitnessGoal: userData.fitnessGoal || 'maintenance',
            exerciseHours: parseInt(userData.exerciseHours) || 3,
            dietType: userData.dietType || 'balanced'
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
            dietType: userProfile.dietType,
            fitnessGoal: userProfile.fitnessGoal,
            macroSplit: calculateMacroSplit(userProfile.fitnessGoal),
            mealTiming: generateMealTiming(userProfile.activityLevel),
            recommendations: analysis.recommendations,
            weeklyPlan: generateWeeklyPlan(dailyCalories, analysis)
        };
    } catch (error) {
        console.error('Error in fitness analysis:', error);
        // Return default values if there's an error
        return {
            dietType: 'balanced',
            fitnessGoal: 'maintenance',
            dailyCalories: 2000,
            macroSplit: {
                protein: 30,
                carbs: 40,
                fats: 30
            },
            mealTiming: {
                breakfast: '8:00 AM',
                lunch: '1:00 PM',
                snack: '4:30 PM',
                dinner: '8:00 PM'
            }
        };
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

    // Activity multipliers
    const activityMultipliers = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        veryActive: 1.9
    };

    let calories = bmr * activityMultipliers[profile.activityLevel];

    // Adjust based on fitness goal
    switch (profile.fitnessGoal) {
        case 'weight-loss':
            calories *= 0.8; // 20% deficit
            break;
        case 'muscle-gain':
            calories *= 1.1; // 10% surplus
            break;
    }

    return Math.round(calories);
}

function calculateMacroSplit(goal) {
    switch (goal) {
        case 'weight-loss':
            return {
                protein: 40,
                carbs: 30,
                fats: 30
            };
        case 'muscle-gain':
            return {
                protein: 35,
                carbs: 45,
                fats: 20
            };
        default:
            return {
                protein: 30,
                carbs: 40,
                fats: 30
            };
    }
}

function generateMealTiming(activityLevel) {
    // Default meal timing
    return {
        breakfast: '8:00 AM',
        lunch: '1:00 PM',
        snack: '4:30 PM',
        dinner: '8:00 PM'
    };
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
            recommendations: processRecommendations(result[0].generated_text),
            userProfile: profile
        };
    } catch (error) {
        console.error('Error generating fitness analysis:', error);
        // Fallback to basic recommendations if API fails
        return {
            recommendations: generateBasicRecommendations(profile),
            userProfile: profile
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

async function generateDayMeals(dailyCalories, day, userData) {
    try {
        // Use AI to generate personalized meal plan
        const aiMealPlan = await generateAIMealPlan(userData);
        return aiMealPlan;
    } catch (error) {
        console.error('Error generating AI meal plan:', error);
        // Fallback to basic meal plan if AI fails
        return {
            morning: {
                calories: Math.round(dailyCalories * 0.25),
                suggestions: [
                    {
                        name: "Oats with banana and milk",
                        price: 60,
                        restaurant: "Healthy Bites",
                        delivery: true
                    }
                ]
            },
            afternoon: {
                calories: Math.round(dailyCalories * 0.35),
                suggestions: [
                    {
                        name: "Dal rice with vegetables",
                        price: 80,
                        restaurant: "Home Kitchen",
                        delivery: true
                    }
                ]
            },
            evening: {
                calories: Math.round(dailyCalories * 0.15),
                suggestions: [
                    {
                        name: "Mixed sprouts salad",
                        price: 40,
                        restaurant: "Fresh & Healthy",
                        delivery: true
                    }
                ]
            },
            night: {
                calories: Math.round(dailyCalories * 0.25),
                suggestions: [
                    {
                        name: "Rice with dal and vegetables",
                        price: 90,
                        restaurant: "Home Kitchen",
                        delivery: true
                    }
                ]
            }
        };
    }
}

function generateWeeklyPlan(dailyCalories, analysis) {
    // Generate a weekly meal plan based on daily calories and analysis
    const weeklyPlan = {
        monday: generateDayMeals(dailyCalories, 'monday', analysis.userProfile),
        tuesday: generateDayMeals(dailyCalories, 'tuesday', analysis.userProfile),
        wednesday: generateDayMeals(dailyCalories, 'wednesday', analysis.userProfile),
        thursday: generateDayMeals(dailyCalories, 'thursday', analysis.userProfile),
        friday: generateDayMeals(dailyCalories, 'friday', analysis.userProfile),
        saturday: generateDayMeals(dailyCalories, 'saturday', analysis.userProfile),
        sunday: generateDayMeals(dailyCalories, 'sunday', analysis.userProfile)
    };

    return weeklyPlan;
}
