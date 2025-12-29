import express from "express";
import {
  createEntry,
  getEntries,
  updateEntry,
  deleteEntry,
} from "../controllers/entry.controller";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();
router.use(authMiddleware);

router.post("/", createEntry);
router.get("/", getEntries);
router.put("/:id", updateEntry);
router.delete("/:id", deleteEntry);

export default router;
