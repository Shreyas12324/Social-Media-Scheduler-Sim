const cron = require('node-cron');
const AWS = require('aws-sdk');
const axios = require('axios');
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'us-east-1' }); // Change region if needed

const TABLE_NAME = 'social-media-posts';

async function fetchScheduledPosts() {
    const now = new Date().toISOString(); // Get current time in UTC
    console.log('Current time (UTC):', now); // Log current time for debugging
  
    const params = {
      TableName: TABLE_NAME,
      FilterExpression: '#status = :status AND #scheduleTime <= :now',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#scheduleTime': 'scheduleTime'
      },
      ExpressionAttributeValues: {
        ':status': 'scheduled',
        ':now': now // Compare current time with the scheduled time in UTC
      }
    };
  
    const result = await dynamoDB.scan(params).promise();
    console.log('Fetched posts:', result.Items); // Log the fetched posts
  
    return result.Items;
  }
  
  
  

async function publishPost(post) {
  // Log current time (UTC) and schedule time (from DB) for debugging
  const now = new Date().toISOString();
  console.log('Current time (UTC):', now);
  console.log('Schedule time (stored in DB):', post.scheduleTime);

  // Simulate publishing logic (e.g., call social media API)
  console.log('Publishing post:', post.postId);

  const updateParams = {
    TableName: TABLE_NAME,
    Key: { postId: post.postId },
    UpdateExpression: 'set #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'posted' }
  };

  await dynamoDB.update(updateParams).promise();
}

async function checkAndPublish() {
    try {
      const posts = await fetchScheduledPosts();
  
      for (const post of posts) {
        // Add this code to log the times
        const now = new Date().toISOString();
        console.log('Current time (UTC):', now);
        console.log('Scheduled time (stored in DB):', post.scheduleTime);
  
        // Continue with the logic to publish the post
        await publishPost(post);
      }
    } catch (err) {
      console.error('Error checking/publishing posts:', err);
    }
  }
  

// 🔁 Run every minute
cron.schedule('* * * * *', () => {
  console.log('⏰ Checking for scheduled posts...');
  checkAndPublish();
});
