import { S3 } from './aws.helper.js';
import {AWS_BUCKET_NAME } from '../config/env.js';

const randomString = (numberCharacter) => {
  return ` ${Math.random()
    .toString(36)
    .substring(2, numberCharacter + 2)}`;
};

const FILE_TYPE_MATCH = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/jpg",
  "video/mp3",
  "video/mp4",
  "application/pdf",
  "application/msword",
  "application/vnd.rar",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.document",
];

export const uploadImage = async (file) => {
  const filePath = `${randomString(4)}-${new Date().getTime()}-${
    file?.originalname
  }`;
  
  if (FILE_TYPE_MATCH.includes(file.mimetype) == -1) {
    throw new Error(`${file?.originalname} is not supported`);
  }

  const uploadParams = {
    Bucket: AWS_BUCKET_NAME,
    Key: filePath,
    Body: file.buffer,
    ContentType: file.mimetype
  };

  try {  
    const data = await S3.upload(uploadParams).promise();
    const fileUrl = data.Location;
    console.log(`File uploaded successfully : ${fileUrl}`);

    return fileUrl;
  } catch (error) {
    console.log(`Error uploading file: ${error}`);
    // throw new Error(`Error uploading file: ${error}`);
  }
};
