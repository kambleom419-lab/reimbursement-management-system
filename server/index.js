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

    const expenseId = result.insertId;

    // 👉 Get approvers
    db.query("SELECT user_id FROM approvers", (err, approvers) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Approver fetch error" });
      }

      // 👉 If no approvers
      if (approvers.length === 0) {
        return res.json({
          message: "Expense created (no approvers)",
          id: expenseId
        });
      }

      // 👉 Insert approvals
      let completed = 0;

      approvers.forEach((approver) => {
        db.query(
          "INSERT INTO expense_approvals (expense_id, approver_id) VALUES (?, ?)",
          [expenseId, approver.user_id],
          (err) => {
            if (err) console.error(err);

            completed++;

            // 👉 After all inserts complete → send response ONCE
            if (completed === approvers.length) {
              res.json({
                message: "Expense created with approvals",
                id: expenseId
              });
            }
          }
        );
      });
    });
  });
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
app.get("/expenses", (req, res) => {
  const query = "SELECT * FROM expenses";

  db.query(query, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }

    res.json(results);
  });
});
app.post("/expense/:id/approve", (req, res) => {
  const expenseId = req.params.id;
  const { approver_id, status, comment } = req.body;

  // 👉 Get current approver's sequence
  db.query(
    `SELECT sequence_order FROM approvers WHERE user_id = ?`,
    [approver_id],
    (err, approverData) => {
      if (err || approverData.length === 0) {
        return res.status(400).json({ error: "Approver not found" });
      }

      const currentOrder = approverData[0].sequence_order;

      // 👉 Check if previous approvals are done
      db.query(
        `
        SELECT ea.status
        FROM expense_approvals ea
        JOIN approvers a ON ea.approver_id = a.user_id
        WHERE ea.expense_id = ? AND a.sequence_order < ?
        `,
        [expenseId, currentOrder],
        (err, previousApprovals) => {
          if (err) return res.status(500).json({ error: "Check failed" });

          const allPreviousApproved = previousApprovals.every(
            (r) => r.status === "approved"
          );

          if (!allPreviousApproved) {
            return res.status(400).json({
              error: "Previous approvals not completed"
            });
          }

          // 👉 Now update approval
          db.query(
            `
            UPDATE expense_approvals
            SET status = ?, comment = ?
            WHERE expense_id = ? AND approver_id = ?
            `,
            [status, comment, expenseId, approver_id],
            (err) => {
              if (err)
                return res.status(500).json({ error: "Update failed" });

              // 👉 Check final status
              db.query(
                `SELECT status FROM expense_approvals WHERE expense_id = ?`,
                [expenseId],
                (err, results) => {
                  if (err)
                    return res.status(500).json({ error: "Check failed" });

                  const allApproved = results.every(
                    (r) => r.status === "approved"
                  );
                  const anyRejected = results.some(
                    (r) => r.status === "rejected"
                  );

                  let finalStatus = "pending";

                  if (anyRejected) finalStatus = "rejected";
                  else if (allApproved) finalStatus = "approved";

                  db.query(
                    "UPDATE expenses SET status = ? WHERE id = ?",
                    [finalStatus, expenseId]
                  );

                  res.json({
                    message: "Approval updated",
                    finalStatus
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});
