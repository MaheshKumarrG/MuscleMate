package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"

	"musclemate/config"
)

var jwtKey []byte

func init() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// Get JWT secret from environment
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Println("Warning: JWT_SECRET not set, using default key")
		jwtSecret = "default_jwt_secret_key"
	}
	jwtKey = []byte(jwtSecret)
}

type User struct {
	ID       int    `json:"id"`
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Claims struct {
	UserID int `json:"user_id"`
	jwt.StandardClaims
}

type OnboardingData struct {
	UserID           int     `json:"user_id"`
	Age              int     `json:"age"`
	Gender           string  `json:"gender"`
	Height           float64 `json:"height"`
	Weight           float64 `json:"weight"`
	ActivityLevel    string  `json:"activity_level"`
	PrimaryGoal      string  `json:"primary_goal"`
	DietType         string  `json:"diet_type"`
	HealthConditions string  `json:"health_conditions"`
	Allergies        string  `json:"allergies"`
}

type MealPlan struct {
	UserID        int `json:"user_id"`
	DailyCalories int `json:"daily_calories"`
	ProteinTarget int `json:"protein_target"`
	CarbsTarget   int `json:"carbs_target"`
	FatTarget     int `json:"fat_target"`
}

func generateToken(userID int) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID: userID,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

func authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString := c.GetHeader("Authorization")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No authorization header"})
			c.Abort()
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		c.Set("userID", claims.UserID)
		c.Next()
	}
}

func main() {
	// Initialize database
	config.InitDB()
	defer config.DB.Close()

	r := gin.Default()

	// Configure CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:5500", "http://127.0.0.1:5500"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	r.Use(cors.New(corsConfig))

	// Public routes
	r.POST("/api/auth/signup", signup)
	r.POST("/api/auth/login", login)

	// Protected routes
	auth := r.Group("/api")
	auth.Use(authMiddleware())
	{
		auth.GET("/user", getUser)
		auth.POST("/onboarding", saveOnboarding)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	r.Run(":" + port)
}

func signup(c *gin.Context) {
	var user User
	if err := c.BindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Insert user into database
	result, err := config.DB.Exec("INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
		user.Name, user.Email, string(hashedPassword))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user. Email might already be registered."})
		return
	}

	userID, _ := result.LastInsertId()
	token, err := generateToken(int(userID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    userID,
			"name":  user.Name,
			"email": user.Email,
		},
	})
}

func login(c *gin.Context) {
	var credentials struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BindJSON(&credentials); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user User
	err := config.DB.QueryRow("SELECT id, name, email, password FROM users WHERE email = ?",
		credentials.Email).Scan(&user.ID, &user.Name, &user.Email, &user.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(credentials.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	token, err := generateToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"name":  user.Name,
			"email": user.Email,
		},
	})
}

func getUser(c *gin.Context) {
	userID, _ := c.Get("userID")
	var user User
	err := config.DB.QueryRow("SELECT id, name, email FROM users WHERE id = ?", userID).Scan(&user.ID, &user.Name, &user.Email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

func saveOnboarding(c *gin.Context) {
	userID, _ := c.Get("userID")
	var data OnboardingData
	if err := c.BindJSON(&data); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	data.UserID = userID.(int)

	// Begin transaction
	tx, err := config.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}

	// Save onboarding data
	result, err := tx.Exec(`
		INSERT INTO onboarding_data 
		(user_id, age, gender, height, weight, activity_level, primary_goal, diet_type, health_conditions, allergies)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		data.UserID, data.Age, data.Gender, data.Height, data.Weight,
		data.ActivityLevel, data.PrimaryGoal, data.DietType, data.HealthConditions, data.Allergies)

	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save onboarding data"})
		return
	}

	// Calculate meal plan
	bmr := calculateBMR(data)
	dailyCalories := calculateDailyCalories(bmr, data.ActivityLevel)
	mealPlan := calculateMealPlan(dailyCalories, data.PrimaryGoal)

	// Save meal plan
	_, err = tx.Exec(`
		INSERT INTO meal_plans 
		(user_id, daily_calories, protein_target, carbs_target, fat_target)
		VALUES (?, ?, ?, ?, ?)`,
		data.UserID, mealPlan.DailyCalories, mealPlan.ProteinTarget, mealPlan.CarbsTarget, mealPlan.FatTarget)

	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save meal plan"})
		return
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "Onboarding completed successfully",
		"mealPlan": mealPlan,
	})
}

func calculateBMR(data OnboardingData) float64 {
	// Mifflin-St Jeor Equation
	var bmr float64
	if data.Gender == "male" {
		bmr = (10 * data.Weight) + (6.25 * data.Height) - (5 * float64(data.Age)) + 5
	} else {
		bmr = (10 * data.Weight) + (6.25 * data.Height) - (5 * float64(data.Age)) - 161
	}
	return bmr
}

func calculateDailyCalories(bmr float64, activityLevel string) int {
	multipliers := map[string]float64{
		"sedentary": 1.2,
		"light":     1.375,
		"moderate":  1.55,
		"very":      1.725,
		"extra":     1.9,
	}

	return int(bmr * multipliers[activityLevel])
}

func calculateMealPlan(dailyCalories int, goal string) MealPlan {
	var proteinPerc, carbsPerc, fatPerc float64

	switch goal {
	case "muscleGain":
		proteinPerc = 0.3 // 30%
		fatPerc = 0.25    // 25%
		carbsPerc = 0.45  // 45%
	case "weightLoss":
		proteinPerc = 0.35 // 35%
		fatPerc = 0.3      // 30%
		carbsPerc = 0.35   // 35%
	default: // maintenance
		proteinPerc = 0.3 // 30%
		fatPerc = 0.3     // 30%
		carbsPerc = 0.4   // 40%
	}

	return MealPlan{
		DailyCalories: dailyCalories,
		ProteinTarget: int(float64(dailyCalories) * proteinPerc / 4), // 4 calories per gram
		CarbsTarget:   int(float64(dailyCalories) * carbsPerc / 4),
		FatTarget:     int(float64(dailyCalories) * fatPerc / 9), // 9 calories per gram
	}
}
