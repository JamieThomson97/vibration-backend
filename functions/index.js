const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const cors = require('cors')({
    origin: true
  });
  
  exports.helloWorld = functions.https.onCall((req, res) => {
      cors(req, res, () => {
          res.send("Hello from Firebase!");
      });
  });

exports.addMix = functions.https.onCall((data, context) => {
    const uID = context.auth.uid     
    var mixData = {
        uID : uID,
        title : data.title,
        dateRecorded : data.dateRecorded,
        tracklist : data.tracklist,
        series : data.series
    }

    const ref = admin.firestore().collection('mixes')
    ref.add(mixData).then((snapshot) => {
        
        return snapshot
    
    }).catch((error) => {
        return error
    })

  })