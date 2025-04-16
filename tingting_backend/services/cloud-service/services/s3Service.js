const { s3 } = require('../config/awsConfig');
const { PutObjectCommand, DeleteObjectsCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');

class S3Service {
  async uploadFile(file) {
    const fileKey = `${uuidv4()}-${file.originalname}`;
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };
    await s3.send(new PutObjectCommand(params));
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    const thumbnailUrl = await this.generateAndUploadThumbnail(file, fileKey);

    return {
      fileUrl,
      thumbnailUrl,
      filename: file.originalname,
    };
  }

  async uploadMultipleFiles(files) {
    const uploadPromises = files.map(file => this.uploadFile(file));
    return Promise.all(uploadPromises);
  }

  async generateAndUploadThumbnail(file, originalKey) {
    const thumbnailKey = `thumbnails/${originalKey}`;
    let thumbnailBuffer;

    if (file.mimetype.startsWith('image/')) {
      thumbnailBuffer = await sharp(file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toBuffer();
    } else if (file.mimetype.startsWith('video/')) {
      thumbnailBuffer = await new Promise((resolve, reject) => {
        ffmpeg({ source: file.buffer })
          .screenshots({
            count: 1,
            folder: '/tmp',
            size: '200x200',
            filename: 'thumbnail.jpg',
          })
          .on('end', () => {
            const fs = require('fs');
            const buffer = fs.readFileSync('/tmp/thumbnail.jpg');
            fs.unlinkSync('/tmp/thumbnail.jpg');
            resolve(buffer);
          })
          .on('error', reject);
      });
    } else {
      return null;
    }

    const thumbnailParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: thumbnailKey,
      Body: thumbnailBuffer,
      ContentType: 'image/jpeg',
    };
    await s3.send(new PutObjectCommand(thumbnailParams));
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${thumbnailKey}`;
  }

  async deleteFiles(fileUrls, thumbnailUrls) {
    const objectsToDelete = [];

    // Thêm file gốc vào danh sách xóa
    if (fileUrls) {
      fileUrls.forEach(url => {
        const key = url.split(`https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
        objectsToDelete.push({ Key: key });
      });
    }

    // Thêm thumbnail vào danh sách xóa
    if (thumbnailUrls) {
      thumbnailUrls.forEach(url => {
        const key = url.split(`https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
        objectsToDelete.push({ Key: key });
      });
    }

    if (objectsToDelete.length === 0) return;

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Delete: {
        Objects: objectsToDelete,
        Quiet: false,
      },
    };
    await s3.send(new DeleteObjectsCommand(params));
  }
}

module.exports = new S3Service();