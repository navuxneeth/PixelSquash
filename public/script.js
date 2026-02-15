// API Base URL
const API_BASE_URL = '';

// Update file count display
function updateFileCount(inputId, countId) {
    const input = document.getElementById(inputId);
    const countDiv = document.getElementById(countId);
    
    if (input.files.length > 0) {
        countDiv.textContent = `✓ ${input.files.length} file(s) selected`;
        countDiv.style.color = '#00ff00';
    } else {
        countDiv.textContent = '';
    }
}

// Show status message
function showStatus(featureId, message, type = 'loading') {
    const statusDiv = document.getElementById(`feature${featureId}Status`);
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
}

// Show/hide progress bar
function toggleProgress(featureId, show) {
    const progressDiv = document.getElementById(`feature${featureId}Progress`);
    progressDiv.style.display = show ? 'block' : 'none';
}

// Download file from blob
function downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Feature 1: Fetch images from website
async function fetchImages() {
    const urlInput = document.getElementById('websiteUrl');
    const url = urlInput.value.trim();

    if (!url) {
        showStatus(1, '⚠ Please enter a website URL', 'error');
        return;
    }

    // Basic URL validation
    try {
        new URL(url);
    } catch (error) {
        showStatus(1, '⚠ Please enter a valid URL (include http:// or https://)', 'error');
        return;
    }

    try {
        showStatus(1, '🔍 Fetching images from website...', 'loading');
        toggleProgress(1, true);

        const response = await fetch(`${API_BASE_URL}/api/fetch-images`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url }),
        });

        toggleProgress(1, false);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch images');
        }

        const blob = await response.blob();
        downloadFile(blob, 'website-images.zip');
        
        showStatus(1, '✓ Images downloaded successfully! Check your downloads folder.', 'success');
    } catch (error) {
        toggleProgress(1, false);
        showStatus(1, `✗ Error: ${error.message}`, 'error');
    }
}

// Feature 2: Convert images to WebP
async function convertToWebP() {
    const input = document.getElementById('imageFiles');
    const files = input.files;

    if (files.length === 0) {
        showStatus(2, '⚠ Please select at least one image', 'error');
        return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    for (let file of files) {
        if (!validTypes.includes(file.type)) {
            showStatus(2, `⚠ Invalid file type: ${file.name}. Only JPG, JPEG, and PNG are allowed.`, 'error');
            return;
        }
    }

    try {
        showStatus(2, `🔄 Converting ${files.length} image(s) to WebP...`, 'loading');
        toggleProgress(2, true);

        const formData = new FormData();
        for (let file of files) {
            formData.append('images', file);
        }

        const response = await fetch(`${API_BASE_URL}/api/convert-to-webp`, {
            method: 'POST',
            body: formData,
        });

        toggleProgress(2, false);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to convert images');
        }

        const blob = await response.blob();
        downloadFile(blob, 'converted-images.zip');
        
        showStatus(2, `✓ ${files.length} image(s) converted to WebP successfully!`, 'success');
        
        // Reset file input
        input.value = '';
        updateFileCount('imageFiles', 'imageCount');
    } catch (error) {
        toggleProgress(2, false);
        showStatus(2, `✗ Error: ${error.message}`, 'error');
    }
}

// Feature 3: Convert video/gif to WebM
async function convertToWebM() {
    const input = document.getElementById('videoFile');
    const file = input.files[0];

    if (!file) {
        showStatus(3, '⚠ Please select a video or GIF file', 'error');
        return;
    }

    // Validate file type
    const validTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 
                       'video/x-flv', 'video/webm', 'image/gif', 'video/x-matroska'];
    const isValidType = validTypes.includes(file.type) || 
                       file.name.toLowerCase().endsWith('.gif') ||
                       file.name.toLowerCase().endsWith('.mp4') ||
                       file.name.toLowerCase().endsWith('.mov') ||
                       file.name.toLowerCase().endsWith('.avi') ||
                       file.name.toLowerCase().endsWith('.mkv');

    if (!isValidType) {
        showStatus(3, '⚠ Invalid file type. Please select a video or GIF file.', 'error');
        return;
    }

    try {
        showStatus(3, '🎬 Converting to WebM... This may take a while...', 'loading');
        toggleProgress(3, true);

        const formData = new FormData();
        formData.append('video', file);

        const response = await fetch(`${API_BASE_URL}/api/convert-to-webm`, {
            method: 'POST',
            body: formData,
        });

        toggleProgress(3, false);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to convert video');
        }

        const blob = await response.blob();
        const filename = file.name.replace(/\.[^/.]+$/, '') + '.webm';
        downloadFile(blob, filename);
        
        showStatus(3, '✓ Video converted to WebM successfully!', 'success');
        
        // Reset file input
        input.value = '';
        updateFileCount('videoFile', 'videoCount');
    } catch (error) {
        toggleProgress(3, false);
        showStatus(3, `✗ Error: ${error.message}`, 'error');
    }
}

// Add Enter key support for URL input
document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('websiteUrl');
    if (urlInput) {
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                fetchImages();
            }
        });
    }
});
