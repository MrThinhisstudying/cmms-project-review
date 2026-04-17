// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp = require('sharp');
import * as fs from 'fs';
import * as path from 'path';

export interface CompressImageOptions {
    /** Max width in pixels (default: 1920) */
    maxWidth?: number;
    /** Max height in pixels (default: 1920) */
    maxHeight?: number;
    /** JPEG quality 1-100 (default: 80) */
    quality?: number;
    /** File size threshold in bytes — skip if smaller (default: 500KB) */
    skipBelowBytes?: number;
    /** Keep PNG format for transparency (e.g. signatures) */
    keepPng?: boolean;
}

const DEFAULT_OPTIONS: CompressImageOptions = {
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 80,
    skipBelowBytes: 500 * 1024, // 500KB
    keepPng: false,
};

/**
 * Compress an image file in-place using Sharp.
 * - Skips files smaller than threshold
 * - Resizes to max dimensions (preserving aspect ratio)
 * - Converts to JPEG (or keeps PNG if keepPng=true)
 * - Returns the (possibly new) filename
 */
export async function compressImage(
    filePath: string,
    options: CompressImageOptions = {},
): Promise<{ outputPath: string; originalSize: number; compressedSize: number; skipped: boolean }> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Check file exists
    if (!fs.existsSync(filePath)) {
        return { outputPath: filePath, originalSize: 0, compressedSize: 0, skipped: true };
    }

    const stats = fs.statSync(filePath);
    const originalSize = stats.size;

    // Skip small files
    if (originalSize <= opts.skipBelowBytes) {
        return { outputPath: filePath, originalSize, compressedSize: originalSize, skipped: true };
    }

    const ext = path.extname(filePath).toLowerCase();
    const isPng = ext === '.png';
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, ext);

    try {
        let pipeline = sharp(filePath).resize(opts.maxWidth, opts.maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
        });

        let outputPath: string;

        if (opts.keepPng && isPng) {
            // Keep PNG but optimize (dùng cho chữ ký số - cần giữ transparency)
            pipeline = pipeline.png({ quality: opts.quality, compressionLevel: 9 });
            outputPath = filePath; // overwrite in place
        } else {
            // ⚡ WebP + Chroma Subsampling 4:4:4
            // - chromaSubsampling 4:4:4: Giữ nguyên 100% thông tin màu,
            //   chữ trên bằng cấp/CCCD/TOEIC không bị nhòe viền (color bleeding)
            // - quality 80: Cân bằng tối ưu giữa dung lượng và chất lượng quang học
            // - effort 4: Tốc độ nén trung bình, không gây nghẽn CPU server
            pipeline = pipeline.webp({
                quality: opts.quality,
                chromaSubsampling: '4:4:4',
                effort: 4,
            });
            outputPath = path.join(dir, `${basename}.webp`);
        }

        const tempPath = path.join(dir, `_temp_${basename}${opts.keepPng && isPng ? '.png' : '.webp'}`);
        await pipeline.toFile(tempPath);

        // Get compressed size
        const compressedStats = fs.statSync(tempPath);
        const compressedSize = compressedStats.size;

        // If compressed is larger, keep original
        if (compressedSize >= originalSize) {
            fs.unlinkSync(tempPath);
            return { outputPath: filePath, originalSize, compressedSize: originalSize, skipped: true };
        }

        // Replace original with compressed
        if (outputPath === filePath) {
            fs.unlinkSync(filePath);
            fs.renameSync(tempPath, filePath);
        } else {
            // Different extension: remove old, rename temp
            fs.unlinkSync(filePath);
            fs.renameSync(tempPath, outputPath);
        }

        console.log(`[ImageCompression] ${path.basename(filePath)}: ${(originalSize/1024).toFixed(0)}KB → ${(compressedSize/1024).toFixed(0)}KB (${((1 - compressedSize/originalSize) * 100).toFixed(0)}% smaller)`);

        return { outputPath, originalSize, compressedSize, skipped: false };
    } catch (error) {
        console.error(`[ImageCompression] Error compressing ${filePath}:`, error);
        // On error, keep original file untouched
        return { outputPath: filePath, originalSize, compressedSize: originalSize, skipped: true };
    }
}
