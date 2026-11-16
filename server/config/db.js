import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config = {
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: process.env.SQL_TRUST_SERVER_CERTIFICATE === "true",
  },
};

if (process.env.SQL_USER && process.env.SQL_PASSWORD) {
  config.user = process.env.SQL_USER;
  config.password = process.env.SQL_PASSWORD;
} else {
  config.authentication = {
    type: "default",
  };
}

let pool;

export async function connectDB() {
  try {
    if (!pool) {
      pool = await sql.connect(config);
      console.log("SQL Server database connected successfully");
    }
    return pool;
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
}

export { sql };