// routes/productsRoute.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Activity = require("../models/activityModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const cloudinary = require("../config/cloudinaryConfig");

require("../models/categoryModel");
require("../models/discountModel");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
});

const uploadToCloudinary = (file, folder) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "auto", folder },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(file.buffer);
  });

const parseArrayField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback to comma-separated string
    }
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const parseJsonField = (value, fallback = []) => {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

// Admin: Create Product (Merch or Digital Music Download)
router.post(
  "/create/product",
  authMiddleware,
  adminMiddleware,
  upload.fields([
    { name: "attachments", maxCount: 10 },
    { name: "digitalFiles", maxCount: 20 },
    { name: "previewFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        productName,
        slug,
        productType,
        description,
        price,
        categories,
        subcategoryId,
        quantity,
        colors,
        sizes,
        shipping,
        digitalReleaseType,
        artist,
        releaseDate,
        duration,
        previewUrl,
        tracklist,
        isFeatured,
        isActive,
      } = req.body;

      const attachmentFiles = req.files?.attachments || [];
      const digitalUploadFiles = req.files?.digitalFiles || [];
      const previewUploadFile = req.files?.previewFile?.[0];

      const attachmentUrls = await Promise.all(
        attachmentFiles.map(async (file) => {
          const resUpload = await uploadToCloudinary(
            file,
            "wizolingo/product-attachments"
          );
          return resUpload.secure_url;
        })
      );

      let uploadedDigitalFiles = [];
      if (digitalUploadFiles.length > 0) {
        uploadedDigitalFiles = await Promise.all(
          digitalUploadFiles.map(async (file) => {
            const resUpload = await uploadToCloudinary(
              file,
              "wizolingo/digital-music"
            );
            const ext = file.originalname.split(".").pop()?.toLowerCase() || "mp3";
            const allowedFormats = ["mp3", "wav", "flac", "aac", "zip", "pdf"];
            return {
              fileName: file.originalname,
              fileUrl: resUpload.secure_url,
              publicId: resUpload.public_id,
              fileFormat: allowedFormats.includes(ext) ? ext : "mp3",
              fileSize: file.size || 0,
            };
          })
        );
      } else if (req.body.digitalFilesJson) {
        uploadedDigitalFiles = parseJsonField(req.body.digitalFilesJson, []);
      }

      let resolvedPreviewUrl = previewUrl || "";
      if (previewUploadFile) {
        const previewRes = await uploadToCloudinary(
          previewUploadFile,
          "wizolingo/digital-previews"
        );
        resolvedPreviewUrl = previewRes.secure_url;
      }

      const categoryIds = parseArrayField(categories).map(
        (id) => new mongoose.Types.ObjectId(id)
      );
      const processedSubcategoryId = subcategoryId
        ? new mongoose.Types.ObjectId(subcategoryId)
        : null;

      const resolvedType = productType || "merch";

      const newProduct = new Product({
        productName,
        slug:
          slug ||
          productName
            ?.toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        productType: resolvedType,
        description,
        price: Number(price),
        categories: categoryIds,
        subcategoryId: processedSubcategoryId,
        quantity: resolvedType === "digital_music" ? 999999 : Number(quantity || 0),
        color: parseArrayField(colors),
        size: parseArrayField(sizes),
        shipping:
          resolvedType === "digital_music"
            ? false
            : shipping !== undefined
            ? shipping === "true" || shipping === true
            : true,
        digitalReleaseType: digitalReleaseType || "",
        artist: artist || "Wiz Ofuasia (Wizboyy)",
        releaseDate: releaseDate ? new Date(releaseDate) : undefined,
        duration: duration || "",
        previewUrl: resolvedPreviewUrl,
        digitalFiles: uploadedDigitalFiles,
        tracklist: parseJsonField(tracklist, []),
        attachments: attachmentUrls,
        isFeatured: isFeatured === "true" || isFeatured === true,
        isActive: isActive !== undefined ? isActive === "true" || isActive === true : true,
      });

      await newProduct.save();

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: newProduct,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Update Product
router.put(
  "/update/product/:id",
  authMiddleware,
  adminMiddleware,
  upload.fields([
    { name: "attachments", maxCount: 10 },
    { name: "digitalFiles", maxCount: 20 },
    { name: "previewFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const existingProduct = await Product.findById(req.params.id);
      if (!existingProduct) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }

      const {
        productName,
        slug,
        productType,
        description,
        price,
        categories,
        subcategoryId,
        quantity,
        colors,
        sizes,
        shipping,
        existingAttachments,
        digitalReleaseType,
        artist,
        releaseDate,
        duration,
        previewUrl,
        tracklist,
        isFeatured,
        isActive,
      } = req.body;

      const attachmentFiles = req.files?.attachments || [];
      const digitalUploadFiles = req.files?.digitalFiles || [];
      const previewUploadFile = req.files?.previewFile?.[0];

      const newAttachmentUrls = await Promise.all(
        attachmentFiles.map(async (file) => {
          const resUpload = await uploadToCloudinary(
            file,
            "wizolingo/product-attachments"
          );
          return resUpload.secure_url;
        })
      );

      const retainedAttachments = existingAttachments
        ? parseArrayField(existingAttachments)
        : existingProduct.attachments;

      const updateFields = {
        attachments: [...retainedAttachments, ...newAttachmentUrls],
      };

      if (productName !== undefined) updateFields.productName = productName;
      if (slug !== undefined) updateFields.slug = slug;
      if (productType !== undefined) updateFields.productType = productType;
      if (description !== undefined) updateFields.description = description;
      if (price !== undefined) updateFields.price = Number(price);
      if (quantity !== undefined) updateFields.quantity = Number(quantity);
      if (colors !== undefined) updateFields.color = parseArrayField(colors);
      if (sizes !== undefined) updateFields.size = parseArrayField(sizes);
      if (shipping !== undefined) {
        updateFields.shipping = shipping === "true" || shipping === true;
      }
      if (categories !== undefined) {
        updateFields.categories = parseArrayField(categories).map(
          (id) => new mongoose.Types.ObjectId(id)
        );
      }
      if (subcategoryId !== undefined) {
        updateFields.subcategoryId = subcategoryId
          ? new mongoose.Types.ObjectId(subcategoryId)
          : null;
      }
      if (digitalReleaseType !== undefined) {
        updateFields.digitalReleaseType = digitalReleaseType;
      }
      if (artist !== undefined) updateFields.artist = artist;
      if (releaseDate !== undefined) {
        updateFields.releaseDate = releaseDate ? new Date(releaseDate) : null;
      }
      if (duration !== undefined) updateFields.duration = duration;
      if (previewUrl !== undefined) updateFields.previewUrl = previewUrl;
      if (tracklist !== undefined) {
        updateFields.tracklist = parseJsonField(tracklist, []);
      }
      if (isFeatured !== undefined) {
        updateFields.isFeatured = isFeatured === "true" || isFeatured === true;
      }
      if (isActive !== undefined) {
        updateFields.isActive = isActive === "true" || isActive === true;
      }

      if (previewUploadFile) {
        const previewRes = await uploadToCloudinary(
          previewUploadFile,
          "wizolingo/digital-previews"
        );
        updateFields.previewUrl = previewRes.secure_url;
      }

      if (digitalUploadFiles.length > 0) {
        const uploadedDigitalFiles = await Promise.all(
          digitalUploadFiles.map(async (file) => {
            const resUpload = await uploadToCloudinary(
              file,
              "wizolingo/digital-music"
            );
            const ext = file.originalname.split(".").pop()?.toLowerCase() || "mp3";
            const allowedFormats = ["mp3", "wav", "flac", "aac", "zip", "pdf"];
            return {
              fileName: file.originalname,
              fileUrl: resUpload.secure_url,
              publicId: resUpload.public_id,
              fileFormat: allowedFormats.includes(ext) ? ext : "mp3",
              fileSize: file.size || 0,
            };
          })
        );
        updateFields.digitalFiles = [
          ...(existingProduct.digitalFiles || []),
          ...uploadedDigitalFiles,
        ];
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        updateFields,
        { new: true }
      );

      res.json({
        success: true,
        message: "Product updated successfully",
        data: updatedProduct,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Delete Product
router.delete(
  "/delete/product/:id",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const deleted = await Product.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Product not found" });
      }
      res.json({ success: true, message: "Product deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Admin: Get All Products (includes digitalFiles URLs)
router.get(
  "/admin/all-products",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { productType } = req.query;
      const filter = productType ? { productType } : {};
      const products = await Product.find(filter)
        .populate("categories")
        .populate("discounts")
        .sort({ createdAt: -1 });

      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// Public: Get All Active Products (excludes raw digitalFiles.fileUrl for security)
router.get("/get-all-products", async (req, res) => {
  try {
    const { productType, category, featured, search } = req.query;
    const filter = { isActive: true };

    if (productType) filter.productType = productType;
    if (category) filter.categories = category;
    if (featured === "true") filter.isFeatured = true;
    if (search) {
      filter.productName = { $regex: search, $options: "i" };
    }

    const products = await Product.find(filter)
      .select("-digitalFiles.fileUrl -digitalFiles.publicId")
      .populate("categories")
      .populate("discounts")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Public: Get Single Product by ID (excludes raw digitalFiles.fileUrl)
router.get("/get-product/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select("-digitalFiles.fileUrl -digitalFiles.publicId")
      .populate("categories")
      .populate("discounts");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Protected: Download Purchased Digital Music Files
router.get("/download/:productId", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product || product.productType !== "digital_music") {
      return res.status(404).json({
        success: false,
        message: "Digital music product not found",
      });
    }

    // Verify user has a paid/unlocked order containing this product
    const paidOrder = await Order.findOne({
      user: userId,
      "products._id": new mongoose.Types.ObjectId(productId),
      $or: [
        { downloadUnlocked: true },
        { paymentStatus: "completed" },
        { status: { $in: ["Payment Confirmed", "Delivered"] } },
      ],
    });

    if (!paidOrder && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Purchase required to download this digital release.",
      });
    }

    product.downloadCount += 1;
    await product.save();

    await new Activity({
      user: userId,
      action: "DIGITAL_DOWNLOADED",
      details: `Downloaded digital release: ${product.productName}`,
      ipAddress: req.ip,
    }).save();

    res.json({
      success: true,
      message: "Digital download links retrieved",
      data: {
        productId: product._id,
        productName: product.productName,
        artist: product.artist,
        digitalReleaseType: product.digitalReleaseType,
        digitalFiles: product.digitalFiles,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

