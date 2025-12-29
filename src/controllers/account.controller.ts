import { Request, Response } from "express";
import Account from "../models/Account";

interface AuthRequest extends Request {
  userId?: string;
}

// CREATE ACCOUNT
export const createAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { name, color, balance } = req.body;
    if (!name) return res.status(400).json({ message: "Name required" });

    const account = await Account.create({
      name,
      color: color || "",
      balance: balance || 0,
      user: req.userId,
    });

    res.status(201).json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET ACCOUNTS
export const getAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const accounts = await Account.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE ACCOUNT
export const updateAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const account = await Account.findOneAndUpdate(
      { _id: id, user: req.userId },
      updates,
      { new: true }
    );

    if (!account) return res.status(404).json({ message: "Account not found" });

    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE ACCOUNT
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const account = await Account.findOneAndDelete({ _id: id, user: req.userId });

    if (!account) return res.status(404).json({ message: "Account not found" });

    res.json({ message: "Account and related entries deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
