const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
var database = admin.firestore();

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
    uID: uID,
    title: data.title,
    dateRecorded: data.dateRecorded,
    tracklist: data.tracklist,
    series: data.series
  }

  const ref = admin.firestore().collection('mixes')
  ref.add(mixData).then((snapshot) => {

    return snapshot

  }).catch((error) => {
    return error
  })
})

exports.whenNewMix = functions.database.ref('/mixes').onCreate((change, context) => {

  //When a new document is added to 'mixes' collections
  console.log(change)
  return {
    data: change
  }

  //Get artist 
  //Get list of followers
  //Post mID + some other info to every followers' 'timeline' collection
})


exports.deleteMix = functions.https.onCall((data, response) => {
  var promises = []
  //Get the mixID and the userid
  const mID = data.mID
  const uID = data.uID
  //Get array of all follower IDs
  const followersRef = database.ref('users/' + 'dpgTmumbFLaw4shaKBLJfymiZCv1' + '/followers')
  ref.once("value", (response) => {
    console.log(response.val());
  })

  //Remove mID from all follower 'timeline collections        
  //return { 'mID' : mID, 'uID' : uID}
  //Delete the mix using the mID reference from the 'mixes' collection 
  //and user 'mixes' collection
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


exports.testFunction = functions.https.onCall((data, response) => {
    // var promises = []
    // //Get the mixID and the userid
    // const mID = data.mID
    // const uID = data.uID
    //Get array of all follower IDs
    const followersRef = admin.firestore().collection('users').doc('dpgTmumbFLaw4shaKBLJfymiZCv1/followers').collection('followers')
    followersRef.once("value", (response) => {
      console.log(response.val());
      return response.val()
    })
    // //Remove mID from all follower 'timeline collections
    // //return { 'mID' : mID, 'uID' : uID}
    // //Delete the mix using the mID reference from the 'mixes' collection 
    // //and user 'mixes' collection
    // promises.push(database.collection("mixes").doc(mID).delete())
    // promises.push(database.collection("users").doc(uID).collection('mixes').doc(mID).delete())
    // return Promise.all(promises).then(() => {
    //    return { 'message' : "Documents successfully deleted!" }
    // }).catch((error) => {
    //     return { 'message' : "Error removing document: "+error }
    // });    
  }),

  
  exports.getObjects = functions.https.onCall((data, response) => {
    IDs = pullID("m9neT7uGxRVXXLkT7Gyf7lzGwXb2", "mixes", true)
    return IDs
  })

  //function to extract db reference needed based on the userID and subCollection Name

  
  //Returns a list of xIDs --- x is dependent on the subCollection, may be user, mix, etc...
  function pullID(uID, subCollection, ordered){
    // uID = data.uID
    // subCollection = data.subCollection
    // ordered = data.ordered
    if (ordered) {

      mIDsPromise = (getmIDs_ordered(admin.firestore().collection('users').doc(uID).collection(subCollection)))
    } else {

      mIDsPromise = (getmIDs_no_order(admin.firestore().collection('users').doc(uID).collection(subCollection)))
    }

    //THEN query the databse for the meta information about the mIDs returned

    return mIDsPromise.then((response) => {
      console.log('response')
      return response
    }).catch(error => {
      console.log('error')
      return error
    })
  }

  // exports.pullObjects = functions.https.onCall((data , response) => {
  //   IDs = ['BcrPHyajlu821uVaWkF1' , 'RnlHcuKoo84FDNfE4Qzb'] //data.ids
  //   return pullObjects(IDs)
  // })

  function pullObjects(IDs) {
    return new Promise(resolve => {
      
      var results = []
      const promises = []
      for (const mID in IDs) {
        const currentMix = IDs[mID]
        console.log(currentMix+"  currentMix")
        const promise = admin.firestore().doc(`mixes/${currentMix}`).get()
        promises.push(promise)
      }

      return Promise.all(promises).then((mixes) => {
        mixes.forEach(mix => {
          const data = mix.data()
          data.mID = mix.id
          console.log(data)
          results.push(data)
        })
        resolve(results)
        return results
      })
    })
  }



  function dbExtract(uID, subCollection) {
    return admin.firestore().collection('users').doc(uID).collection(subCollection)
  }

  function getmIDs_no_order(ref) {
   return new Promise(resolve => {
      var mIDs = []
      ref.get().then((snapshot) => {
        const documents = snapshot.docs
        for (var entry = 0; entry < documents.length; entry++) {
         // console.log(documents[entry].id)
          // Adds the document to an array, that will be passed into the next function --- *** currently working on, is not yet designed correctly, may cause errors ***
          // Must ensure that when new mix is added, the cloud function creates the entries elsewhere using the SAME DOCUMENT ID, otherwise this will fail
          const item = documents[entry].id
          mIDs.push(item)
        }
        //console.log(mIDs)
        resolve (mIDs)
        return (mIDs)
      }).catch((error) => {
        console.log(error)
      })
    })
  }

  function getmIDs_ordered(ref) {
    var mIDs = []
    console.log('hi')
    ref.orderBy("dateRecorded", "asc").limit(12).get().then((snapshot) => {
      const documents = snapshot.docs
      for (var entry = 0; entry < documents.length; entry++) {
        //console.log(timeline[entry].id)
        // Adds the document to an array, that will be passed into the next function --- *** currently working on, is not yet designed correctly, may cause errors ***
        // Must ensure that when new mix is added, the cloud function creates the entries elsewhere using the SAME DOCUMENT ID, otherwise this will fail
        const item = timeline[entry].id
        mIDs.push(item)
      }
      //console.log(mIDs)
      return (mIDs)
    }).catch((error) => {
      console.log(error)
    })
  }



//   Todo

//   Functions needed :

//   1) Get database ref from a uID and sub collection Reference 
//   2) Get a list of xIDs when passed a DB ref
//   3) Get an object of mix information when passed a list of mIDs
// 2 & 3 would have to occur ASYNC

//   4) Delete all references of something when passed a list of xIDs 
// 2 & 4 would have to occur ASYNC

// 5) Add the new mix information to all followers' timelines when a new mix is added to the mixes collection
