// A module for cleaner functions

// Index.js is a fucking mess

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
var database = admin.firestore();


// This function is called when a user submits a new mix
// Notes : 
    // Doesn't have functionality for actual audio file yet,
    // Needs to trigger further function to send new mID to followers' timelines'
exports.addMix = functions.https.onCall((data, context) => {
    const uID = context.auth.uid

    // Receives data from request and puts into an object
    var mixData = {
      uID: uID,
      title: data.title,
      dateUploaded: new Date(),
      tracklist: data.tracklist,
      series: data.series
    }
    console.log(mixData)
    // .add function adds a new object to the specified reference
    const ref = admin.firestore().collection('mixes')
    return ref.add(mixData).then((snapshot) => {
        //Get this of uIDs from 'followers' subCollection
        return snapshot
  
    }).catch((error) => {
      return error
    })

  })

  // What needs to happen every time a producer adds a new mix ?
  // All of their followers should have the new mix inserted at the top of their 'timeline' subCollections


// This function is called when a user deletes one of their own mixes
// Notes:
    // Doesn't have functionality for actual audio file yet,
exports.deleteMix = functions.https.onCall((data, response) => {
    var promises = []

    // Get the mixID and the userid from the request
    const mID = data.mID
    const uID = data.uID

    // Get array of all follower IDs
    const ref = database.collection('users').doc(uID).collection('followers')
    ref.get((snapshot) => {
      const timeline = snapshot.docs
          console.log(timeline.length)
          for (var entry = 0; entry < timeline.length; entry++) {
            console.log(timeline[entry])
            // Adds the document to an array, that will be passed into the next function --- *** currently working on, is not yet designed correctly, may cause errors ***
            // Must ensure that when new mix is added, the cloud function creates the entries elsewhere using the SAME DOCUMENT ID, otherwise this will fail
            const item = timeline[entry].data()
            mIDs[timeline[entry]] = (item)
          }
          console.log(mIDs)
    })
  
    // Remove mID from all follower 'timeline collections        
    // Delete the mix using the mID reference from the 'mixes' collection 
    // and user 'mixes' collection
    promises.push(database.collection("mixes").doc(mID).delete())
    promises.push(database.collection("users").doc(uID).collection('mixes').doc(mID).delete())
    return Promise.all(promises).then(() => {
      return {
        'message': "Documents successfully deleted!"
      }
    }).catch((error) => {
      return {
        'message': "Error removing document: " + error
      }
    });
  })


// Function to receive a path to a subcollection, possibly uID, and return all the objects in that subcollection -- for getting lists of IDs

function returnIDs(uID, subCollection, ordered){
    //Create query based on uID and subCollection given

    // uID = 'perfectUser' //uID
    // subCollection = 'timeline'

    // var query = 

    //if statement for if ordered or not

    //populate array with mIDs

    //Return --- may need to be a promise
}

// Function to receive a list of IDs and a subcollection, and return all information about those IDs

function returnData(mIDs, subCollection){
    // Populate a list of promises with the mIDs passed
    var promises = []
    var results = []

    // Send Promist.all

    // Populate results with returned information

    // Return --- may need to be a promise
}

// Function to receive a path to a subcollection, and another subcollection, of which will contain meta data about the first subcollection's objects
// and return the meta data
exports.getData = functions.https.onCall((data, response) => {

    //uID = data.uID
    //subCollection = data.subCollection
    //ordered = data.ordered

    //Call returnIDs with uID, subCollection and ordered variables

    //Call returnData with returnIDs and subCollection --- must be async after returnIDs is complete
})

// Function to return the X most recent entries into a subcollection
// This function is to be used for returning data that needs to be ordered by date, and by date only
// This will be used for retrieving timelines / mixes
// Will receive a uID and the subCollection in order to work out the path
exports.getSubCollectionbyDate = functions.https.onCall((data, response) => {

  var results = []
  const uID = data.uID
  const subCollection = data.subCollection
  const amount = data.amount

  console.log(uID+subCollection+amount)
  
  const query = database.collection('users').doc(uID).collection(subCollection).orderBy("dateUploaded", "DESC").limit(amount)

  return query.get().then((snapshot) => {
    const documents = snapshot.docs
    console.log(documents.length)
    for (var entry = 0; entry < documents.length; entry++){
      
      // Adds the document to an array, that will be passed into the next function --- *** currently working on, is not yet designed correctly, may cause errors ***
      // Must ensure that when new mix is added, the cloud function creates the entries elsewhere using the SAME DOCUMENT ID, otherwise this will fail
      const item = documents[entry].data()
     
      results.push(item)
      
    }
    return (results)
  }).catch((error) => {
    console.log(error)
  })
})