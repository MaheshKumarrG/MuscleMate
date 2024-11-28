package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Set up Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
	}))

	// Serve static files
	serveStaticFiles(r)

	// API routes
	setupAPIRoutes(r)

	// Start server
	port := getEnv("PORT", "5501")
	log.Printf("Server starting on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func serveStaticFiles(r *gin.Engine) {
	r.Static("/js", "./js")
	r.Static("/styles", "./styles")
	r.Static("/images", "./images")
	r.Static("/pages", "./pages")
	r.StaticFile("/favicon.ico", "./images/favicon.ico")
	r.LoadHTMLGlob("*.html")

	// Serve index.html for root path
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", nil)
	})
}

func setupAPIRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.POST("/analyze-food-image", handleFoodImageAnalysis)
		api.POST("/generate-meal-plan", handleGenerateMealPlan)
		api.GET("/recipes/search", handleRecipeSearch)
	}
}

func handleFoodImageAnalysis(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No image file provided"})
		return
	}

	// Save the file temporarily
	tmpDir := os.TempDir()
	tmpFile := filepath.Join(tmpDir, file.Filename)
	if err := c.SaveUploadedFile(file, tmpFile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save image"})
		return
	}
	defer os.Remove(tmpFile)

	// Mock response for now
	c.JSON(http.StatusOK, gin.H{
		"foodName":    "Sample Food",
		"calories":    300,
		"healthScore": 85,
		"nutrition": gin.H{
			"protein":       20,
			"carbohydrates": 40,
			"fat":          10,
			"fiber":        5,
		},
		"healthInsights": []gin.H{
			{"type": "positive", "message": "Good source of protein"},
			{"type": "positive", "message": "Low in saturated fat"},
		},
		"recommendations": []string{
			"Consider adding vegetables for a more balanced meal",
			"Good choice for post-workout nutrition",
		},
	})
}

func handleGenerateMealPlan(c *gin.Context) {
	var request struct {
		Goals       string `json:"goals"`
		Preferences string `json:"preferences"`
		Restrictions string `json:"restrictions"`
	}

	if err := c.BindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	// Mock response for meal plan
	c.JSON(http.StatusOK, gin.H{
		"meals": []gin.H{
			{
				"name": "Breakfast",
				"recipes": []gin.H{
					{
						"name": "Protein Oatmeal",
						"calories": 350,
						"protein": 20,
						"carbs": 45,
						"fat": 12,
					},
				},
			},
			{
				"name": "Lunch",
				"recipes": []gin.H{
					{
						"name": "Grilled Chicken Salad",
						"calories": 400,
						"protein": 35,
						"carbs": 20,
						"fat": 15,
					},
				},
			},
		},
	})
}

func handleRecipeSearch(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Search query is required"})
		return
	}

	// Mock response for recipe search
	c.JSON(http.StatusOK, gin.H{
		"recipes": []gin.H{
			{
				"name": "Healthy Protein Bowl",
				"calories": 450,
				"protein": 30,
				"ingredients": []string{"quinoa", "chicken", "vegetables"},
			},
		},
	})
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
