import mongoose, { Schema, Document } from "mongoose";

export interface IEntry extends Document {
  value?: number;
  entryType: "income" | "expense" | "transfer";
  dueDate?: Date;
  notes?: string;
  category?: string;
  account?: mongoose.Types.ObjectId;
  fromAccount?: mongoose.Types.ObjectId;
  toAccount?: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
}

const EntrySchema = new Schema<IEntry>(
  {
    value: { type: Number, default: 0 },

    entryType: {
      type: String,
      enum: ["income", "expense", "transfer"],
      required: true,
    },

    dueDate: { type: Date, default: Date.now },

    notes: { type: String, default: "" },

    category: {
      type: String,
      default: "other",
    },

    // REQUIRED only for income & expense
    account: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: function () {
        return this.entryType !== "transfer";
      },
    },

    // REQUIRED only for transfer
    fromAccount: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: function () {
        return this.entryType === "transfer";
      },
    },

    toAccount: {
      type: Schema.Types.ObjectId,
      ref: "Account",
      required: function () {
        return this.entryType === "transfer";
      },
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

/* VIRTUAL ACCOUNT */
EntrySchema.virtual("baseAccount").get(function () {
  if (this.entryType === "transfer") {
    return this.fromAccount;
  }
  return this.account;
});

export default mongoose.model<IEntry>("Entry", EntrySchema);
