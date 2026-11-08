
import mongoose from 'mongoose';

// Reuse the connection cache across serverless invocations.
const cached = globalThis.__mongooseCache || {
  connection: null,
  promise: null
};

globalThis.__mongooseCache = cached;

export async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  // Return an existing connection.
  if (
    cached.connection &&
    mongoose.connection.readyState === 1
  ) {
    return cached.connection;
  }

  // Reuse an ongoing connection attempt.
  if (cached.promise && mongoose.connection.readyState === 2) {
    cached.connection = await cached.promise;
    return cached.connection;
  }

  // Create a new connection when disconnected.
  if (
    !cached.promise ||
    mongoose.connection.readyState === 0
  ) {
    cached.connection = null;

    cached.promise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10
      })
      .then(instance => instance.connection)
      .catch(error => {
        cached.promise = null;
        cached.connection = null;
        throw error;
      });
  }

  cached.connection = await cached.promise;

  return cached.connection;
}
