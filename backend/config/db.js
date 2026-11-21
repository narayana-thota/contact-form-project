import mongoose from "mongoose";

export async function connectDB() {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error("Missing required environment variable: MONGODB_URI");
    }

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully.");
}
