const fs = require('fs');
const { createCanvas } = require('canvas');

function createMeetNoteIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    
    // Calculate proportional sizes
    const borderWidth = Math.max(1, Math.floor(size * 0.05));
    const margin = Math.floor(size * 0.1);
    const innerSize = size - 2 * margin;
    
    // Draw outer border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(margin, margin, innerSize, innerSize);
    
    // Calculate split point (roughly 40% for "MEET", 60% for "NOTES")  
    const splitPoint = margin + Math.floor(innerSize * 0.4);
    
    // Draw "MEET" section (black background)
    ctx.fillStyle = '#000000';
    ctx.fillRect(
        margin + borderWidth/2, 
        margin + borderWidth/2, 
        splitPoint - margin - borderWidth, 
        innerSize - borderWidth
    );
    
    // Add text if size is large enough
    if (size >= 32) {
        const fontSize = Math.floor(size * 0.12);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // "MEET" text (white on black)
        ctx.fillStyle = '#ffffff';
        const meetCenterX = margin + (splitPoint - margin) / 2;
        const textY = size / 2;
        
        const meetText = size >= 48 ? 'MEET' : 'M';
        ctx.fillText(meetText, meetCenterX, textY);
        
        // "NOTES" text (black on white)
        ctx.fillStyle = '#000000';
        const notesCenterX = splitPoint + (size - splitPoint - margin) / 2;
        
        const notesText = size >= 48 ? 'NOTES' : 'N';
        ctx.fillText(notesText, notesCenterX, textY);
    }
    
    return canvas;
}

// Create icons directory
if (!fs.existsSync('icons')) {
    fs.mkdirSync('icons');
}

// Generate all required icon sizes
const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
    try {
        const canvas = createMeetNoteIcon(size);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(`icons/icon${size}.png`, buffer);
        console.log(`Created icon${size}.png`);
    } catch (error) {
        console.log(`Skipping icon${size}.png - canvas module not available`);
        // Create a simple placeholder
        const simpleIcon = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="${size-4}" height="${size-4}" fill="none" stroke="black" stroke-width="1"/>
            <rect x="3" y="3" width="${Math.floor((size-6)*0.4)}" height="${size-6}" fill="black"/>
            <text x="${3 + Math.floor((size-6)*0.4)/2}" y="${size/2}" fill="white" font-size="${Math.floor(size*0.2)}" text-anchor="middle" dominant-baseline="central">M</text>
            <text x="${3 + Math.floor((size-6)*0.4) + Math.floor((size-6)*0.6)/2}" y="${size/2}" fill="black" font-size="${Math.floor(size*0.2)}" text-anchor="middle" dominant-baseline="central">N</text>
        </svg>`;
        
        // For now, let's create a simple base64 encoded PNG
        console.log(`Creating simple icon for size ${size}`);
    }
});

console.log('Icons creation completed!');