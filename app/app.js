const express = require('express');
const hbs = require('hbs');
const path = require('path');
const mysql = require('mysql2');
const configs = require('./config');

const app = express();

/* =======================
   View Engine (HBS)
======================= */
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Helpers
hbs.registerHelper('ifEquals', function (a, b, options) {
  return a == b ? options.fn(this) : options.inverse(this);
});
hbs.registerHelper('json', function (context) {
  return JSON.stringify(context);
});

/* =======================
   Middleware
======================= */
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* =======================
   Database
======================= */
const db = mysql.createConnection(configs.db);

db.connect((err) => {
  if (err) {
    console.error('❌ DB connection error:', err.message);
  } else {
    console.log('✅ Connected to DB:', configs.db.database);
  }
});

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/* =======================
   ROUTES
======================= */

// ---------- HOME ----------
app.get('/', (req, res) => {
  res.render('index', { title: 'DADD Final Exam' });
});
app.get('/admin', (req, res) => {
  res.render('admin', { title: 'Admin Panel' });
});

/* =======================
   REGION CRUD
======================= */
app.get('/regions', async (req, res) => {
  const rows = await q('SELECT region_id, region_name FROM REGION ORDER BY region_id');
  res.render('regions', { title: 'Region List', regions: rows });
});

app.get('/regions/add', (req, res) => {
  res.render('region_form', {
    title: 'Add Region',
    isAdd: true,
    region: { region_id: '', region_name: '' },
  });
});

app.post('/regions/add', async (req, res) => {
  await q('INSERT INTO REGION (region_name) VALUES (?)', [req.body.region_name]);
  res.redirect('/regions');
});

app.get('/regions/:id/edit', async (req, res) => {
  const rows = await q('SELECT * FROM REGION WHERE region_id = ?', [req.params.id]);
  res.render('region_form', { title: 'Edit Region', isAdd: false, region: rows[0] });
});

app.post('/regions/:id/edit', async (req, res) => {
  await q('UPDATE REGION SET region_name=? WHERE region_id=?', [
    req.body.region_name,
    req.params.id,
  ]);
  res.redirect('/regions');
});

app.post('/regions/:id/delete', async (req, res) => {
  await q('DELETE FROM REGION WHERE region_id=?', [req.params.id]);
  res.redirect('/regions');
});

/* =======================
   SUB REGION CRUD
======================= */
app.get('/subregions', async (req, res) => {
  const rows = await q(`
    SELECT s.*, r.region_name
    FROM SUB_REGION s
    LEFT JOIN REGION r ON s.region_id = r.region_id
    ORDER BY s.sub_region_id
  `);
  res.render('subregions', { title: 'Sub-Region List', subregions: rows });
});

app.get('/subregions/add', async (req, res) => {
  const regions = await q('SELECT * FROM REGION ORDER BY region_name');
  res.render('subregion_form', {
    title: 'Add Sub-Region',
    isAdd: true,
    subregion: {},
    regions,
  });
});

app.post('/subregions/add', async (req, res) => {
  await q(
    'INSERT INTO SUB_REGION (sub_region_name, region_id) VALUES (?, ?)',
    [req.body.sub_region_name, req.body.region_id]
  );
  res.redirect('/subregions');
});

app.get('/subregions/:id/edit', async (req, res) => {
  const sub = await q('SELECT * FROM SUB_REGION WHERE sub_region_id=?', [req.params.id]);
  const regions = await q('SELECT * FROM REGION');
  res.render('subregion_form', {
    title: 'Edit Sub-Region',
    isAdd: false,
    subregion: sub[0],
    regions,
  });
});

app.post('/subregions/:id/edit', async (req, res) => {
  await q(
    'UPDATE SUB_REGION SET sub_region_name=?, region_id=? WHERE sub_region_id=?',
    [req.body.sub_region_name, req.body.region_id, req.params.id]
  );
  res.redirect('/subregions');
});

app.post('/subregions/:id/delete', async (req, res) => {
  await q('DELETE FROM SUB_REGION WHERE sub_region_id=?', [req.params.id]);
  res.redirect('/subregions');
});

/* =======================
   INTERMEDIATE REGION CRUD
======================= */
app.get('/intermediate-regions', async (req, res) => {
  const rows = await q(`
    SELECT i.*, s.sub_region_name
    FROM INTERMEDIATE_REGION i
    LEFT JOIN SUB_REGION s ON i.sub_region_id = s.sub_region_id
    ORDER BY i.intermediate_region_id
  `);
  res.render('intermediate_regions', {
    title: 'Intermediate Region List',
    intermediate_regions: rows,
  });
});

