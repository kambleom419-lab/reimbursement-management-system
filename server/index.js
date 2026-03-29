import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});


// ✅ CREATE EXPENSE API
app.post("/expense", (req, res) => {
  const { user_id, amount, category, description } = req.body;

  const query = `
    INSERT INTO expenses (user_id, amount, category, description)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [user_id, amount, category, description], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json({ message: "Expense created", id: result.insertId });
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
