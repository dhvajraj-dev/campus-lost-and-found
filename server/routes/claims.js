import express from "express";
import { sql, connectDB } from "../config/db.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// Submit a claim for an item
router.post("/:itemId", authenticateUser, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { description, contactInfo } = req.body;

    if (!itemId || !description || !contactInfo) {
      return res.status(400).json({
        message: "Item ID, description, and contact information are required",
      });
    }

    const pool = await connectDB();

    const itemResult = await pool
      .request()
      .input("ItemId", sql.Int, itemId)
      .query("SELECT * FROM Items WHERE ItemId = @ItemId");

    const item = itemResult.recordset[0];

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    if (item.ItemType !== "Found") {
      return res.status(400).json({
        message: "Claims can only be submitted for found items",
      });
    }

    if (item.UserId === req.user.userId) {
      return res.status(400).json({
        message: "You cannot claim your own item",
      });
    }

    const existingClaim = await pool
      .request()
      .input("ItemId", sql.Int, itemId)
      .input("ClaimantId", sql.Int, req.user.userId)
      .query(`
        SELECT * FROM Claims
        WHERE ItemId = @ItemId AND ClaimantId = @ClaimantId
      `);

    if (existingClaim.recordset.length > 0) {
      return res.status(409).json({
        message: "You have already submitted a claim for this item",
      });
    }

    await pool
      .request()
      .input("ItemId", sql.Int, itemId)
      .input("ClaimantId", sql.Int, req.user.userId)
      .input("Description", sql.NVarChar(sql.MAX), description)
      .input("ContactInfo", sql.NVarChar(150), contactInfo)
      .query(`
        INSERT INTO Claims (ItemId, ClaimantId, Description, ContactInfo, Status)
        VALUES (@ItemId, @ClaimantId, @Description, @ContactInfo, 'Pending')
      `);

    res.status(201).json({
      message: "Claim submitted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong while submitting the claim",
    });
  }
});

// Get all claims for an item
router.get("/item/:itemId", authenticateUser, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);

    const pool = await connectDB();

    const itemResult = await pool
      .request()
      .input("ItemId", sql.Int, itemId)
      .query("SELECT * FROM Items WHERE ItemId = @ItemId");

    const item = itemResult.recordset[0];

    if (!item) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    if (item.UserId !== req.user.userId && req.user.role !== "Admin") {
      return res.status(403).json({
        message: "You are not allowed to view claims for this item",
      });
    }

    const result = await pool
      .request()
      .input("ItemId", sql.Int, itemId)
      .query(`
  SELECT
    c.ClaimId,
    c.ItemId,
    c.ClaimantId,
    c.Description,
    c.ContactInfo,
    c.Status,
    c.CreatedAt,
    i.UserId AS ItemOwnerId
  FROM Claims c
  INNER JOIN Items i ON c.ItemId = i.ItemId
  WHERE c.ClaimId = @ClaimId
`);

    res.json({
      claims: result.recordset,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong while loading claims",
    });
  }
});

// Approve or reject a claim
router.put("/:claimId", authenticateUser, async (req, res) => {
  try {
    const claimId = parseInt(req.params.claimId);
    const { status } = req.body;

    if (!claimId) {
      return res.status(400).json({
        message: "Invalid claim ID",
      });
    }

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({
        message: "Status must be either Approved or Rejected",
      });
    }

    const pool = await connectDB();

    const claimResult = await pool
      .request()
      .input("ClaimId", sql.Int, claimId)
      .query(`
        SELECT
          c.ClaimId,
          c.ItemId,
          c.ClaimantId,
          c.Description,
          c.ContactInfo,
          c.Status,
          c.CreatedAt,
          i.UserId AS ItemOwnerId
        FROM Claims c
        INNER JOIN Items i ON c.ItemId = i.ItemId
        WHERE c.ClaimId = @ClaimId
      `);

    const claim = claimResult.recordset[0];

    if (!claim) {
      return res.status(404).json({
        message: "Claim not found",
      });
    }

    if (claim.ItemOwnerId !== req.user.userId && req.user.role !== "Admin") {
      return res.status(403).json({
        message: "You are not allowed to update this claim",
      });
    }

    await pool
      .request()
      .input("ClaimId", sql.Int, claimId)
      .input("Status", sql.NVarChar(20), status)
      .query(`
        UPDATE Claims
        SET Status = @Status
        WHERE ClaimId = @ClaimId
      `);

    if (status === "Approved") {
      const itemId = parseInt(claim.ItemId);

      await pool
        .request()
        .input("ItemId", sql.Int, itemId)
        .query(`
          UPDATE Items
          SET Status = 'Claimed'
          WHERE ItemId = @ItemId
        `);
    }

    res.json({
      message: `Claim ${status.toLowerCase()} successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong while updating the claim",
    });
  }
});
export default router;