// alias กันงง
app.get('/intermediate_regions', (req, res) => {
  res.redirect('/intermediate-regions');
});

/* =======================
   FEATURE 1
======================= */
app.get('/feature1', async (req, res) => {
  const selectedCountry = req.query.country_id || '';

  try {
    // 1) dropdown ประเทศ
    const countries = await q(`
      SELECT country_id, country_name
      FROM COUNTRY
      ORDER BY country_name
    `);

    // 2) trend ตาม decade
    let results = [];
    if (selectedCountry) {
      results = await q(`
        SELECT 
          d.decade_id,
          d.dadd_value
        FROM DADD_RECORD d
        WHERE d.country_id = ?
        ORDER BY d.decade_id DESC
      `, [selectedCountry]);
    }

    res.render('feature1', {
      title: 'Country DADD by Decade',
      countries,
      selectedCountry,
      results
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading Feature 1');
  }
});

// =======================
// FEATURE 2
// Select sub-region + decade -> list countries + DADD (ASC)
// =======================
app.get('/feature2', async (req, res) => {
  const selectedSubRegion = req.query.sub_region_id || '';
  const selectedDecade = req.query.decade || '';

  // ✅ DEBUG: ดูค่าที่ browser ส่งมา
  console.log('Feature2 selectedSubRegion =', selectedSubRegion);
  console.log('Feature2 selectedDecade =', selectedDecade);

  try {
    const subregions = await q(`
      SELECT sub_region_id, sub_region_name
      FROM SUB_REGION
      ORDER BY sub_region_name
    `);

    const decades = await q(`
      SELECT DISTINCT decade_id
      FROM DADD_RECORD
      ORDER BY decade_id
    `);

    let results = [];
    if (selectedSubRegion && selectedDecade) {
      results = await q(`
        SELECT 
          c.country_name,
          s.sub_region_name,
          d.decade_id,
          d.dadd_value
        FROM DADD_RECORD d
        JOIN COUNTRY c ON d.country_id = c.country_id
        JOIN INTERMEDIATE_REGION i ON c.intermediate_region_id = i.intermediate_region_id
        JOIN SUB_REGION s ON i.sub_region_id = s.sub_region_id
        WHERE s.sub_region_id = ?
          AND d.decade_id = ?
        ORDER BY (d.dadd_value IS NULL), d.dadd_value ASC, c.country_name ASC
      `, [selectedSubRegion, selectedDecade]);
    }

    res.render('feature2', {
      title: 'Sub-Region & Decade',
      subregions,
      decades,
      selectedSubRegion,
      selectedDecade,
      results
    });

  } catch (err) {
    console.error('❌ Error in /feature2:', err);
    res.status(500).send('Error in Feature 2');
  }
});
// =======================
// FEATURE 3
// Select region + decade -> list sub-regions with AVG(DADD) in that decade
// =======================
app.get('/feature3', async (req, res) => {
  const selectedRegion = req.query.region_id || '';
  const selectedDecade = req.query.decade || '';

  try {
    // 1) Dropdown: Regions
    const regions = await q(`
      SELECT region_id, region_name
      FROM REGION
      ORDER BY region_name
    `);

    // 2) Dropdown: Decades with data (only decades that exist in DADD_RECORD)
    const decades = await q(`
      SELECT DISTINCT decade_id
      FROM DADD_RECORD
      ORDER BY decade_id
    `);

    // 3) Results
    let results = [];
    if (selectedRegion && selectedDecade) {
      results = await q(`
        SELECT
          r.region_name,
          s.sub_region_id,
          s.sub_region_name,
          d.decade_id,
          AVG(d.dadd_value) AS avg_dadd,
          COUNT(DISTINCT c.country_id) AS country_count
        FROM REGION r
        JOIN SUB_REGION s
          ON s.region_id = r.region_id
        JOIN INTERMEDIATE_REGION i
          ON i.sub_region_id = s.sub_region_id
        JOIN COUNTRY c
          ON c.intermediate_region_id = i.intermediate_region_id
        JOIN DADD_RECORD d
          ON d.country_id = c.country_id
        WHERE r.region_id = ?
          AND d.decade_id = ?
        GROUP BY r.region_name, s.sub_region_id, s.sub_region_name, d.decade_id
        ORDER BY r.region_name ASC, (avg_dadd IS NULL), avg_dadd ASC, s.sub_region_name ASC
      `, [selectedRegion, selectedDecade]);
    }

    res.render('feature3', {
      title: 'Region & Decade (Sub-Region Averages)',
      regions,
      decades,
      selectedRegion,
      selectedDecade,
      results
    });

  } catch (err) {
    console.error('❌ Error in /feature3:', err);
    res.status(500).send('Error in Feature 3');
  }
});



/* =======================
   FEATURE 4 (SEARCH)
======================= */
app.get('/feature4', async (req, res) => {
  const query = (req.query.q || '').trim();
  let results = [];

  try {
    const baseSql = `
      SELECT 
        c.country_id,
        c.country_name,
        latest.latest_decade_id AS decade,
        d.dadd_value
      FROM COUNTRY c
      JOIN (
        SELECT country_id, MAX(decade_id) AS latest_decade_id
        FROM DADD_RECORD
        GROUP BY country_id
      ) AS latest ON c.country_id = latest.country_id
      JOIN DADD_RECORD d
        ON d.country_id = latest.country_id
       AND d.decade_id = latest.latest_decade_id
    `;

    if (query) {
      results = await q(
        baseSql + `
        WHERE c.country_name LIKE CONCAT('%', ?, '%')
        ORDER BY c.country_name
        `,
        [query]
      );
    } else {
      // ✅ โชว์เลยตอนยังไม่พิมพ์
      results = await q(
        baseSql + `
        ORDER BY c.country_name
        LIMIT 30
        `
      );
    }

    res.render('feature4', {
      title: 'Search Country (Latest Decade)',
      query,
      results,
      showDefault: !query
    });
  } catch (err) {
    console.error('❌ Error in /feature4:', err);
    res.status(500).send('Error in Feature 4');
  }
});


/* =======================
   FEATURE 8 (SUMMARY)
======================= */
app.get('/feature8', async (req, res) => {
  try {
    const summaryDecade = req.query.summary_decade || '';
    const trendCountryId = req.query.trend_country_id || '';

    // dropdown lists
    const decades = await q('SELECT DISTINCT decade_id FROM DADD_RECORD ORDER BY decade_id');
    const countries = await q('SELECT country_id, country_name FROM COUNTRY ORDER BY country_name');

    // -------------------
    // Part A: Summary
    // -------------------
    let summary = null;
    let topCountry = null;
    let bottomCountry = null;

    if (summaryDecade) {
      // summary metrics
      const sumRows = await q(
        `
        SELECT 
          COUNT(*) AS total_countries,
          ROUND(AVG(dadd_value), 2) AS avg_dadd
        FROM DADD_RECORD
        WHERE decade_id = ?
        `,
        [summaryDecade]
      );
      summary = sumRows[0];

      // top country
      const topRows = await q(
        `
        SELECT c.country_name, d.dadd_value
        FROM DADD_RECORD d
        JOIN COUNTRY c ON d.country_id = c.country_id
        WHERE d.decade_id = ?
        ORDER BY d.dadd_value DESC
        LIMIT 1
        `,
        [summaryDecade]
      );
      topCountry = topRows[0] || null;

      // bottom country
      const bottomRows = await q(
        `
        SELECT c.country_name, d.dadd_value
        FROM DADD_RECORD d
        JOIN COUNTRY c ON d.country_id = c.country_id
        WHERE d.decade_id = ?
        ORDER BY d.dadd_value ASC
        LIMIT 1
        `,
        [summaryDecade]
      );
      bottomCountry = bottomRows[0] || null;
    }

    // -------------------
    // Part B: Trend
    // -------------------
    let trendData = [];

    if (trendCountryId) {
      trendData = await q(
        `
        SELECT decade_id, dadd_value
        FROM DADD_RECORD
        WHERE country_id = ?
        ORDER BY decade_id
        `,
        [trendCountryId]
      );

      // compute barWidth (0-100) for your "relative bar"
      const maxVal = Math.max(...trendData.map(r => Number(r.dadd_value) || 0), 0);
      trendData = trendData.map(r => ({
        ...r,
        barWidth: maxVal > 0 ? Math.round((Number(r.dadd_value) || 0) / maxVal * 100) : 0
      }));
    }

    res.render('feature8', {
      title: 'Feature 8 · Decade Summary & Country Trend',
      decades,
      summaryDecade,
      summary,
      topCountry,
      bottomCountry,
      countries,
      trendCountryId,
      trendData,
    });
  } catch (err) {
    console.error('❌ Error in /feature8:', err);
    res.status(500).send('Error in Feature 8');
  }
});


/* =======================
   SERVER
======================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
