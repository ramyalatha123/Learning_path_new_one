require('dotenv').config();
const cloudinary = require('./config/cloudinary');

console.log('Testing Cloudinary connection...');
console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.api.ping()
  .then(result => {
    console.log('✅ Cloudinary connection successful!');
    console.log('Result:', result);
  })
  .catch(error => {
    console.log('❌ Cloudinary connection failed!');
    console.error('Error:', error);
  });