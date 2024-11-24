// Onboarding and Meal Plan Generation
const API_URL = 'http://localhost:8080/api';

export function initOnboarding(userData = null) {
    if (userData) {
        return processUserData(userData);
    }
    
    // Initialize form elements
    const form = document.getElementById('onboardingForm');
    if (!form) return;

    // Initialize progress tracking
    updateProgress();

    // Add form submission handler
    form.addEventListener('submit', handleOnboardingSubmit);
}

// Handle form submission
async function handleOnboardingSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = Object.fromEntries(formData);
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Please log in to continue');
            window.location.href = '/';
            return;
        }

        const response = await fetch(`${API_URL}/onboarding`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();

        if (response.ok) {
            // Store onboarding data
            localStorage.setItem('onboardingData', JSON.stringify(data));
            
            // Generate meal plan
            const mealPlan = await generateMealPlan(userData);
            localStorage.setItem('mealPlan', JSON.stringify(mealPlan));
            
            // Redirect to meal prep page
            window.location.href = '/pages/meal-prep.html';
        } else {
            alert(data.error || 'Error saving onboarding data');
        }
    } catch (error) {
        console.error('Onboarding error:', error);
        alert('Error during onboarding. Please try again.');
    }
}

// Process user data and generate meal plan
async function processUserData(userData) {
    try {
        // Calculate BMR and daily calorie needs
        const bmr = calculateBMR(userData);
        const dailyCalories = calculateDailyCalories(bmr, userData.activityLevel);
        
        // Generate meal plan
        const mealPlan = await generateMealPlan(userData, dailyCalories);
        
        // Store data for meal-prep page
        localStorage.setItem('userMealPlan', JSON.stringify(mealPlan));
        localStorage.setItem('userData', JSON.stringify(userData));
        
        return mealPlan;
    } catch (error) {
        console.error('Error processing user data:', error);
        throw error;
    }
}

// Calculate Basal Metabolic Rate (BMR)
function calculateBMR(userData) {
    const { age, gender, weight, height } = userData;
    
    // Mifflin-St Jeor Equation
    if (gender === 'male') {
        return (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
        return (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
}

// Calculate daily calorie needs based on activity level
function calculateDailyCalories(bmr, activityLevel) {
    const activityMultipliers = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'very': 1.725,
        'extra': 1.9
    };
    
    return Math.round(bmr * activityMultipliers[activityLevel]);
}

// Generate meal plan based on user data and calorie needs
async function generateMealPlan(userData, dailyCalories) {
    const { primaryGoal, dietType, allergies } = userData;
    
    // Calculate macro split based on goal
    const macros = calculateMacros(dailyCalories, primaryGoal);
    
    // Generate weekly meal plan
    const weeklyPlan = await createWeeklyPlan(dailyCalories, macros, dietType, allergies);
    
    return {
        dailyCalories,
        macros,
        weeklyPlan
    };
}

// Calculate macro split based on goal
function calculateMacros(dailyCalories, goal) {
    let proteinPerc, carbPerc, fatPerc;
    
    switch (goal) {
        case 'muscleGain':
            proteinPerc = 0.3; // 30%
            fatPerc = 0.25;    // 25%
            carbPerc = 0.45;   // 45%
            break;
        case 'weightLoss':
            proteinPerc = 0.35; // 35%
            fatPerc = 0.3;     // 30%
            carbPerc = 0.35;   // 35%
            break;
        case 'maintenance':
        default:
            proteinPerc = 0.3; // 30%
            fatPerc = 0.3;     // 30%
            carbPerc = 0.4;    // 40%
    }
    
    return {
        protein: Math.round((dailyCalories * proteinPerc) / 4), // 4 calories per gram
        carbs: Math.round((dailyCalories * carbPerc) / 4),
        fat: Math.round((dailyCalories * fatPerc) / 9)  // 9 calories per gram
    };
}

// Create weekly meal plan
async function createWeeklyPlan(dailyCalories, macros, dietType, allergies) {
    // Sample meal plan structure
    const mealPlan = {
        monday: await generateDayMeals(dailyCalories, macros, dietType, allergies),
        tuesday: await generateDayMeals(dailyCalories, macros, dietType, allergies),
        wednesday: await generateDayMeals(dailyCalories, macros, dietType, allergies),
        thursday: await generateDayMeals(dailyCalories, macros, dietType, allergies),
        friday: await generateDayMeals(dailyCalories, macros, dietType, allergies),
        saturday: await generateDayMeals(dailyCalories, macros, dietType, allergies),
        sunday: await generateDayMeals(dailyCalories, macros, dietType, allergies)
    };
    
    return mealPlan;
}

// Generate meals for a single day
async function generateDayMeals(dailyCalories, macros, dietType, allergies) {
    // This is where you'd integrate with a meal database or API
    // For now, returning sample data
    return {
        breakfast: getSampleMeal('breakfast', dailyCalories * 0.3, dietType),
        lunch: getSampleMeal('lunch', dailyCalories * 0.35, dietType),
        dinner: getSampleMeal('dinner', dailyCalories * 0.35, dietType)
    };
}

// Sample meal data (replace with actual meal database/API)
function getSampleMeal(mealType, targetCalories, dietType) {
    const meals = {
        breakfast: {
            omnivore: {
                name: "Oatmeal with Eggs",
                calories: 400,
                protein: 20,
                carbs: 45,
                fat: 15,
                ingredients: ["oats", "eggs", "banana", "almonds"],
                price: 80
            },
            vegetarian: {
                name: "Yogurt Parfait",
                calories: 350,
                protein: 15,
                carbs: 50,
                fat: 10,
                ingredients: ["yogurt", "granola", "berries", "honey"],
                price: 100
            },
            vegan: {
                name: "Tofu Scramble",
                calories: 300,
                protein: 18,
                carbs: 35,
                fat: 12,
                ingredients: ["tofu", "vegetables", "nutritional yeast", "bread"],
                price: 120
            }
        },
        // Add more meal types and options
    };
    
    return meals[mealType][dietType] || meals[mealType].omnivore;
}

// Update progress bar
function updateProgress() {
    const form = document.getElementById('onboardingForm');
    if (!form) return;
    
    const progress = document.getElementById('progress');
    if (!progress) return;
    
    // Calculate progress based on filled fields
    const requiredFields = form.querySelectorAll('[required]');
    const filledFields = Array.from(requiredFields).filter(field => field.value !== '');
    const progressPercentage = (filledFields.length / requiredFields.length) * 100;
    
    progress.style.width = `${progressPercentage}%`;
}
