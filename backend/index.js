const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ✅ WORKS FOR BOTH LOCAL + RENDER (just change values later)
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "sri123",
  database: process.env.DB_NAME || "myapp"
});

db.connect((err) => {
  if (err) {
    console.log("DB ERROR:", err);
    return;
  }
  console.log("MySQL Connected ✅");
});

// ✅ CREATE TABLE
db.query(`
  CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    usn VARCHAR(20) NOT NULL,
    sem INT NOT NULL,
    section VARCHAR(10) NOT NULL,
    marks_json LONGTEXT NOT NULL,
    sgpa DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.log("Table error:", err);
});

// ✅ SGPA
function calcSGPA(marks) {
  const nums = marks.map(Number).filter((n) => Number.isFinite(n));
  if (!nums.length) return null;

  const total = nums.reduce((a, b) => a + b, 0);
  return Number((total / (nums.length * 10)).toFixed(2));
}

// ✅ TEST ROUTE
app.get("/", (req, res) => {
  res.send("Server working ✅");
});

// ✅ GET
app.get("/api/students", (req, res) => {
  const search = (req.query.search || "").trim();

  let sql = "SELECT * FROM students ORDER BY id DESC";
  let params = [];

  if (search) {
    sql = `
      SELECT * FROM students
      WHERE name LIKE ? OR usn LIKE ? OR section LIKE ?
      ORDER BY id DESC
    `;
    params = [`%${search}%`, `%${search}%`, `%${search}%`];
  }

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.log("GET ERROR:", err);
      return res.status(500).send("Error fetching students");
    }

    const data = rows.map((r) => ({
      id: r.id,
      name: r.name,
      usn: r.usn,
      sem: r.sem,
      section: r.section,
      marks: r.marks_json ? JSON.parse(r.marks_json) : [],
      sgpa: r.sgpa
    }));

    res.json(data);
  });
});

// ✅ POST
app.post("/api/students", (req, res) => {
  let { name, usn, sem, section, marks } = req.body;

  name = (name || "").trim();
  usn = (usn || "").trim();
  sem = Number(sem);
  section = (section || "").trim();
  marks = Array.isArray(marks) ? marks.map(Number) : [];

  if (!name || !usn || !sem || !section || marks.length === 0) {
    return res.status(400).send("Fill all fields");
  }

  if (marks.some((m) => !Number.isFinite(m))) {
    return res.status(400).send("Marks must be numbers");
  }

  const sgpa = calcSGPA(marks);

  if (sgpa === null) {
    return res.status(400).send("Cannot calculate SGPA");
  }

  db.query(
    "INSERT INTO students (name, usn, sem, section, marks_json, sgpa) VALUES (?, ?, ?, ?, ?, ?)",
    [name, usn, sem, section, JSON.stringify(marks), sgpa],
    (err) => {
      if (err) {
        console.log("INSERT ERROR:", err);
        return res.status(500).send("Insert error");
      }

      res.send("Student added ✅");
    }
  );
});

// ✅ DELETE
app.delete("/api/students/:id", (req, res) => {
  const id = req.params.id;

  db.query("DELETE FROM students WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.log("DELETE ERROR:", err);
      return res.status(500).send("Delete error");
    }

    if (result.affectedRows === 0) {
      return res.status(404).send("Student not found");
    }

    res.send("Student deleted ✅");
  });
});

// ✅ 🔥 RENDER FIX (IMPORTANT)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running 🚀 on port " + PORT);
});
