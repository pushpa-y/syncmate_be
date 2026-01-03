import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes";
import entryRoutes from "./routes/entry.routes";
import { authMiddleware } from "./middleware/auth";
import accountRoutes from "./routes/account.routes";

dotenv.config();

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI!)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB Error:", err));

const app = express();
app.use(cors());
app.use(express.json());

// Auth Routes
app.use("/auth", authRoutes);
app.use("/entries", entryRoutes);
app.use("/accounts", accountRoutes);

// Protected Route Test
app.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "You accessed a protected route!" });
});

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});