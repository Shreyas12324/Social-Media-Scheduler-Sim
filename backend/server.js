const express = require('express'); 
const multer = require('multer');
const AWS = require('aws-sdk');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid'); // Import uuid
require('dotenv').config();  // Load environment variables
require('./scheduler'); // Just import it once to kick it off


// Set region from .env file
AWS.config.update({ region: process.env.AWS_REGION });

const app = express();
app.use(cors());
const port = 5000;

// AWS region & credentials will come from ~/.aws/config
AWS.config.update({ region: 'us-east-1' });  

const s3 = new AWS.S3();
const dynamoDB = new AWS.DynamoDB.DocumentClient(); // DynamoDB client

// Multer temp upload
const upload = multer({ dest: 'uploads/' });

const handleSchedule = async (req, res) => {
  try {
    const { text, scheduleTime } = req.body;
    const file = req.file;

    console.log('S3 Bucket Name:', process.env.S3_BUCKET_NAME);

    const fileContent = fs.readFileSync(file.path);
    const s3Params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `media/${Date.now()}_${file.originalname}`,
      Body: fileContent,
      ContentType: file.mimetype,
      Metadata: {
        text: text, // Store text as metadata
      }
    };
    

    // Upload file to S3
    const uploadResult = await s3.upload(s3Params).promise();

    // Generate a presigned URL for the uploaded file
    const presignedUrl = s3.getSignedUrl('getObject', {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: uploadResult.Key,
      Expires: 60 * 5, // URL valid for 5 minutes
    });

    // Clean up temp file
    fs.unlinkSync(file.path);

    // Log the results
    console.log('Uploaded to S3:', uploadResult.Location);
    console.log('Presigned URL:', presignedUrl);

    // Save post metadata into DynamoDB
    const postParams = {
      TableName: 'social-media-posts', // Your DynamoDB table name
      Item: {
        postId: uuidv4(), // Use UUID for unique postId
        text: text,
        scheduleTime: scheduleTime,
        s3Url: uploadResult.Location,
        status: 'scheduled', // You can add additional status info if needed
        createdAt: new Date().toISOString(),
      }
    };

    // Insert the post metadata into DynamoDB
    console.log('Post Params:', postParams);
    await dynamoDB.put(postParams).promise();

    // Send response with the text and presigned URL
    res.json({ 
      message: 'Post scheduled successfully', 
      s3Url: presignedUrl, 
      text: text 
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to upload and schedule post', error: err.message });
  }
};

app.post(['/schedule', '/api/schedule'], upload.single('image'), handleSchedule);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
