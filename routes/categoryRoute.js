// routes/categoryRoute.js
const express = require("express");
const router = express.Router();
const Category = require("../models/categoryModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");

// Public: Get all categories
router.get("/get-all-categories", async (req, res) => {
  try {
    const { categoryType } = req.query;
    const filter = categoryType ? { categoryType } : {};
    const categories = await Category.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Create category
router.post("/create", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { categoryName, categoryType, subcategories } = req.body;
    const newCategory = new Category({
      categoryName,
      categoryType: categoryType || "general",
      subcategories: subcategories || [],
    });
    await newCategory.save();
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: newCategory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Update category
router.put("/update/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }
    res.json({
      success: true,
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Delete category
router.delete(
  "/delete/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const deleted = await Category.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

