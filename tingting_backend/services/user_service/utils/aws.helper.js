import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import multer from 'multer';
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}.local` });

AWS.config.update({
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

export const dynamoDB = new AWS.DynamoDB.DocumentClient();

export const S3 = new AWS.S3();
const storage = multer.memoryStorage({
    destination: function (req, file, callback) {
        callback(null, '');
    }
});

export const upload = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5
    }
}).single('avatar');


