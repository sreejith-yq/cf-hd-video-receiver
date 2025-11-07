import { Firestore } from '@google-cloud/firestore';

// Initialize Firestore (will be done per request in Cloudflare Workers)
function initFirestore(credentials) {
  return new Firestore({
    projectId: credentials.project_id,
    credentials: credentials,
  });
}

export default {
  async fetch(request, env, ctx) {
    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Parse the incoming request body
      const requestBody = await request.json();
      const { videoUrl, fileName, firestoreDocId } = requestBody;

      // Validate input parameters
      if (!videoUrl || !fileName || !firestoreDocId) {
        return new Response(
          JSON.stringify({ error: 'Missing required parameters: videoUrl, fileName, firestoreDocId' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Parse Firestore credentials from environment
      if (!env.FIRESTORE_PRIVATE_KEY_JSON) {
        throw new Error('FIRESTORE_PRIVATE_KEY_JSON environment variable is missing');
      }

      let firestoreCredentials;
      try {
        firestoreCredentials = JSON.parse(env.FIRESTORE_PRIVATE_KEY_JSON);
      } catch (err) {
        console.error('Invalid Firestore credentials JSON:', err);
        throw new Error('Invalid Firestore credentials');
      }

      // Initialize Firestore
      const db = initFirestore(firestoreCredentials);

      // Get a reference to the document
      const docRef = db.collection('videos').doc(firestoreDocId);

      // Check if the document exists
      const docSnapshot = await docRef.get();

      if (!docSnapshot.exists) {
        // If the document does not exist, create it with the initial data
        await docRef.set({
          fileName: fileName,
          videoUrl: videoUrl,
          status: 'processing',
          createdAt: new Date(),
        });
        console.log('Document created');
      } else {
        // If the document exists, update the status field
        await docRef.update({ status: 'processing' });
        console.log('Document updated');
      }

      // Send message to Cloudflare Queue (replaces Step Function)
      await env.VIDEO_QUEUE.send({
        videoUrl,
        fileName,
        firestoreDocId,
      });

      return new Response(
        JSON.stringify({ message: 'Video processing started' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      console.error('Error:', error);

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error.message,
          stack: error.stack,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
