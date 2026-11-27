// routes/blogsRoute.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const Blog = require("../models/blogModel");
const Activity = require("../models/activityModel");
const authMiddleware = require("../middlewares/authMiddleware");
const adminMiddleware = require("../middlewares/adminMiddleware");
const cloudinary = require("../config/cloudinaryConfig");
const { optimizeImageBuffer } = require("../helpers/imageOptimizer");

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

const uploadToCloudinary = async (rawBuffer, folder = "wizolingo/blogs") => {
  const buffer = await optimizeImageBuffer(rawBuffer);
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { resource_type: "auto", folder },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(buffer);
  });
};

const generateSlug = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((t) => String(t).trim()).filter(Boolean);
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      if (Array.isArray(parsed)) return parsed.map((t) => String(t).trim()).filter(Boolean);
    } catch {
      // ignore JSON parse error, fallback to comma separation
    }
    return tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
};

const calculateReadTime = (content) => {
  if (!content) return "1 min read";
  const cleanText = content.replace(/<[^>]*>?/gm, " ").trim();
  const words = cleanText.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

const resolveBlogDates = (inputDate, inputIsoDate) => {
  const raw = (inputIsoDate || inputDate || "").toString().trim();
  if (!raw) {
    const now = new Date();
    return {
      date: now.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
      isoDate: now.toISOString(),
    };
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const parsed = isDateOnly ? new Date(`${raw}T12:00:00.000Z`) : new Date(raw);

  if (!Number.isNaN(parsed.getTime())) {
    return {
      date: parsed.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
      isoDate: parsed.toISOString(),
    };
  }

  const fallbackNow = new Date();
  return {
    date: inputDate || fallbackNow.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    isoDate: inputIsoDate || fallbackNow.toISOString(),
  };
};

// ==========================================
// PUBLIC ROUTES
// ==========================================

// GET /api/blogs - Get all published blogs (with search, category, tag, pagination)
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      tag,
      status = "Published",
    } = req.query;

    const query = {};

    // By default, public endpoint only returns Published posts
    if (status) {
      query.status = status;
    }

    if (category && category !== "All") {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }

    if (tag) {
      query.tags = { $in: [new RegExp(tag, "i")] };
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { title: searchRegex },
        { excerpt: searchRegex },
        { tags: { $in: [searchRegex] } },
        { author: searchRegex },
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));

    const [blogs, total] = await Promise.all([
      Blog.find(query).sort({ isoDate: -1, createdAt: -1 }).skip(skip).limit(limitNum),
      Blog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: blogs,
      total,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/blogs/categories - Get distinct categories with counts
router.get("/categories", async (req, res) => {
  try {
    const categories = await Blog.aggregate([
      { $match: { status: "Published" } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({
      success: true,
      data: categories.map((c) => ({ name: c._id, count: c.count })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/blogs/tags - Get all distinct tags
router.get("/tags", async (req, res) => {
  try {
    const tags = await Blog.distinct("tags", { status: "Published" });
    res.json({ success: true, data: tags.filter(Boolean) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/blogs/:slugOrId - Get single blog by slug or MongoDB ObjectId (and increment views)
router.get("/:slugOrId", async (req, res) => {
  try {
    const { slugOrId } = req.params;
    let blog = null;

    if (slugOrId.match(/^[0-9a-fA-F]{24}$/)) {
      blog = await Blog.findById(slugOrId);
    }

    if (!blog) {
      blog = await Blog.findOne({ slug: slugOrId });
    }

    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    // Increment views atomically
    blog.views = (blog.views || 0) + 1;
    await blog.save();

    res.json({ success: true, data: blog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ADMIN ROUTES
// ==========================================

// GET /api/blogs/admin/all - Get all blogs including Drafts
router.get("/admin/all", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;
    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (category && category !== "All") {
      query.category = { $regex: new RegExp(`^${category}$`, "i") };
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [{ title: searchRegex }, { excerpt: searchRegex }, { author: searchRegex }];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));

    const [blogs, total] = await Promise.all([
      Blog.find(query).sort({ isoDate: -1, createdAt: -1 }).skip(skip).limit(limitNum),
      Blog.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: blogs,
      total,
      currentPage: parseInt(page, 10),
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/blogs/upload-inline-image - Upload inline image from Rich Text Editor
router.post(
  "/upload-inline-image",
  authMiddleware,
  adminMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file provided" });
      }

      const result = await uploadToCloudinary(req.file.buffer, "wizolingo/blogs/inline");
      res.json({
        success: true,
        url: result.secure_url,
        public_id: result.public_id,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /api/blogs/create - Create a new blog post
router.post(
  "/create",
  authMiddleware,
  adminMiddleware,
  upload.single("coverImage"),
  async (req, res) => {
    try {
      const {
        title,
        content,
        excerpt,
        category = "Articles",
        author = "Wiz Ofuasia Editorial",
        tags,
        status = "Published",
        readTime,
        date,
        isoDate,
      } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: "Title and content are required",
        });
      }

      // Generate base slug
      let baseSlug = generateSlug(title);
      if (!baseSlug) {
        baseSlug = `post-${Date.now()}`;
      }

      // Ensure unique slug
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (await Blog.findOne({ slug: uniqueSlug })) {
        uniqueSlug = `${baseSlug}-${counter++}`;
      }

      let coverImageUrl = req.body.coverImageUrl || "";
      let coverImagePublicId = "";

      if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer, "wizolingo/blogs/covers");
        coverImageUrl = uploadResult.secure_url;
        coverImagePublicId = uploadResult.public_id;
      }

      const parsedTags = parseTags(tags);
      const computedReadTime = readTime || calculateReadTime(content);
      const computedExcerpt =
        excerpt ||
        content
          .replace(/<[^>]*>?/gm, " ")
          .trim()
          .slice(0, 180) + "...";

      const { date: formattedDate, isoDate: resolvedIsoDate } = resolveBlogDates(date, isoDate);

      const blog = new Blog({
        title,
        slug: uniqueSlug,
        excerpt: computedExcerpt,
        content,
        category,
        author,
        readTime: computedReadTime,
        coverImage: coverImageUrl,
        coverImagePublicId,
        tags: parsedTags,
        status,
        isPublished: status === "Published",
        date: formattedDate,
        isoDate: resolvedIsoDate,
        createdBy: req.user?.userId || null,
      });

      await blog.save();

      // Log admin activity
      if (req.user?.userId) {
        new Activity({
          user: req.user.userId,
          action: "BLOG_CREATED",
          details: `Created blog post: "${blog.title}" (${blog.status})`,
          ipAddress: req.ip,
        })
          .save()
          .catch(() => {});
      }

      // Realtime emit
      if (req.io) {
        req.io.emit("new-blog", blog);
      }

      res.status(201).json({
        success: true,
        message: "Blog post created successfully",
        data: blog,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/blogs/update/:id - Update an existing blog post
router.put(
  "/update/:id",
  authMiddleware,
  adminMiddleware,
  upload.single("coverImage"),
  async (req, res) => {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return res.status(404).json({ success: false, message: "Blog post not found" });
      }

      const {
        title,
        slug,
        content,
        excerpt,
        category,
        author,
        tags,
        status,
        readTime,
        coverImageUrl,
        date,
        isoDate,
      } = req.body;

      if (title) blog.title = title;

      if (slug && slug !== blog.slug) {
        const cleanSlug = generateSlug(slug);
        const existing = await Blog.findOne({ slug: cleanSlug, _id: { $ne: blog._id } });
        if (existing) {
          return res.status(400).json({ success: false, message: "Slug is already in use" });
        }
        blog.slug = cleanSlug;
      }

      if (content !== undefined) {
        blog.content = content;
        if (!readTime) {
          blog.readTime = calculateReadTime(content);
        }
      }

      if (excerpt !== undefined) blog.excerpt = excerpt;
      if (category !== undefined) blog.category = category;
      if (author !== undefined) blog.author = author;
      if (readTime !== undefined) blog.readTime = readTime;
      if (status !== undefined) {
        blog.status = status;
        blog.isPublished = status === "Published";
      }

      if (tags !== undefined) {
        blog.tags = parseTags(tags);
      }

      if (date !== undefined || isoDate !== undefined) {
        const { date: resolvedDate, isoDate: resolvedIsoDate } = resolveBlogDates(date, isoDate);
        blog.date = resolvedDate;
        blog.isoDate = resolvedIsoDate;
      }

      // Handle cover image replacement
      if (req.file) {
        const uploadResult = await uploadToCloudinary(req.file.buffer, "wizolingo/blogs/covers");
        blog.coverImage = uploadResult.secure_url;
        blog.coverImagePublicId = uploadResult.public_id;
      } else if (coverImageUrl !== undefined) {
        blog.coverImage = coverImageUrl;
      }

      await blog.save();

      // Log admin activity
      if (req.user?.userId) {
        new Activity({
          user: req.user.userId,
          action: "BLOG_UPDATED",
          details: `Updated blog post: "${blog.title}"`,
          ipAddress: req.ip,
        })
          .save()
          .catch(() => {});
      }

      res.json({
        success: true,
        message: "Blog post updated successfully",
        data: blog,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// DELETE /api/blogs/delete/:id - Delete a blog post
router.delete("/delete/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog post not found" });
    }

    // Clean up cover image in Cloudinary if public_id exists
    if (blog.coverImagePublicId) {
      cloudinary.uploader.destroy(blog.coverImagePublicId).catch(() => {});
    }

    // Log admin activity
    if (req.user?.userId) {
      new Activity({
        user: req.user.userId,
        action: "BLOG_DELETED",
        details: `Deleted blog post: "${blog.title}"`,
        ipAddress: req.ip,
      })
        .save()
        .catch(() => {});
    }

    res.json({
      success: true,
      message: "Blog post deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

