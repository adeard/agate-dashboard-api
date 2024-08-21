const fs = require('fs');
const path = require('path');

const getImageFile = (filename) => {
  const imgPath = path.join(__dirname, 'images', filename);

  try {
    // Synchronously read the image file
    const data = fs.readFileSync(imgPath);

    // Convert the image data to Base64
    const base64Image = Buffer.from(data).toString('base64');

    return base64Image;
  } catch (err) {
    console.error('Failed to read image:', err);
    return null;
  }
};
module.exports = getImageFile;
