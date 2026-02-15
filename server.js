const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cheerio = require('cheerio');
const sharp = require('sharp');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const cors = require('cors');
const ffmpeg = require('fluent-ffmpeg');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting middleware
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/api/', apiLimiter);

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit per file
});

// Helper function to clean up temporary files
async function cleanupFiles(files) {
    for (const file of files) {
        try {
            await fs.unlink(file);
        } catch (error) {
            console.error(`Failed to delete file: ${file}`, error);
        }
    }
}

// Feature 1: Fetch images from a website
app.post('/api/fetch-images', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Fetch the webpage
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 30000
        });

        const $ = cheerio.load(response.data);
        const imageUrls = new Set();

        // Find all image elements
        $('img').each((i, elem) => {
            const src = $(elem).attr('src');
            if (src) {
                // Convert relative URLs to absolute
                try {
                    const absoluteUrl = new URL(src, url).href;
                    imageUrls.add(absoluteUrl);
                } catch (error) {
                    // Skip invalid URLs
                }
            }
        });

        // Also check for images in CSS backgrounds
        $('[style*="background"]').each((i, elem) => {
            const style = $(elem).attr('style');
            const urlMatch = style.match(/url\(['"]?(.*?)['"]?\)/);
            if (urlMatch && urlMatch[1]) {
                try {
                    const absoluteUrl = new URL(urlMatch[1], url).href;
                    imageUrls.add(absoluteUrl);
                } catch (error) {
                    // Skip invalid URLs
                }
            }
        });

        if (imageUrls.size === 0) {
            return res.status(404).json({ error: 'No images found on the webpage' });
        }

        // Download all images
        const imageFiles = [];
        const downloadPromises = Array.from(imageUrls).map(async (imgUrl, index) => {
            try {
                const imgResponse = await axios.get(imgUrl, {
                    responseType: 'arraybuffer',
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const ext = path.extname(new URL(imgUrl).pathname) || '.jpg';
                const filename = `image_${index}${ext}`;
                const filepath = path.join('uploads', filename);

                await fs.writeFile(filepath, imgResponse.data);
                imageFiles.push({ path: filepath, name: filename });
            } catch (error) {
                console.error(`Failed to download image: ${imgUrl}`, error.message);
            }
        });

        await Promise.all(downloadPromises);

        if (imageFiles.length === 0) {
            return res.status(500).json({ error: 'Failed to download any images' });
        }

        // Create zip file
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="website-images.zip"');

        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(res);

        // Add files to zip
        for (const file of imageFiles) {
            archive.file(file.path, { name: file.name });
        }

        await archive.finalize();

        // Cleanup files after response finishes
        res.on('finish', () => {
            cleanupFiles(imageFiles.map(f => f.path));
        });

    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({ error: 'Failed to fetch images: ' + error.message });
    }
});

// Feature 2: Convert images to WebP
app.post('/api/convert-to-webp', upload.array('images', 100), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No images uploaded' });
        }

        const convertedFiles = [];

        // Convert each image to WebP
        for (const file of req.files) {
            try {
                const outputFilename = path.basename(file.originalname, path.extname(file.originalname)) + '.webp';
                const outputPath = path.join('uploads', outputFilename);

                await sharp(file.path)
                    .webp({ quality: 90 })
                    .toFile(outputPath);

                convertedFiles.push({ path: outputPath, name: outputFilename });
            } catch (error) {
                console.error(`Failed to convert ${file.originalname}:`, error.message);
            }
        }

        if (convertedFiles.length === 0) {
            // Cleanup original files
            await cleanupFiles(req.files.map(f => f.path));
            return res.status(500).json({ error: 'Failed to convert any images' });
        }

        // Create zip file
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="converted-images.zip"');

        const archive = archiver('zip', { zlib: { level: 9 } });
        
        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(res);

        // Add files to zip
        for (const file of convertedFiles) {
            archive.file(file.path, { name: file.name });
        }

        await archive.finalize();

        // Cleanup files after response finishes
        res.on('finish', () => {
            const allFiles = [
                ...req.files.map(f => f.path),
                ...convertedFiles.map(f => f.path)
            ];
            cleanupFiles(allFiles);
        });

    } catch (error) {
        console.error('Error converting images:', error);
        if (req.files) {
            await cleanupFiles(req.files.map(f => f.path));
        }
        res.status(500).json({ error: 'Failed to convert images: ' + error.message });
    }
});

// Feature 3: Convert video/gif to WebM
app.post('/api/convert-to-webm', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video/gif uploaded' });
        }

        const outputFilename = path.basename(req.file.originalname, path.extname(req.file.originalname)) + '.webm';
        const outputPath = path.join('uploads', outputFilename);

        // Convert to WebM using ffmpeg
        await new Promise((resolve, reject) => {
            ffmpeg(req.file.path)
                .outputOptions([
                    '-c:v libvpx-vp9',
                    '-crf 30',
                    '-b:v 0',
                    '-deadline good',
                    '-cpu-used 0'
                ])
                .output(outputPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        // Send the converted file
        res.setHeader('Content-Type', 'video/webm');
        res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);

        const fileStream = fsSync.createReadStream(outputPath);
        fileStream.pipe(res);

        // Cleanup files after response finishes
        res.on('finish', () => {
            cleanupFiles([req.file.path, outputPath]);
        });

    } catch (error) {
        console.error('Error converting video:', error);
        if (req.file) {
            await cleanupFiles([req.file.path]);
        }
        res.status(500).json({ error: 'Failed to convert video: ' + error.message });
    }
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fsSync.existsSync(uploadsDir)) {
    fsSync.mkdirSync(uploadsDir);
}

app.listen(PORT, () => {
    console.log(`PixelSquash server running on port ${PORT}`);
});
