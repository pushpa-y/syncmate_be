import express from "express";
import {
  register,
  login,
  updateProfile,
  resetPassword,
} from "../controllers/auth.controller";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put("/update-profile", authMiddleware, updateProfile);
router.put("/reset-password", authMiddleware, resetPassword);
export default router;
