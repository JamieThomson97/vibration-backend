const functions = require('firebase-functions');

const cors = require('cors')({
    origin: true
  });
  
  exports.helloWorld = functions.https.onRequest((req, res) => {
      cors(req, res, () => {
          res.send("Hello from Firebase!");
      });
  });