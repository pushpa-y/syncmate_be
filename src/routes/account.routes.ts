import express from "express";
import { createAccount, getAccounts, updateAccount, deleteAccount } from "../controllers/account.controller";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();
router.use(authMiddleware);

router.post("/", createAccount);
router.get("/", getAccounts);
router.put("/:id", updateAccount);
router.delete("/:id", deleteAccount);

export default router;
