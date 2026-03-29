import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// ✅ Test route
app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

// ✅ CREATE EXPENSE API
app.post("/expense", (req, res) => {
  console.log("🔥 Expense API HIT");
  console.log("📦 Body:", req.body);

  const { user_id, amount, category, description } = req.body;

  if (!user_id || !amount) {
    console.log("❌ Missing fields");
    return res.status(400).json({ error: "Missing fields" });
  }

  const query = `
    INSERT INTO expenses (user_id, amount, category, description)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [user_id, amount, category, description], (err, result) => {
    if (err) {
      console.log("❌ Expense insert error:", err);
      return res.status(500).json({ error: "Expense insert failed" });
    }

    const expenseId = result.insertId;
    console.log("✅ Expense inserted:", expenseId);

    // ✅ Fetch approvers
    db.query("SELECT user_id FROM approvers", (err, approvers) => {
      if (err) {
        console.log("❌ Approver fetch error:", err);
        return res.status(500).json({ error: "Approver fetch failed" });
      }

      if (approvers.length === 0) {
        return res.json({
          message: "Expense created (no approvers)",
          id: expenseId,
        });
      }

      // ✅ Use Promise instead of manual counter (clean + safe)
      const approvalPromises = approvers.map((approver) => {
        return new Promise((resolve) => {
          db.query(
            "INSERT INTO expense_approvals (expense_id, approver_id) VALUES (?, ?)",
            [expenseId, approver.user_id],
            (err) => {
              if (err) {
                console.log("❌ Approval insert error:", err);
              } else {
                console.log("✅ Approval added:", approver.user_id);
              }
              resolve();
            }
          );
        });
      });

      Promise.all(approvalPromises).then(() => {
        console.log("🎉 All approvals inserted");

        res.json({
          message: "Expense created with approvals",
          id: expenseId,
        });
      });
    });
  });
});

// ✅ Start server
app.listen(5000, () => {
  console.log("🚀 Server running on port 5000");
});


 app.get("/approvals/:userId", (req, res) => {
  const userId = req.params.userId;

  console.log("🔍 Fetching approvals for user:", userId); // debug

  const query = `
    SELECT 
      ea.id,
      ea.expense_id,
      ea.approver_id,
      ea.status,
      e.amount,
      e.category,
      e.description,
      e.created_at
    FROM expense_approvals ea
    JOIN expenses e ON ea.expense_id = e.id
    WHERE ea.approver_id = ? AND ea.status = 'pending'
  `;

  db.query(query, [userId], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ error: "Fetch failed" });
    }

    console.log("✅ Results:", results); // debug

    res.json(results);
  });
});
