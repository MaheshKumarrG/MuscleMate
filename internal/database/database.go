package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
)

var (
	DB                *sql.DB
	dbConnMaxLifetime = time.Minute * 5
	dbMaxOpenConns    = 10
	dbMaxIdleConns    = 5
)

// InitDB initializes the database connection and creates necessary tables
func InitDB() error {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found")
	}

	// Database configuration from environment variables
	dbUser := getEnv("DB_USER", "root")
	dbPassword := getEnv("DB_PASSWORD", "")
	dbHost := getEnv("DB_HOST", "localhost")
	dbName := getEnv("DB_NAME", "musclemate")

	log.Printf("Connecting to MySQL database: %s@%s/%s", dbUser, dbHost, dbName)

	// Create database if it doesn't exist
	if err := createDatabaseIfNotExists(dbUser, dbPassword, dbHost, dbName); err != nil {
		return fmt.Errorf("failed to create database: %v", err)
	}

	// Connect to the musclemate database
	dsn := fmt.Sprintf("%s:%s@tcp(%s:3306)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci",
		dbUser, dbPassword, dbHost, dbName)

	var err error
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}

	// Configure connection pool
	DB.SetConnMaxLifetime(dbConnMaxLifetime)
	DB.SetMaxOpenConns(dbMaxOpenConns)
	DB.SetMaxIdleConns(dbMaxIdleConns)

	// Test the connection
	if err := DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %v", err)
	}

	log.Println("Successfully connected to database")

	// Initialize tables
	if err := initTables(); err != nil {
		return fmt.Errorf("failed to initialize tables: %v", err)
	}

	return nil
}

func createDatabaseIfNotExists(dbUser, dbPassword, dbHost, dbName string) error {
	tempDB, err := sql.Open("mysql", fmt.Sprintf("%s:%s@tcp(%s:3306)/",
		dbUser, dbPassword, dbHost))
	if err != nil {
		return fmt.Errorf("failed to connect to MySQL server: %v", err)
	}
	defer tempDB.Close()

	_, err = tempDB.Exec("CREATE DATABASE IF NOT EXISTS " + dbName +
		" CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
	if err != nil {
		return fmt.Errorf("failed to create database: %v", err)
	}

	return nil
}

func initTables() error {
	// Create users table
	if err := createUsersTable(); err != nil {
		return err
	}

	// Create onboarding_data table
	if err := createOnboardingDataTable(); err != nil {
		return err
	}

	// Create meal_plans table
	if err := createMealPlansTable(); err != nil {
		return err
	}

	return nil
}

func createUsersTable() error {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(100) NOT NULL,
			email VARCHAR(100) UNIQUE NOT NULL,
			password VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			INDEX idx_email (email)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`)
	if err != nil {
		return fmt.Errorf("failed to create users table: %v", err)
	}
	return nil
}

func createOnboardingDataTable() error {
	_, err := DB.Exec(`
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
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_user_id (user_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`)
	if err != nil {
		return fmt.Errorf("failed to create onboarding_data table: %v", err)
	}
	return nil
}

func createMealPlansTable() error {
	_, err := DB.Exec(`
		CREATE TABLE IF NOT EXISTS meal_plans (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_id INT NOT NULL,
			daily_calories INT NOT NULL,
			protein_target INT NOT NULL,
			carbs_target INT NOT NULL,
			fat_target INT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
			FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
			INDEX idx_user_id (user_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
	`)
	if err != nil {
		return fmt.Errorf("failed to create meal_plans table: %v", err)
	}
	return nil
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
