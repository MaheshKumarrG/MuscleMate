// Array to store ingredients
let selectedIngredients = [];

// API Configuration
const API_KEY = "98fcefcaec9946c88abe4d975dc6d3af";
const API_BASE_URL = "https://api.spoonacular.com/recipes";

// DOM Elements
const ingredientInput = document.getElementById("ingredientInput");
const ingredientList = document.getElementById("ingredientList");
const recipeResults = document.getElementById("recipeResults");

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Add keypress event for ingredient input
    ingredientInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addIngredient();
        }
    });

    // Setup filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (selectedIngredients.length > 0) {
                fetchRecipes();
            }
        });
    });

    // Setup image upload handler
    const imageUploadInput = document.getElementById('foodImageInput');
    if (imageUploadInput) {
        imageUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                analyzeImage(file);
            }
        });
    }
});

function addIngredient() {
    const ingredient = ingredientInput.value.trim();
    if (!ingredient) return;

    if (!selectedIngredients.includes(ingredient)) {
        selectedIngredients.push(ingredient);
        updateIngredientList();
        ingredientInput.value = "";
        fetchRecipes();
    }
}

function removeIngredient(ingredient) {
    selectedIngredients = selectedIngredients.filter(item => item !== ingredient);
    updateIngredientList();
    if (selectedIngredients.length > 0) {
        fetchRecipes();
    } else {
        recipeResults.innerHTML = '<p class="text-center">Add ingredients to see recipes</p>';
    }
}

function clearIngredients() {
    selectedIngredients = [];
    ingredientList.innerHTML = "";
    recipeResults.innerHTML = '<p class="text-center">Add ingredients to see recipes</p>';
}

function updateIngredientList() {
    if (!ingredientList) return;
    
    ingredientList.innerHTML = selectedIngredients.map(ingredient => `
        <li class="ingredient-item">
            ${ingredient}
            <button class="remove-btn" onclick="removeIngredient('${ingredient}')">
                <i class="fas fa-times"></i>
            </button>
        </li>
    `).join('');
}

