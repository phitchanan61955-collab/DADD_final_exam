-- ============================================================
-- ETL.sql — DADD Final Exam (Academic / Docker-safe Version)
-- Author: (Your Name)
--
-- Purpose:
--   Demonstrate an end-to-end ETL workflow for the DADD dataset:
--   (1) Extract   : Insert raw records into STAGING tables (SQL-based)
--   (2) Transform : Clean, validate, and standardize raw records
--   (3) Load      : Populate 3NF tables (REGION → SUB_REGION → INTERMEDIATE_REGION → COUNTRY)
--                  and aggregate yearly DADD into DECADE-level averages.
--
-- Note on Docker / MySQL security:
--   In MySQL 8 containers, LOAD DATA INFILE may be restricted by secure-file-priv.
--   To keep this script portable and reproducible in Docker Compose,
--   extraction is demonstrated via SQL INSERT statements into staging tables.
--   (CSV files remain as the conceptual source and can be documented in the report.)
-- ============================================================

-- ------------------------------------------------------------
-- STEP 0 — Database setup & reset environment
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS DADD;
USE DADD;

-- Temporarily disable FK checks for clean teardown
SET FOREIGN_KEY_CHECKS = 0;

-- Drop final tables (reverse dependency order)
DROP TABLE IF EXISTS DADD_RECORD;
DROP TABLE IF EXISTS DECADE;
DROP TABLE IF EXISTS COUNTRY;
DROP TABLE IF EXISTS INTERMEDIATE_REGION;
DROP TABLE IF EXISTS SUB_REGION;
DROP TABLE IF EXISTS REGION;

-- Drop staging tables
DROP TABLE IF EXISTS staging_country_raw;
DROP TABLE IF EXISTS staging_dadd_raw;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- STEP 1 — Create STAGING tables (raw / pre-normalized)
-- ------------------------------------------------------------
-- Raw country + region taxonomy (conceptually from data2.csv)
CREATE TABLE staging_country_raw (
    country_name             VARCHAR(255),
    alpha_2                  VARCHAR(10),
    alpha_3                  VARCHAR(10),
    country_code             INT,
    iso_3166_2               VARCHAR(20),
    region_name              VARCHAR(255),
    sub_region_name          VARCHAR(255),
    intermediate_region_name VARCHAR(255),
    region_code              VARCHAR(10),
    sub_region_code          VARCHAR(10),
    intermediate_region_code VARCHAR(10)
);

-- Raw yearly DADD values (conceptually from data1.csv)
CREATE TABLE staging_dadd_raw (
    country_name VARCHAR(255),
    year         INT,
    dadd_value   DECIMAL(12,4)
);

-- ------------------------------------------------------------
-- STEP 2 — EXTRACT (Docker-safe demonstration)
-- ------------------------------------------------------------
-- Instead of LOAD DATA INFILE (restricted in some MySQL Docker configs),
-- we demonstrate extraction by inserting representative raw rows.
-- In the report, explain that CSV files were the original sources.

TRUNCATE TABLE staging_country_raw;

LOAD DATA INFILE '/var/lib/mysql-files/data2.csv'
INTO TABLE staging_country_raw
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS;

TRUNCATE TABLE staging_dadd_raw;

LOAD DATA INFILE '/var/lib/mysql-files/data1.csv'
INTO TABLE staging_dadd_raw
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\n'
IGNORE 1 ROWS
(@country, @year, @dadd)
SET
  country_name = NULLIF(TRIM(@country),''),
  year         = NULLIF(TRIM(@year),''),
  dadd_value   = NULLIF(TRIM(@dadd),'');


-- ------------------------------------------------------------
-- STEP 3 — TRANSFORM (data cleaning & validation)
-- ------------------------------------------------------------
-- Remove records missing mandatory attributes required for normalization
DELETE FROM staging_country_raw
WHERE country_name IS NULL OR country_name = ''
   OR region_name  IS NULL OR region_name  = '';

-- Remove invalid DADD records:
--   - missing year or value
--   - missing country name
DELETE FROM staging_dadd_raw
WHERE year IS NULL
   OR dadd_value IS NULL
   OR country_name IS NULL
   OR country_name = '';

-- Optional: Remove impossible year ranges (uncomment if needed)
-- DELETE FROM staging_dadd_raw
-- WHERE year < 1800 OR year > 2100;

-- ------------------------------------------------------------
-- STEP 4 — Create FINAL normalized tables (3NF)
-- ------------------------------------------------------------
CREATE TABLE REGION (
    region_id   INT PRIMARY KEY AUTO_INCREMENT,
    region_name VARCHAR(255) NOT NULL,
    UNIQUE (region_name)
);

CREATE TABLE SUB_REGION (
    sub_region_id   INT PRIMARY KEY AUTO_INCREMENT,
    sub_region_name VARCHAR(255) NOT NULL,
    region_id       INT NOT NULL,
    UNIQUE (sub_region_name, region_id),
    FOREIGN KEY (region_id) REFERENCES REGION(region_id)
);

CREATE TABLE INTERMEDIATE_REGION (
    intermediate_region_id   INT PRIMARY KEY AUTO_INCREMENT,
    intermediate_region_name VARCHAR(255) NOT NULL,
    sub_region_id            INT NOT NULL,
    UNIQUE (intermediate_region_name, sub_region_id),
    FOREIGN KEY (sub_region_id) REFERENCES SUB_REGION(sub_region_id)
);

