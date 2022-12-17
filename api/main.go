package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
)

// Account represents a row in the accounts table in the MySQL database
type Account struct {
	Address         string `json:"id"`
	Signer          string `json:"signer"`
	TransactionHash string `json:"transaction_hash"`
	UpdatedAtBlock  int    `json:"updated_at_block"`
	CreatedAtBlock  int    `json:"created_at_block"`
	UpdatedAt       int    `json:"updated_at"`
	CreatedAt       int    `json:"created_at"`
}

// global variable to store the database connection
var db *sql.DB

func main() {
	// Connect to the MySQL database
	var err error
	databaseURL := os.Getenv("GO_DATABASE_URL")
	// if no databaseURL is set in the environment, panic
	if databaseURL == "" {
		panic("GO_DATABASE_URL is not set")
	}
	db, err = sql.Open("mysql", databaseURL)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer db.Close()

	http.HandleFunc("/accountsBySigners", accountsBySignersHandler)
	// starting server on port log
	fmt.Println("Starting server on port 8080")

	http.ListenAndServe(":8080", nil)
}

func accountsBySignersHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST requests are allowed", http.StatusMethodNotAllowed)
		return
	}

	// Parse the request body
	var signers []string
	if err := json.NewDecoder(r.Body).Decode(&signers); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Execute the SELECT query to retrieve the accounts
	query, args, err := sqlx.In("SELECT * FROM accounts WHERE signer IN (?)", signers)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	rows, err := db.Query(query, args...)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	// Parse the results and create the response
	var accounts []Account
	for rows.Next() {
		var account Account

		// row scan for all values
		if err := rows.Scan(
			&account.Address,
			&account.Signer,
			&account.TransactionHash,
			&account.UpdatedAtBlock,
			&account.CreatedAtBlock,
			&account.UpdatedAt,
			&account.CreatedAt,
		); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		accounts = append(accounts, account)
	}

	// Return the response as JSON
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(accounts); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}
