// Array to store ingredients
let selectedIngredients = [];

function addIngredient() {
  const ingredientInput = document.getElementById("ingredientInput");
  const ingredient = ingredientInput.value.trim();

  if (ingredient && !selectedIngredients.includes(ingredient)) {
    selectedIngredients.push(ingredient);

    // Display the ingredient in the list
    const ingredientList = document.getElementById("ingredientList");
    const listItem = document.createElement("li");
    listItem.textContent = ingredient;
    ingredientList.appendChild(listItem);
    
    // Clear the input field
    ingredientInput.value = "";
  }
}

function clearIngredients() {
  // Clear the ingredients array
  selectedIngredients = [];

  // Clear the displayed list of ingredients
  const ingredientList = document.getElementById("ingredientList");
  ingredientList.innerHTML = "";  // Empty the list

  // Optionally, clear the recipe results
  const recipeResults = document.getElementById("recipeResults");
  recipeResults.innerHTML = "";
}

async function fetchRecipes() {
  if (selectedIngredients.length === 0) {
    alert("Please add at least one ingredient.");
    return;
  }

  const apiKey = "95c7bc04c64d4546811db2c99cec735e";  // Replace with your Spoonacular API Key
  const ingredients = selectedIngredients.join(",");
  const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${ingredients}&number=5&apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    const recipes = await response.json();
    displayRecipes(recipes); 
  } catch (error) {
    console.error("Error fetching recipes:", error);
    alert("Something went wrong. Please try again later.");
  }
}

async function displayRecipes(recipes) {
  const recipeResults = document.getElementById("recipeResults");
  recipeResults.innerHTML = "";  // Clear previous results

  if (recipes.length === 0) {
    recipeResults.innerHTML = "<p>No recipes found with the given ingredients.</p>";
    return;
  }

  for (const recipe of recipes) {
    const recipeDiv = document.createElement("div");
    recipeDiv.classList.add("recipe");
    recipeDiv.innerHTML = `
      <h3>${recipe.title}</h3>
      <img src="${recipe.image}" alt="${recipe.title}" style="width: 100px;">
      <p>Used ingredients: ${recipe.usedIngredientCount}</p>
      <p>Missing ingredients: ${recipe.missedIngredientCount}</p>
      <button onclick="fetchRecipeDetails(${recipe.id})">View Preparation Steps</button>
      <div id="recipeSteps-${recipe.id}" class="recipe-steps"></div>
    `;
    recipeResults.appendChild(recipeDiv);
  }
}

async function fetchRecipeDetails(recipeId) {
  const apiKey = "454e6aacccb94214b4837491eeac7e4c";  // Replace with your Spoonacular API Key
  const url = `https://api.spoonacular.com/recipes/${recipeId}/analyzedInstructions?apiKey=${apiKey}`;

  try {
    const response = await fetch(url);
    const instructions = await response.json();
    displayRecipeSteps(instructions, recipeId);
  } catch (error) {
    console.error("Error fetching recipe details:", error);
    alert("Could not fetch preparation steps. Please try again later.");
  }
}

function displayRecipeSteps(instructions, recipeId) {
  const recipeStepsDiv = document.getElementById(`recipeSteps-${recipeId}`);

  if (instructions.length === 0) {
    recipeStepsDiv.innerHTML = "<p>No preparation steps available for this recipe.</p>";
    return;
  }

  let stepsHTML = "<ol>";
  instructions[0].steps.forEach(step => {
    stepsHTML += `<li>${step.step}</li>`;
  });
  stepsHTML += "</ol>";

  recipeStepsDiv.innerHTML = stepsHTML;
}
