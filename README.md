# DADD_final_exam
## DADD Final Exam – Database, SQL, Docker, and Web App

This repository contains all required components for the **DADD Final Exam**, including:
- ER Model  
- SQL schema file  
- Web application project (`/app` folder) for Docker  
- README documentation for setup and execution


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
| `er-model.png` | ER Diagram showing tables, PK, FK, and relationships |
| `schema.sql` | SQL script used to construct the database |
| `/app` | Contains source code for the web system (Express + HTMX) |
| `Dockerfile` | Image definition for running the web app |
| `compose.yaml` | Defines how to run the app + database in Docker |

---

### 3. ER Model

The ER diagram defines the database structure used in this exam.  
It includes all the required entities and relationships that follow **1NF, 2NF, 3NF**.

➡️ The file is located at:..............................

---

### 4. SQL Schema
The SQL schema includes:
  - Database creation  
  - Table creation  
  - Primary keys  
  - Foreign keys  
  - Data types  
  - Normalized structure  

➡️ The file is located at:  `/schema.sql`
    To run manually:  
  ```bash
  SOURCE schema.sql;
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