async function fetchRecipes() {
    if (selectedIngredients.length === 0) {
        recipeResults.innerHTML = '<p class="text-center">Add ingredients to see recipes</p>';
        return;
    }

    try {
        showLoading(true);

        // First, find recipes by ingredients
        const ingredientParams = new URLSearchParams({
            apiKey: API_KEY,
            ingredients: selectedIngredients.join(','),
            number: 12,
            ranking: 2,
            ignorePantry: true,
            limitLicense: true
        });

        const response = await fetch(`${API_BASE_URL}/findByIngredients?${ingredientParams}`);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch recipes (Status: ${response.status})`);
        }
        
        const recipes = await response.json();
        
        if (!recipes.length) {
            recipeResults.innerHTML = '<p class="text-center">No recipes found with these ingredients. Try adding different ingredients.</p>';
            return;
        }

        // Get the active filter
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;

        // Fetch detailed information for each recipe
        const detailedRecipes = await Promise.all(
            recipes.map(async (recipe) => {
                try {
                    const detailParams = new URLSearchParams({
                        apiKey: API_KEY
                    });
                    
                    const detailResponse = await fetch(
                        `${API_BASE_URL}/${recipe.id}/information?${detailParams}`
                    );
                    
                    if (!detailResponse.ok) return null;
                    const detailedRecipe = await detailResponse.json();
                    
                    // Combine the ingredient matching data with detailed recipe
                    return {
                        ...detailedRecipe,
                        usedIngredientCount: recipe.usedIngredientCount,
                        missedIngredientCount: recipe.missedIngredientCount
                    };
                } catch (error) {
                    console.error(`Error fetching details for recipe ${recipe.id}:`, error);
                    return null;
                }
            })
        );

        // Filter recipes based on active filter
        let filteredRecipes = detailedRecipes.filter(recipe => recipe !== null);
        
        switch (activeFilter) {
            case 'quick':
                filteredRecipes = filteredRecipes.filter(recipe => recipe.readyInMinutes <= 30);
                break;
            case 'vegetarian':
                filteredRecipes = filteredRecipes.filter(recipe => recipe.vegetarian);
                break;
            case 'healthy':
                filteredRecipes = filteredRecipes.filter(recipe => recipe.healthScore >= 70);
                break;
        }

        displayRecipes(filteredRecipes);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        recipeResults.innerHTML = `
            <div class="error-message">
                <p>Failed to fetch recipes: ${error.message}</p>
                <button onclick="fetchRecipes()" class="btn btn-primary">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

function displayRecipes(recipes) {
    if (!recipes.length) {
        recipeResults.innerHTML = '<p class="text-center">No recipes found matching your criteria. Try different ingredients or filters.</p>';
        return;
    }

    recipeResults.innerHTML = recipes.map(recipe => `
        <div class="recipe-card">
            <div class="recipe-image">
                <img src="${recipe.image}" alt="${recipe.title}">
            </div>
            <div class="recipe-content">
                <h3>${recipe.title}</h3>
                <div class="recipe-meta">
                    <span><i class="fas fa-clock"></i> ${recipe.readyInMinutes} mins</span>
                    <span><i class="fas fa-user"></i> ${recipe.servings} servings</span>
                    <span><i class="fas fa-list"></i> Used: ${recipe.usedIngredientCount} / Missing: ${recipe.missedIngredientCount}</span>
                </div>
                <div class="recipe-tags">
                    ${recipe.vegetarian ? '<span class="tag">Vegetarian</span>' : ''}
                    ${recipe.vegan ? '<span class="tag">Vegan</span>' : ''}
                    ${recipe.glutenFree ? '<span class="tag">Gluten-Free</span>' : ''}
                    ${recipe.dairyFree ? '<span class="tag">Dairy-Free</span>' : ''}
                    ${recipe.readyInMinutes <= 30 ? '<span class="tag">Quick</span>' : ''}
                    ${recipe.healthScore >= 70 ? '<span class="tag">Healthy</span>' : ''}
                </div>
                <div class="recipe-actions">
                    <button class="btn btn-primary" onclick="showRecipeDetails(${recipe.id})">
                        View Recipe
                    </button>
                    <button class="btn btn-outline" onclick="saveRecipe(${recipe.id})">
                        <i class="far fa-bookmark"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function showRecipeDetails(recipeId) {
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            apiKey: API_KEY
        });

        const response = await fetch(`${API_BASE_URL}/${recipeId}/information?${params}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch recipe details');
        }
        
        const recipe = await response.json();
        
        // Fetch calorie information for each ingredient
        const caloriePromises = recipe.extendedIngredients.map(async (ing) => {
            try {
                const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(ing.name)}&json=1`);
                const data = await response.json();
                
                if (data.products && data.products.length > 0) {
                    const product = data.products[0];
                    const caloriesPer100g = product.nutriments['energy-kcal_100g'] || 0;
                    return {
                        name: ing.name,
                        amount: ing.amount,
                        unit: ing.unit,
                        calories: (caloriesPer100g * ing.amount) / 100
                    };
                }
                return {
                    name: ing.name,
                    amount: ing.amount,
                    unit: ing.unit,
                    calories: 0
                };
            } catch (error) {
                console.error(`Error fetching calories for ${ing.name}:`, error);
                return {
                    name: ing.name,
                    amount: ing.amount,
                    unit: ing.unit,
                    calories: 0
                };
            }
        });

        const ingredientCalories = await Promise.all(caloriePromises);
        const totalCalories = ingredientCalories.reduce((sum, ing) => sum + ing.calories, 0);
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content recipe-details">
                <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
                <div class="recipe-header">
                    <img src="${recipe.image}" alt="${recipe.title}">
                    <h2>${recipe.title}</h2>
                </div>
                <div class="recipe-info">
                    <div class="info-item">
                        <i class="fas fa-clock"></i>
                        <span>Ready in ${recipe.readyInMinutes} minutes</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-user"></i>
                        <span>${recipe.servings} servings</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-heart"></i>
                        <span>Health Score: ${recipe.healthScore}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-fire"></i>
                        <span>Estimated Calories: ${Math.round(totalCalories)} kcal</span>
                    </div>
                </div>
                <div class="recipe-sections">
                    <div class="ingredients">
                        <h3>Ingredients</h3>
                        <ul>
                            ${ingredientCalories.map(ing => `
                                <li>
                                    ${ing.amount} ${ing.unit} ${ing.name}
                                    <span class="calorie-info">(~${Math.round(ing.calories)} kcal)</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="instructions">
                        <h3>Instructions</h3>
                        <ol>
                            ${recipe.analyzedInstructions[0]?.steps.map(step => `
                                <li>${step.step}</li>
                            `).join('') || 'No instructions available'}
                        </ol>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    } catch (error) {
        console.error('Error fetching recipe details:', error);
        alert(`Failed to load recipe details: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

async function analyzeImage(imageFile) {
    try {
        showLoading(true);
        
        // First, create a FormData object to send the image
        const formData = new FormData();
        formData.append('image', imageFile);
        
        // Send image to backend for analysis
        const response = await fetch('/api/analyze-food-image', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Failed to analyze image');
        }
        
        const result = await response.json();
        displayImageAnalysis(result);
    } catch (error) {
        console.error('Error analyzing image:', error);
        alert('Failed to analyze image. Please try again.');
    } finally {
        showLoading(false);
    }
}

function displayImageAnalysis(analysis) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content food-analysis">
            <button class="close-btn" onclick="this.closest('.modal').remove()">×</button>
            <div class="analysis-header">
                <h2>Food Analysis Results</h2>
            </div>
            <div class="analysis-content">
                <div class="food-info">
                    <div class="info-item">
                        <i class="fas fa-utensils"></i>
                        <span>Detected Food: ${analysis.foodName}</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-fire"></i>
                        <span>Estimated Calories: ${analysis.calories} kcal</span>
                    </div>
                    <div class="info-item">
                        <i class="fas fa-heart"></i>
                        <span>Health Score: ${analysis.healthScore}/100</span>
                    </div>
                </div>
                
                <div class="nutrition-breakdown">
                    <h3>Nutritional Information</h3>
                    <div class="nutrition-grid">
                        ${Object.entries(analysis.nutrition).map(([nutrient, value]) => `
                            <div class="nutrient-item">
                                <span class="nutrient-name">${nutrient}</span>
                                <span class="nutrient-value">${value}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="health-insights">
                    <h3>Health Insights</h3>
                    <div class="insights-list">
                        ${analysis.healthInsights.map(insight => `
                            <div class="insight-item">
                                <i class="fas fa-${insight.type === 'positive' ? 'check-circle' : 'exclamation-circle'}"></i>
                                <span>${insight.message}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="recommendations">
                    <h3>Recommendations</h3>
                    <ul class="recommendations-list">
                        ${analysis.recommendations.map(rec => `
                            <li>${rec}</li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        if (show) {
            spinner.classList.add('active');
            recipeResults.style.opacity = '0.5';
        } else {
            spinner.classList.remove('active');
            recipeResults.style.opacity = '1';
        }
    }
}

function saveRecipe(recipeId) {
    // Implement recipe saving functionality
    console.log('Saving recipe:', recipeId);
    alert('Recipe saving feature coming soon!');
}
