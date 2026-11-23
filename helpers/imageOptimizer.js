// helpers/imageOptimizer.js
const sharp = require("sharp");

/**
 * Optimizes an image buffer if it exceeds a certain size or is an image.
 * Resizes down to a maximum dimension (default: 2400px) and compresses to high-quality JPEG.
 * Keeps file sizes well under Cloudinary's 10MB limit while preserving crisp resolution.
 */
const optimizeImageBuffer = async (buffer, maxDimension = 2400, quality = 85) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return buffer;
  }

  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata && (metadata.width || metadata.height)) {
      // Optimize if over 2MB or dimensions exceed maxDimension
      if (
        buffer.length > 2 * 1024 * 1024 ||
        (metadata.width && metadata.width > maxDimension) ||
        (metadata.height && metadata.height > maxDimension)
      ) {
        return await sharp(buffer)
          .rotate() // auto-orient based on EXIF
          .resize({
            width: maxDimension,
            height: maxDimension,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality, progressive: true })
          .toBuffer();
      }
    }
  } catch {
    // If not a standard raster image or sharp cannot process, return original buffer
    return buffer;
  }

  return buffer;
};

module.exports = { optimizeImageBuffer };

