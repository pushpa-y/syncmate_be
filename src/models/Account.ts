import mongoose, { Schema, Document } from "mongoose";
import Entry from "./Entry"; // <-- import Entry model

export interface IAccount extends Document {
  name: string;
  balance: number;
  color?: string;
  user: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    name: { type: String, required: true },
    balance: { type: Number, default: 0 },
    color: { type: String, default: "" },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// -------------------
// Middleware to delete related entries
// -------------------
AccountSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    try {
      await Entry.deleteMany({ account: doc._id, user: doc.user });
      console.log(`Deleted all entries for account ${doc._id}`);
    } catch (err) {
      console.error("Error deleting related entries:", err);
    }
  }
});

export default mongoose.model<IAccount>("Account", AccountSchema);
