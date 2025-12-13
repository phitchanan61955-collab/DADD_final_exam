# DADD_final_exam
## DADD Final Exam – Database, SQL, Docker, and Web App

This repository contains all required components for the **DADD Final Exam**, including:
- Normalized database design (described in ETL.sql) 
- SQL schema and ETL script
- Web application project (`/app` folder) for Docker 
---

### 1. Project Overview
The objective of this exam is to demonstrate the following skills:
  - Ability to design a database following **1NF, 2NF, and 3NF**.
  - Ability to write SQL queries and perform basic ETL using SQL.
  - Ability to prepare a development environment using **Docker**.
  - Ability to implement user requirements using:
       - HTML  
       - CSS  
       - Express.js  
       - HTMX  
     based on your own database design.
  - Ability to prepare a `compose.yaml` so the user can quickly run the entire system using:
    ```bash
    git clone ...
    docker compose up

###  2. Description of each file

| File / Folder | Description |
|---------------|-------------|
| `/app` | Web application source code (Express.js + HBS) |
| `/sql/ETL.sql` | SQL script for database schema creation and ETL process |
| `/sql/data1.csv` | Raw DADD data by country and year |
| `/sql/data2.csv` | Country reference data (ISO codes and regions) |
| `.env` | Environment variables for database configuration |
| `compose.yaml` | Docker Compose configuration (web app + MySQL) |

---

### 3. ER Model

The ER diagram defines the database structure used in this exam.  
It includes all the required entities and relationships that follow **1NF, 2NF, 3NF**.

The ER model is implemented through the normalized table design
defined in the SQL schema within `sql/ETL.sql`.

---

### 4. SQL Schema
The SQL schema includes:
  - Database creation  
  - Table creation  
  - Primary keys  
  - Foreign keys  
  - Data types  
  - Normalized structure  

➡️ The database schema is defined and executed as part of the ETL process
   in the file: `/sql/ETL.sql`
    To run manually:  
  ```bash
  SOURCE sql/ETL.sql;
```
---
### 5.Using Docker
1. Clone the repository:
```bash
git clone https://github.com/phitchanan61955-collab/DADD_final_exam.git
cd DADD_final_exam
```

2. Start the Docker containers:
```bash
docker-compose up -d
```

3. Access the application at `http://localhost:8080`

#### Manual Setup
1. Install dependencies:
```bash
cd app
npm install
```

2. Configure database connection in `config.js`:
```javascript
db: {
    host: "db",
    user: "root",
    password: "your-password",
    database: "DADD"
}
```

3. Start the application:
```bash
node app.js
```
Then open:
```bash
http://localhost:8080
```

### Usage

#### Login
- Navigate to `http://localhost:8080/login`
- Use an existing account in the database
- (or register a new account if registration is implemented).

## ER Diagram (3rd Normal Form)

![ER Diagram](ER%20Diagram.png)

### 6.ETL Process (Extract – Transform – Load)
This project includes a complete ETL workflow implemented using SQL scripts.
Data Sources
 - data1.csv
 Contains DADD values by country and year.
 - data2.csv
 Contains country metadata including ISO codes and region classifications.

ETL Workflow
The ETL process is implemented in the file:

```
   /sql/ETL.sql

```
  The workflow consists of the following steps:
      1. Extract
        - Load raw CSV data into staging tables using LOAD DATA INFILE.
        - Raw data is stored in:
           - staging_country_raw
           - staging_dadd_raw
      2. Transform
       - Clean and normalize country names.
       - Remove invalid or empty values.
       - Convert year values into decade-based records.
       - Resolve relationships between countries, regions, and decades.
      3.Load
      - Insert cleaned data into normalized tables:
      - COUNTRY
      -  REGION
      -  SUB_REGION
      -  INTERMEDIATE_REGION
      -  DECADE
      - DADD_RECORD
      All transformation steps are documented directly in the SQL script using comments.
--- 
###7. Web Application Features
    The web application is implemented using Express.js, Handlebars (HBS), and MySQL, following a three-tier architecture.
    Feature 1–4: Data Query & Analysis
      - Feature 1: View DADD trends by country across decades
      - Feature 2: View countries in a selected sub-region and decade
      - Feature 3: View average DADD values by sub-region within a region
      - Feature 4: Search country by name and display DADD value for the most recent decade
These features use real SQL queries executed against the normalized database.
--- 
###8. Admin Panel & CRUD Features (Feature 5–7)
    The system includes an Admin Panel for managing master data and DADD records.
    Master Data Management
      - Region Management
      - Sub-Region Management
      - Intermediate Region Management
These tables support data integrity and analytical queries.
CRUD Features
The following features are implemented exactly as required by the exam specification:
      - Feature 5 (INSERT):
        Add a new DADD record for a selected country and decade.
      - Feature 6 (UPDATE):
        Update an existing DADD value by country and decade.
      - Feature 7 (DELETE):
        Delete DADD records within a selected decade range for a country.
All CRUD operations interact directly with the normalized database tables.
--- 

###9. Feature 8: Additional Analytics (Optional Feature)
  An additional analytics page is implemented to provide extended insights based on DADD data.
--- 
###10. Project Structure
          DADD_final_exam/
          │
          ├── app/                 # Express web application
          │   ├── views/           # Handlebars templates
          │   ├── routes/          # Express route handlers
          │   ├── app.js           # Application entry point
          │
          ├── sql/
          │   ├── ETL.sql          # ETL script (Extract, Transform, Load)
          │   ├── data1.csv        # Raw DADD data
          │   └── data2.csv        # Country reference data
          │
          ├── er-model.png         # ER Diagram (3NF)
          ├── schema.sql           # Database schema
          ├── compose.yaml         # Docker Compose configuration
          ├── .env
          └── README.md
--- 














