import { Request, Response } from "express";
import mongoose from "mongoose";
import Account from "../models/Account";
import Entry from "../models/Entry";

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
      color: color || "#6366f1",
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
    const accounts = await Account.find({ user: req.userId }).sort({ name: 1 });
    res.json(accounts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE ACCOUNT
export const updateAccount = async (req: AuthRequest, res: Response) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
// DELETE ACCOUNT (Cascade Delete Entries)
export const deleteAccount = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;

    // 1. Delete all entries associated with this account
    await Entry.deleteMany(
      {
        user: req.userId,
        $or: [{ account: id }, { fromAccount: id }, { toAccount: id }],
      },
      { session }
    );

    // 2. Delete the account itself
    const account = await Account.findOneAndDelete(
      { _id: id, user: req.userId },
      { session }
    );

    if (!account) throw new Error("Account not found");

    await session.commitTransaction();
    res.json({ message: "Account and all associated entries deleted." });
  } catch (err: any) {
    console.error(err);
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};
