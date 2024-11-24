package config

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

var DB *sql.DB

func InitDB() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	// Database configuration from environment variables
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbName := os.Getenv("DB_NAME")

	log.Printf("Connecting to MySQL database: %s@%s/%s", dbUser, dbHost, dbName)

	// Create database if it doesn't exist
	tempDB, err := sql.Open("mysql", fmt.Sprintf("%s:%s@tcp(%s:3306)/", dbUser, dbPassword, dbHost))
	if err != nil {
		log.Fatal("Failed to connect to MySQL server:", err)
	}
	defer tempDB.Close()

	_, err = tempDB.Exec("CREATE DATABASE IF NOT EXISTS " + dbName)
	if err != nil {
		log.Fatal("Failed to create database:", err)
	}

	// Connect to the musclemate database
	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s?parseTime=true", dbUser, dbPassword, dbHost, dbName)
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Test the connection
	err = DB.Ping()
	if err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("Successfully connected to database")

	// Initialize tables
	initTables()
}

func initTables() {
	// Create users table
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			email VARCHAR(100) UNIQUE NOT NULL,
			password VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Fatal("Failed to create users table:", err)
	}

	// Create onboarding_data table
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS onboarding_data (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			age INT NOT NULL,
			gender VARCHAR(20) NOT NULL,
			height FLOAT NOT NULL,
			weight FLOAT NOT NULL,
			activity_level VARCHAR(50) NOT NULL,
			primary_goal VARCHAR(50) NOT NULL,
			diet_type VARCHAR(50) NOT NULL,
			health_conditions TEXT,
			allergies TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		log.Fatal("Failed to create onboarding_data table:", err)
	}

	// Create meal_plans table
	_, err = DB.Exec(`
		CREATE TABLE IF NOT EXISTS meal_plans (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			daily_calories INT NOT NULL,
			protein_target INT NOT NULL,
			carbs_target INT NOT NULL,
			fat_target INT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
		)
	`)
	if err != nil {
		log.Fatal("Failed to create meal_plans table:", err)
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
