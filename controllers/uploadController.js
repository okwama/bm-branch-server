const { cloudinary } = require('../config/cloudinary');

const uploadController = {
  uploadImage: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      res.json({
        url: req.file.path,
        public_id: req.file.filename
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      res.status(500).json({ message: 'Error uploading image' });
    }
  }
};

module.exports = uploadController; 