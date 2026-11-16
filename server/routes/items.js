import express from "express";
import { sql, connectDB } from "../config/db.js";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();

// Create a lost or found item
router.post("/", authenticateUser, async (req, res) => {
  try {
    const {
      itemType,
      title,
      description,
      category,
      location,
      itemDate,
      imageUrl,
    } = req.body;

    if (!itemType || !title || !category || !location || !itemDate) {
      return res.status(400).json({
        message: "Item type, title, category, location, and date are required",
      });
    }

    if (!["Lost", "Found"].includes(itemType)) {
      return res.status(400).json({
        message: "Item type must be either Lost or Found",
      });
    }

    const pool = await connectDB();

    await pool
      .request()
      .input("UserId", sql.Int, req.user.userId)
      .input("ItemType", sql.NVarChar(10), itemType)
      .input("Title", sql.NVarChar(150), title)
      .input("Description", sql.NVarChar(sql.MAX), description || null)
      .input("Category", sql.NVarChar(50), category)
      .input("Location", sql.NVarChar(150), location)
      .input("ItemDate", sql.Date, itemDate)
      .input("ImageUrl", sql.NVarChar(500), imageUrl || null)
      .query(`
        INSERT INTO Items
        (UserId, ItemType, Title, Description, Category, Location, ItemDate, ImageUrl, Status)
        VALUES
        (@UserId, @ItemType, @Title, @Description, @Category, @Location, @ItemDate, @ImageUrl, 'Active')
      `);

    res.status(201).json({
      message: `${itemType} item reported successfully`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong while reporting the item",
    });
  }
});

// Get all items
router.get("/", async (req, res) => {
  try {
    const { itemType, category, location, search } = req.query;

    let query = `
      SELECT
        i.ItemId,
        i.ItemType,
        i.Title,
        i.Description,
        i.Category,
        i.Location,
        i.ItemDate,
        i.ImageUrl,
        i.Status,
        i.CreatedAt,
        u.FullName AS ReportedBy
      FROM Items i
      INNER JOIN Users u ON i.UserId = u.UserId
      WHERE i.Status = 'Active'
    `;

    const pool = await connectDB();
    const request = pool.request();

    if (itemType) {
      query += " AND i.ItemType = @ItemType";
      request.input("ItemType", sql.NVarChar(10), itemType);
    }

    if (category) {
      query += " AND i.Category = @Category";
      request.input("Category", sql.NVarChar(50), category);
    }

    if (location) {
      query += " AND i.Location LIKE @Location";
      request.input("Location", sql.NVarChar(150), `%${location}%`);
    }

    if (search) {
      query += " AND (i.Title LIKE @Search OR i.Description LIKE @Search)";
      request.input("Search", sql.NVarChar(150), `%${search}%`);
    }

    query += " ORDER BY i.CreatedAt DESC";

    const result = await request.query(query);

    res.json({
      items: result.recordset,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong while loading items",
    });
  }
});

// Get one item by ID
router.get("/:id", async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);

    if (!itemId) {
      return res.status(400).json({
        message: "Invalid item ID",
      });
    }

    const pool = await connectDB();

    const result = await pool
      .request()
      .input("ItemId", sql.Int, itemId)
      .query(`
        SELECT
          i.ItemId,
          i.ItemType,
          i.Title,
          i.Description,
          i.Category,
          i.Location,
          i.ItemDate,
          i.ImageUrl,
          i.Status,
          i.CreatedAt,
          u.FullName AS ReportedBy
        FROM Items i
        INNER JOIN Users u ON i.UserId = u.UserId
        WHERE i.ItemId = @ItemId
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Item not found",
      });
    }

    res.json({
      item: result.recordset[0],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Something went wrong while loading the item",
    });
  }
});

export default router;