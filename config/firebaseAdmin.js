const admin = require('firebase-admin');

// We will initialize it lazily when needed, or directly here if credentials are provided.
// The easiest way is to let the user set the path to their downloaded JSON file
// in the .env file as GOOGLE_APPLICATION_CREDENTIALS, OR parse it directly.

let isInitialized = false;

const initFirebaseAdmin = () => {
  if (isInitialized) return;

  try {
    const serviceAccountJsonStr = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (serviceAccountJsonStr) {
      // For Production (Render): Parse the JSON string from the environment variable
      const serviceAccount = JSON.parse(serviceAccountJsonStr);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isInitialized = true;
      console.log('Firebase Admin initialized successfully using JSON environment variable.');
    } else if (serviceAccountPath) {
      // For Local Development: Require the JSON file
      const serviceAccount = require(`../${serviceAccountPath}`);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      isInitialized = true;
      console.log('Firebase Admin initialized successfully using service account file.');
    } else {
      console.warn('Neither FIREBASE_SERVICE_ACCOUNT_JSON nor FIREBASE_SERVICE_ACCOUNT_PATH found in .env. Firebase endpoints will fail.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
};

initFirebaseAdmin();

module.exports = admin;
