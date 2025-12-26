import { Injectable, BadRequestException } from '@nestjs/common';
import { getFirebaseStorage } from '../../config/firebase.config';
import * as admin from 'firebase-admin';

@Injectable()
export class FileUploadService {
  private storage: admin.storage.Storage;

  constructor() {
    this.storage = getFirebaseStorage();
  }

  async uploadExpenseReceipt(
    file: Express.Multer.File,
    schoolId: string,
    expenseId: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    try {
      const bucket = this.storage.bucket();
      const fileName = `expenses/${schoolId}/${expenseId}/${Date.now()}_${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      // Upload file using stream
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', async () => {
          try {
            // Make file publicly accessible
            await fileUpload.makePublic();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        stream.end(file.buffer);
      });

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      return publicUrl;
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async uploadSchoolLogo(
    file: Express.Multer.File,
    schoolId: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds 5MB limit');
    }

    try {
      const bucket = this.storage.bucket();
      const fileName = `schools/${schoolId}/logo/${Date.now()}_${file.originalname}`;
      const fileUpload = bucket.file(fileName);

      // Upload file using stream
      const stream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        },
      });

      await new Promise<void>((resolve, reject) => {
        stream.on('error', reject);
        stream.on('finish', async () => {
          try {
            // Make file publicly accessible
            await fileUpload.makePublic();
            resolve();
          } catch (err) {
            reject(err);
          }
        });
        stream.end(file.buffer);
      });

      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      
      return publicUrl;
    } catch (error) {
      throw new BadRequestException(`Failed to upload file: ${error.message}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      const bucket = this.storage.bucket();
      // Extract file path from URL
      const urlParts = fileUrl.split('/');
      const fileName = urlParts.slice(urlParts.indexOf(bucket.name) + 1).join('/');
      
      await bucket.file(fileName).delete();
    } catch (error) {
      // Don't throw error if file doesn't exist
      console.warn(`Failed to delete file ${fileUrl}:`, error.message);
    }
  }
}

