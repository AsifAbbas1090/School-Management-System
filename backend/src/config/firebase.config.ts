import * as admin from 'firebase-admin';
import * as path from 'path';

export const initializeFirebase = () => {
  if (!admin.apps.length) {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyDeV223z7zyIg8OxWXb39Zs_R1C4qhdqD4',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'school-management-system-89089.firebaseapp.com',
      projectId: process.env.FIREBASE_PROJECT_ID || 'school-management-system-89089',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'school-management-system-89089.firebasestorage.app',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '498595011078',
      appId: process.env.FIREBASE_APP_ID || '1:498595011078:web:d04d422a97edbb2fe40187',
    };

    // Try to initialize with service account key file first
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
    
    try {
      // Check if service account file exists
      const fs = require('fs');
      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: firebaseConfig.storageBucket,
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        // Use path from environment variable
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          storageBucket: firebaseConfig.storageBucket,
        });
      } else {
        // Fallback: Initialize with project ID only (limited functionality)
        console.warn('Firebase Admin SDK: No service account found. File uploads may not work. Please set up service account.');
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
        });
      }
    } catch (error) {
      console.warn('Firebase initialization warning:', error.message);
      // Try minimal initialization
      try {
        admin.initializeApp({
          projectId: firebaseConfig.projectId,
          storageBucket: firebaseConfig.storageBucket,
        });
      } catch (e) {
        console.error('Failed to initialize Firebase:', e.message);
      }
    }
  }

  return admin;
};

export const getFirebaseStorage = () => {
  const app = admin.apps[0] || initializeFirebase();
  return admin.storage();
};