CREATE TABLE COUNTRY (
    country_id             INT PRIMARY KEY AUTO_INCREMENT,
    country_name           VARCHAR(255) NOT NULL,
    alpha_2                VARCHAR(10),
    numeric_code           INT,
    iso_3166_2             VARCHAR(20),
    intermediate_region_id INT NOT NULL,
    UNIQUE (country_name),
    FOREIGN KEY (intermediate_region_id)
        REFERENCES INTERMEDIATE_REGION(intermediate_region_id)
);

CREATE TABLE DECADE (
    decade_id    INT PRIMARY KEY AUTO_INCREMENT,
    decade_label VARCHAR(20) NOT NULL,
    start_year   INT NOT NULL,
    end_year     INT NOT NULL,
    UNIQUE (start_year, end_year)
);

CREATE TABLE DADD_RECORD (
    dadd_id    INT PRIMARY KEY AUTO_INCREMENT,
    country_id INT NOT NULL,
    decade_id  INT NOT NULL,
    dadd_value DECIMAL(12,4) NOT NULL,
    UNIQUE (country_id, decade_id),
    FOREIGN KEY (country_id) REFERENCES COUNTRY(country_id),
    FOREIGN KEY (decade_id)  REFERENCES DECADE(decade_id)
);

-- ------------------------------------------------------------
-- STEP 5 — LOAD (populate 3NF tables & aggregate DADD)
-- ------------------------------------------------------------

-- 5.1 Load REGION (unique)
INSERT IGNORE INTO REGION (region_name)
SELECT DISTINCT region_name
FROM staging_country_raw
WHERE region_name IS NOT NULL AND region_name <> '';

-- 5.2 Load SUB_REGION (unique, mapped to REGION)
INSERT IGNORE INTO SUB_REGION (sub_region_name, region_id)
SELECT DISTINCT
    s.sub_region_name,
    r.region_id
FROM staging_country_raw s
JOIN REGION r
  ON s.region_name = r.region_name
WHERE s.sub_region_name IS NOT NULL AND s.sub_region_name <> '';

-- 5.3 Load INTERMEDIATE_REGION
-- Some datasets may have NULL/empty intermediate region.
-- For strict normalization, we map NULL intermediate to a placeholder per sub-region.
-- This guarantees COUNTRY.intermediate_region_id is always valid.
INSERT IGNORE INTO INTERMEDIATE_REGION (intermediate_region_name, sub_region_id)
SELECT DISTINCT
    COALESCE(NULLIF(s.intermediate_region_name, ''), CONCAT('N/A - ', s.sub_region_name)) AS intermediate_region_name,
    sr.sub_region_id
FROM staging_country_raw s
JOIN SUB_REGION sr
  ON s.sub_region_name = sr.sub_region_name
WHERE s.sub_region_name IS NOT NULL AND s.sub_region_name <> '';

-- 5.4 Load COUNTRY (mapped to INTERMEDIATE_REGION)
INSERT IGNORE INTO COUNTRY (
    country_name,
    alpha_2,
    numeric_code,
    iso_3166_2,
    intermediate_region_id
)
SELECT DISTINCT
    s.country_name,
    s.alpha_2,
    s.country_code,
    s.iso_3166_2,
    ir.intermediate_region_id
FROM staging_country_raw s
JOIN SUB_REGION sr
  ON s.sub_region_name = sr.sub_region_name
JOIN INTERMEDIATE_REGION ir
  ON ir.sub_region_id = sr.sub_region_id
 AND ir.intermediate_region_name =
     COALESCE(NULLIF(s.intermediate_region_name, ''), CONCAT('N/A - ', s.sub_region_name))
WHERE s.country_name IS NOT NULL AND s.country_name <> '';

-- 5.5 Create DECADE dimension from staging_dadd_raw
-- Example: 1975 → 1970–1979 with label "1970s"
INSERT IGNORE INTO DECADE (decade_label, start_year, end_year)
SELECT
    CONCAT(d.decade_start, 's') AS decade_label,
    d.decade_start             AS start_year,
    d.decade_start + 9         AS end_year
FROM (
    SELECT DISTINCT FLOOR(year / 10) * 10 AS decade_start
    FROM staging_dadd_raw
    WHERE year IS NOT NULL
) AS d
ORDER BY d.decade_start;

-- 5.6 Load aggregated DADD records (decadal averages)
-- One record = one country + one decade
INSERT IGNORE INTO DADD_RECORD (country_id, decade_id, dadd_value)
SELECT
    c.country_id,
    d.decade_id,
    AVG(s.dadd_value) AS dadd_value
FROM staging_dadd_raw s
JOIN COUNTRY c
  ON c.country_name = s.country_name
JOIN DECADE d
  ON s.year BETWEEN d.start_year AND d.end_year
GROUP BY c.country_id, d.decade_id;

-- ------------------------------------------------------------
-- STEP 6 — Verification queries (optional, for sanity check)
-- ------------------------------------------------------------
-- SELECT COUNT(*) AS regions FROM REGION;
-- SELECT COUNT(*) AS sub_regions FROM SUB_REGION;
-- SELECT COUNT(*) AS intermediate_regions FROM INTERMEDIATE_REGION;
-- SELECT COUNT(*) AS countries FROM COUNTRY;
-- SELECT COUNT(*) AS decades FROM DECADE;
-- SELECT COUNT(*) AS dadd_records FROM DADD_RECORD;

-- End of ETL.sql
