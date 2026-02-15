# 🎮 PixelSquash

A pixel-themed web application for powerful image and video processing with a retro aesthetic.

## Features

### 🖼️ Feature 1: Website Image Scraper
Extract all images from any website and download them as a convenient ZIP file.

### 🎨 Feature 2: Batch Image Converter
Convert unlimited JPG, JPEG, and PNG images to the efficient WebP format with batch processing and ZIP download.

### 🎬 Feature 3: Video/GIF to WebM Converter
Convert videos and GIFs to the modern WebM format for better compression and quality.

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express
- **Fonts**: VT323 (Google Fonts) for pixel/retro aesthetic
- **Image Processing**: Sharp
- **Video Processing**: FFmpeg (via fluent-ffmpeg)
- **Web Scraping**: Axios, Cheerio
- **File Compression**: Archiver

## Installation

1. Clone the repository:
```bash
git clone https://github.com/navuxneeth/PixelSquash.git
cd PixelSquash
```

2. Install dependencies:
```bash
npm install
```

3. Install FFmpeg (required for video conversion):
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **macOS**: `brew install ffmpeg`
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Use any of the three features:
   - **Image Scraper**: Enter a website URL and click "Fetch Images"
   - **Image Converter**: Upload images and click "Convert to WebP"
   - **Video Converter**: Upload a video/GIF and click "Convert to WebM"

## API Endpoints

### POST /api/fetch-images
Fetch images from a website URL.
- **Body**: `{ "url": "https://example.com" }`
- **Response**: ZIP file containing all images

### POST /api/convert-to-webp
Convert images to WebP format.
- **Body**: FormData with `images` field (multiple files)
- **Response**: ZIP file containing converted WebP images

### POST /api/convert-to-webm
Convert video/GIF to WebM format.
- **Body**: FormData with `video` field (single file)
- **Response**: WebM video file

## Features & Limitations

- **Image Scraper**: Supports most websites, respects standard image formats
- **Image Converter**: No file size or quantity limits (within server capacity)
- **Video Converter**: Supports MP4, AVI, MOV, GIF, and other common formats

## Design

The application features a retro pixel aesthetic with:
- VT323 monospace font for a classic terminal look
- Green/cyan color scheme reminiscent of old CRT monitors
- Scanline effects and glow animations
- Responsive design for mobile and desktop

## License

ISC