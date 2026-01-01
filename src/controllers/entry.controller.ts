import { Request, Response } from "express";
import mongoose from "mongoose";
import Entry from "../models/Entry";
import Account from "../models/Account";

interface AuthRequest extends Request {
  userId?: string;
}

// CREATE ENTRY
export const createEntry = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      value = 0,
      entryType = "expense",
      dueDate,
      notes,
      category,
      accountId,
      fromAccountId,
      toAccountId,
    } = req.body;

    // Validation
    if (entryType === "transfer") {
      if (!fromAccountId || !toAccountId)
        throw new Error("Both accounts required for transfer");
      if (fromAccountId === toAccountId)
        throw new Error("Cannot transfer to the same account");
    } else if (!accountId) {
      throw new Error("Account is required");
    }

    // 1. Create Entry
    const [entry] = await Entry.create(
      [
        {
          value,
          entryType,
          dueDate,
          notes,
          category,
          account: accountId,
          fromAccount: fromAccountId,
          toAccount: toAccountId,
          user: req.userId,
        },
      ],
      { session }
    );

    // 2. Update Balances
    if (entryType === "transfer") {
      await Account.updateOne(
        { _id: fromAccountId },
        { $inc: { balance: -value } },
        { session }
      );
      await Account.updateOne(
        { _id: toAccountId },
        { $inc: { balance: value } },
        { session }
      );
    } else {
      const delta = entryType === "income" ? value : -value;
      await Account.updateOne(
        { _id: accountId },
        { $inc: { balance: delta } },
        { session }
      );
    }

    await session.commitTransaction();
    res.status(201).json(entry);
  } catch (err: any) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message || "Server error" });
  } finally {
    session.endSession();
  }
};

export const updateEntry = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const entry = await Entry.findOne({ _id: id, user: req.userId }).session(
      session
    );
    if (!entry) throw new Error("Entry not found");

    const oldValue = entry.value || 0;
    const oldType = entry.entryType;
    const oldAcc = entry.account?.toString();
    const oldFrom = entry.fromAccount?.toString();
    const oldTo = entry.toAccount?.toString();

    // 1. UNDO OLD BALANCE IMPACT
    if (oldType === "transfer") {
      await Account.updateOne(
        { _id: oldFrom },
        { $inc: { balance: oldValue } },
        { session }
      );
      await Account.updateOne(
        { _id: oldTo },
        { $inc: { balance: -oldValue } },
        { session }
      );
    } else {
      const undoDelta = oldType === "income" ? -oldValue : oldValue;
      await Account.updateOne(
        { _id: oldAcc },
        { $inc: { balance: undoDelta } },
        { session }
      );
    }

    // 2. UPDATE ENTRY DATA
    const updates = req.body;
    Object.assign(entry, updates);
    await entry.save({ session });

    // 3. APPLY NEW BALANCE IMPACT
    const newValue = entry.value || 0;
    if (entry.entryType === "transfer") {
      await Account.updateOne(
        { _id: entry.fromAccount },
        { $inc: { balance: -newValue } },
        { session }
      );
      await Account.updateOne(
        { _id: entry.toAccount },
        { $inc: { balance: newValue } },
        { session }
      );
    } else {
      const applyDelta = entry.entryType === "income" ? newValue : -newValue;
      await Account.updateOne(
        { _id: entry.account },
        { $inc: { balance: applyDelta } },
        { session }
      );
    }

    await session.commitTransaction();
    res.json(entry);
  } catch (err: any) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message || "Update failed" });
  } finally {
    session.endSession();
  }
};
// GET ENTRIES (With optimized filtering)
export const getEntries = async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
    const limit = Math.max(
      1,
      parseInt((req.query.limit as string) || "10", 10)
    );
    const filterQuery: any = { user: req.userId };

    if (req.query.category) filterQuery.category = req.query.category;

    if (req.query.account) {
      const accId = req.query.account;
      filterQuery.$or = [
        { account: accId },
        { fromAccount: accId },
        { toAccount: accId },
      ];
    }

    const sortOptions: any = {
      "due-asc": { dueDate: 1 },
      "due-desc": { dueDate: -1 },
    };

    const skip = (page - 1) * limit;
    const [total, entries] = await Promise.all([
      Entry.countDocuments(filterQuery),
      Entry.find(filterQuery)
        .sort(sortOptions[req.query.sortBy as string] || { dueDate: -1 })
        .skip(skip)
        .limit(limit),
    ]);

    res.json({ entries, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE ENTRY (Reverse balances)
export const deleteEntry = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const entry = await Entry.findOne({
      _id: req.params.id,
      user: req.userId,
    }).session(session);
    if (!entry) throw new Error("Entry not found");

    const val = entry.value || 0;

    if (entry.entryType === "transfer") {
      await Account.updateOne(
        { _id: entry.fromAccount },
        { $inc: { balance: val } },
        { session }
      );
      await Account.updateOne(
        { _id: entry.toAccount },
        { $inc: { balance: -val } },
        { session }
      );
    } else {
      const reverseDelta = entry.entryType === "income" ? -val : val;
      await Account.updateOne(
        { _id: entry.account },
        { $inc: { balance: reverseDelta } },
        { session }
      );
    }

    await entry.deleteOne({ session });
    await session.commitTransaction();
    res.json({ message: "Entry deleted" });
  } catch (err: any) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};
