import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern mongoose configurations (options are default-optimal in v8+)
    });
    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Failure: ${error.message}`);
    process.exit(1); // Force shutdown on initialization failure
  }
};

export default connectDB;


// import mysql from 'mysql2/promise'; // <-- CHANGED THIS LINE
// import dotenv from 'dotenv';
// dotenv.config();

// const pool = mysql.createPool({
//     host: process.env.DB_HOST,
//     port: process.env.DB_PORT,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_NAME,
//     waitForConnections: true,
//     connectionLimit: 10,
//     queueLimit: 0,
//     multipleStatements: false
// });

// export default pool;