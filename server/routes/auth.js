import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sql, connectDB } from "../config/db.js";

const router = express.Router();

// Register a new user
router.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        message: "Full name, email, and password are required",
      });
    }

    const pool = await connectDB();

    const existingUser = await pool
      .request()
      .input("Email", sql.NVarChar(150), email)
      .query("SELECT * FROM Users WHERE Email = @Email");

    if (existingUser.recordset.length > 0) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("FullName", sql.NVarChar(100), fullName)
      .input("Email", sql.NVarChar(150), email)
      .input("PasswordHash", sql.NVarChar(500), passwordHash)
      .query(`
        INSERT INTO Users (FullName, Email, PasswordHash, Role)
        VALUES (@FullName, @Email, @PasswordHash, 'User')
      `);

    res.status(201).json({
      message: "Account created successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong while creating the account",
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("Email", sql.NVarChar(150), email)
      .query("SELECT * FROM Users WHERE Email = @Email");

    const user = result.recordset[0];

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.PasswordHash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.UserId,
        email: user.Email,
        role: user.Role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        userId: user.UserId,
        fullName: user.FullName,
        email: user.Email,
        role: user.Role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong while logging in",
    });
  }
});

export default router;