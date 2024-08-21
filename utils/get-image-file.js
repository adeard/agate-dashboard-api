const fs = require('fs');
const path = require('path');

const getImageFile = (filename) => {
  let imgPath = path.join(__dirname, 'images', filename);

  fs.readFile(imgPath, (err, data) => {
    if (err) {
      console.log('Fail read image');
      return;
    }

    const base64Image = Buffer.from(data).toString('base64');
    return base64Image;
  });
};

module.exports = getImageFile;
