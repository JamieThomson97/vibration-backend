const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp()
var database = admin.firestore()

const cors = require('cors')({
    origin: true
  });
  
  exports.helloWorld = functions.https.onRequest((req, res) => {
      cors(req, res, () => {
          res.send("Hello from Firebase!");
      });
  });


  exports.whenNewMix = functions.database.ref('/mixes').onCreate((change, context) => {

    //When a new document is added to 'mixes' collections
        console.log(change)
        return {data : change}
    
    //Get artist 
    //Get list of followers
    //Post mID + some other info to every followers' 'timeline' collection
})


exports.deleteMix = functions.https.onCall((data, response) => {
    var promises = []
    //Get the mixID and the userid
    const mID = data.mID
    const uID = data.uID
    //return { 'mID' : mID, 'uID' : uID}
    //Delete the mix using the mID reference from the 'mixes' collection and user 'mixes' collection
    promises.push(database.collection("mixes").doc(mID).delete())
    promises.push(database.collection("users").doc(uID).collection('mixes').doc(mID).delete())
    return Promise.all(promises).then(() => {
       return { 'message' : "Documents successfully deleted!" }
    }).catch((error) => {
        return { 'message' : "Error removing document: "+error }
    });    
})

