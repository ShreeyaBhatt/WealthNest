require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const auth = require("./middleware/auth");
const { fail } = require("./utils/respond");

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ success: true, message: "WealthNest API healthy", data: null }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/family", auth, require("./routes/familyRoutes"));
app.use("/api/investments", auth, require("./routes/investmentRoutes"));
app.use("/api/transactions", auth, require("./routes/transactionRoutes"));
app.use("/api/analytics", auth, require("./routes/analyticsRoutes"));
app.use("/api/statements", auth, require("./routes/statementRoutes"));
app.use("/api/insights", auth, require("./routes/insightRoutes"));

app.use((req, res) => fail(res, "Route not found", 404));
app.use((err, req, res, next) => {
  console.error(err);
  return fail(res, err.message || "Server error", err.status || 500);
});

module.exports = app;
