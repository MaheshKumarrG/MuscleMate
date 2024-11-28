// Array to store ingredients
let selectedIngredients = [];

// Spoonacular API Key
const API_KEY = "95c7bc04c64d4546811db2c99cec735e";

function addIngredient() {
    const ingredientInput = document.getElementById("ingredientInput");
    const ingredient = ingredientInput.value.trim();

    if (ingredient && !selectedIngredients.includes(ingredient)) {
        selectedIngredients.push(ingredient);

        // Display the ingredient in the list
        const ingredientList = document.getElementById("ingredientList");
        const listItem = document.createElement("li");
        listItem.innerHTML = `
            ${ingredient}
            <i class="fas fa-times" onclick="removeIngredient('${ingredient}')" style="cursor: pointer; color: #ff6b6b;"></i>
        `;
        ingredientList.appendChild(listItem);
        
        // Clear the input field
        ingredientInput.value = "";
    }
}

function removeIngredient(ingredient) {
    selectedIngredients = selectedIngredients.filter(item => item !== ingredient);
    updateIngredientList();
}

function updateIngredientList() {
    const ingredientList = document.getElementById("ingredientList");
    ingredientList.innerHTML = "";
    
    selectedIngredients.forEach(ingredient => {
        const listItem = document.createElement("li");
        listItem.innerHTML = `
            ${ingredient}
            <i class="fas fa-times" onclick="removeIngredient('${ingredient}')" style="cursor: pointer; color: #ff6b6b;"></i>
        `;
        ingredientList.appendChild(listItem);
    });
}

function clearIngredients() {
    selectedIngredients = [];
    const ingredientList = document.getElementById("ingredientList");
    ingredientList.innerHTML = "";
    const recipeResults = document.getElementById("recipeResults");
    recipeResults.innerHTML = "";
}

async function fetchRecipes() {
    if (selectedIngredients.length === 0) {
        alert("Please add at least one ingredient.");
        return;
    }

    // Show loading spinner
    const loadingSpinner = document.getElementById("loadingSpinner");
    loadingSpinner.style.display = "block";
    
    // Clear previous results
    const recipeResults = document.getElementById("recipeResults");
    recipeResults.innerHTML = "";

    try {
        const ingredients = selectedIngredients.join(",+");
        const url = `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${API_KEY}&ingredients=${ingredients}&number=6&ranking=2&ignorePantry=true`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch recipes');
        }

        const recipes = await response.json();
        await displayRecipes(recipes);
    } catch (error) {
        console.error("Error fetching recipes:", error);
        recipeResults.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-exclamation-circle" style="color: #ff6b6b; font-size: 2rem;"></i>
                <p style="margin-top: 10px;">Failed to fetch recipes. Please try again later.</p>
            </div>
        `;
    } finally {
        loadingSpinner.style.display = "none";
    }
}

async function displayRecipes(recipes) {
    const recipeResults = document.getElementById("recipeResults");

    if (recipes.length === 0) {
        recipeResults.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-search" style="color: #4ecdc4; font-size: 2rem;"></i>
                <p style="margin-top: 10px;">No recipes found with the given ingredients. Try different ingredients!</p>
            </div>
        `;
        return;
    }

    for (const recipe of recipes) {
        const recipeDiv = document.createElement("div");
        recipeDiv.classList.add("recipe");
        
        // Calculate the percentage of matched ingredients
        const totalIngredients = recipe.missedIngredients.length + recipe.usedIngredients.length;
        const matchPercentage = (recipe.usedIngredients.length / totalIngredients) * 100;

        recipeDiv.innerHTML = `
            <h3>${recipe.title}</h3>
            <img src="${recipe.image}" alt="${recipe.title}">
            <p>
                <i class="fas fa-check-circle" style="color: #4ecdc4;"></i> 
                Matched ingredients: ${recipe.usedIngredients.length} (${matchPercentage.toFixed(0)}%)
            </p>
            <p>
                <i class="fas fa-plus-circle" style="color: #ff6b6b;"></i> 
                Additional ingredients needed: ${recipe.missedIngredients.length}
            </p>
            <button onclick="fetchRecipeDetails(${recipe.id})" style="margin-top: 10px;">
                <i class="fas fa-utensils"></i> View Recipe Steps
            </button>
            <div id="recipeSteps-${recipe.id}" class="recipe-steps"></div>
        `;

        recipeResults.appendChild(recipeDiv);
    }
}

async function fetchRecipeDetails(recipeId) {
    const stepsDiv = document.getElementById(`recipeSteps-${recipeId}`);
    
    // If steps are already shown, hide them (toggle functionality)
    if (stepsDiv.innerHTML !== "") {
        stepsDiv.innerHTML = "";
        return;
    }

    try {
        const url = `https://api.spoonacular.com/recipes/${recipeId}/analyzedInstructions?apiKey=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error('Failed to fetch recipe details');
        }

        const instructions = await response.json();
        displayRecipeSteps(instructions, recipeId);
    } catch (error) {
        console.error("Error fetching recipe details:", error);
        stepsDiv.innerHTML = `
            <p style="color: #ff6b6b;">
                <i class="fas fa-exclamation-circle"></i> 
                Could not fetch preparation steps. Please try again later.
            </p>
        `;
    }
}

function displayRecipeSteps(instructions, recipeId) {
    const recipeStepsDiv = document.getElementById(`recipeSteps-${recipeId}`);

    if (!instructions || instructions.length === 0) {
        recipeStepsDiv.innerHTML = `
            <p style="color: #ff6b6b;">
                <i class="fas fa-info-circle"></i> 
                No preparation steps available for this recipe.
            </p>
        `;
        return;
    }

    let stepsHTML = "<ol style='margin-left: 20px;'>";
    instructions[0].steps.forEach(step => {
        stepsHTML += `<li style='margin-bottom: 8px;'>${step.step}</li>`;
    });
    stepsHTML += "</ol>";

    recipeStepsDiv.innerHTML = stepsHTML;
}
