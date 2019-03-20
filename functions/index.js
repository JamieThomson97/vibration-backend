// A module for cleaner functions
//firebase deploy --only functions
// firebase functions:shell
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
  
  var firstPromises = []
  var mixPromises = []
  uID = context.auth.uid
  // Receives data from request and puts into an object
  var mixData = {
    uID: uID,
    title: data.title,
    dateUploaded: new Date(),
    tracklist: data.tracklist,
    series: data.series,
    producer : data.producer,
  }

  const followersProm = returnIDs(uID, 'followers', false)
  var mID = database.collection("mixes").add(mixData).then(response => {
    return response.id
  }).catch(error => {
    return error
  })

  firstPromises.push(followersProm)
  firstPromises.push(mID)

  return Promise.all(firstPromises).then(response => {
    mIDs = response[0]
    mID = response[1]
    console.log(mID)
    mixPromises.push(database.collection("users").doc(uID).collection('mixes').doc(mID).set(mixData))
    for (var follower in mIDs) {
      console.log(follower)
      mixPromises.push(database.collection("users").doc(mIDs[follower]).collection('timeline').doc(mID).set(mixData))
    }
    return response
  }).then(() => {
    return Promise.all(mixPromises)
  }).catch(error => {
    console.log(error)
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
  followersProm = returnIDs(uID, 'followers', false)
  return followersProm.then((response) => {
    promises.push(database.collection("mixes").doc(mID).delete())
    promises.push(database.collection("users").doc(uID).collection('mixes').doc(mID).delete())
    for (var follower in response) {
      promises.push(database.collection("users").doc(response[follower]).collection('timeline').doc(mID).delete())
    }
    return promises
  }).then(response => {
    return Promise.all(promises)
    }).catch((error) => {
      return {
        'message': "Error removing document: " + error
      }
    }).then(response => {
      return 'success deleting mix'
    }).catch(error => {
      return error
    })
})

 
  // Remove mID from all follower 'timeline collections        
  // Delete the mix using the mID reference from the 'mixes' collection 
  // and user 'mixes' collection


// Function to receive a path to a subcollection, possibly uID, and return all the objects in that subcollection -- for getting lists of IDs

//function returnIDs(uID, subCollection, orderBy){
function returnIDs(uID, subCollection, orderBy){
  //Create query based on uID and subCollection given
  results = []
   
   //if statement for if ordered or not
  if (!orderBy) {
    var query = database.collection('users').doc(uID).collection(subCollection)
  }
  else {
    query = database.collection('users').doc(uID).collection(subCollection).orderBy(orderBy, "DESC").limit(12)
  }
   
  return query.get().then((snapshot) => {
    const documents = snapshot.docs
    for (var entry = 0; entry < documents.length; entry++){
      
      // Adds the document to an array, that will be passed into the next function --- *** currently working on, is not yet designed correctly, may cause errors ***
      // Must ensure that when new mix is added, the cloud function creates the entries elsewhere using the SAME DOCUMENT ID, otherwise this will fail
      const item = documents[entry].id
      results.push(item)
      
    }
    return (results)
  }).catch((error) => {
    console.log(error)
  })
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

  const query = database.collection('users').doc(uID).collection(subCollection).orderBy("dateUploaded", "DESC").limit(amount)

  return query.get().then((snapshot) => {
    const documents = snapshot.docs
   
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

function getSubCollection(uID, subCollection, amount){

  var results = []
  
  if (!amount) {
    query = database.collection('users').doc(uID).collection(subCollection)
  } else {
    query = database.collection('users').doc(uID).collection(subCollection).orderBy("dateUploaded", "DESC").limit(amount)
  }

  return query.get().then((snapshot) => {
    const documents = snapshot.docs
   
    for (var entry = 0; entry < documents.length; entry++){
      const item = documents[entry].data()
      item['id'] = documents[entry].id
      results.push(item)
    }
    return (results)
  }).catch((error) => {
    console.log(error)
  })
}

exports.followUser = functions.https.onCall((data, response) => {
  
  followingName = data.followingName // The name of the user that is being followed
  followeruID = data.followeruID // The uID of the user that is doing the following
  followerName = data.followerName // The name of the user that is doing the following 
  follow = data.follow

  // followingName = 'Test Producer' // The name of the user that is being followed
  // followeruID = 'GBeZHcjhNjX44PXcJ8mE5BeYLBj2' // The uID of the user that is doing the following
  // followerName = 'Perfet User' // The name of the user that is doing the following 
  // follow = false 

  
  followingNameObject = {
    'name' : followingName
  }
  followerNameObject = {
    'name' : followerName
  }
  const followinguID = database.collection('users').where('name', '==', followingName).get().then(response => { //The uID of the user that is being followed
    return response.docs[0].id
  }).catch(error => {
    return error
  })

  var promises = []
  //Promise to add followerUID and name to the 'followers' sub collection of the user being followed. and update the aggregate count,
 //Add followerUID and name to the 'followers' sub collection of the user being followed. and update the aggregate count,
  var copyfuID = null
  
  return followinguID.then(response => {
    
    if (follow) {
      promises.push(database.collection('users').doc(response).collection('followers').doc(followeruID).set(followerNameObject))
      promises.push(database.collection('users').doc(followeruID).collection('following').doc(response).set(followingNameObject))
      promises.push(editTimeline(followeruID , response, true))
    } else {
      promises.push(database.collection('users').doc(response).collection('followers').doc(followeruID).delete())
      promises.push(database.collection('users').doc(followeruID).collection('following').doc(response).delete())
      promises.push(editTimeline(followeruID , response, false))
    }

    return Promise.all(promises)
  }).catch(error => {
    return error
  })
})

// Function called when a user follows another user
// User that was just followed's mixes will be added to the 'timeline' subcollection of the user that just followed them
function editTimeline(followeruID, followeduID, copy) {
  promises = []
  //Get user that has been followed mixes
  const mixes = getSubCollection(followeduID, 'mixes', false)
 
  //Add them to the user doing the 'following's timeline

  return mixes.then(response => {
    for (i in response) {
      mix = response[i]
      
      if (copy) {

        addMix = {
          'dateUploaded': mix.dateUploaded,
          'series' : mix.series,
          'title': mix.title,
          'tracklist' : mix.tracklist,
          'uID': mix.uID,
          'producer' : mix.producer,
        }

        setter = database.collection('users').doc(followeruID).collection('timeline').doc(mix.id).set(addMix)
      } else {
        setter = database.collection('users').doc(followeruID).collection('timeline').doc(mix.id).delete()
      }
      promises.push(setter)
    }
    return promises
  }).then(response => {
    return Promise.all(promises)
  })
}

exports.unFollowUser = functions.https.onCall((data, response) => {
  //unFollowUser({ 'followingName' : 'Producer Jamie' , 'followeruID' : 'GBeZHcjhNjX44PXcJ8mE5BeYLBj2' , 'followerName' : 'Perfect User'})
  followingName = data.followingName // The name of the user that is being unfollowed
  followeruID = data.followeruID // The uID of the user that is doing the following
  followerName = data.followerName // The name of the user that is doing the following 
  
  followingNameObject = {
    'name' : followingName
  }
  followerNameObject = {
    'name' : followerName
  }

  
  //Get the following uID from the following name

  const followinguID = database.collection('users').where('name', '==', followingName).get().then(response => { //The uID of the user that is being followed
    return response.docs[0].id
  }).catch(error => {
    return error
  })

  var promises = []
  //Promise to add followerUID and name to the 'followers' sub collection of the user being followed. and update the aggregate count,

  
  
  //Add followerUID and name to the 'followers' sub collection of the user being followed. and update the aggregate count,

  return followinguID.then(response => {
    console.log(response)
    console.log(promises.length)
    
    promises.push(database.collection('users').doc(response).collection('followers').doc(followeruID).delete())
    console.log('hello')
    promises.push(database.collection('users').doc(followeruID).collection('following').doc(response).delete())
    console.log(promises.length)
    return Promise.all(promises)
  }).catch(error =>{
    return error
  })
})


exports.addedFollower = functions.firestore
  .document('users/{uID}/followers/{fID}')
  .onCreate((change, context) => {
    
    const uID = context.params.uID
    console.log('added follower')

    uIDRef =  database.collection('users').doc(uID)
    
    // Update aggregations in a transaction
    return database.runTransaction(transaction => {
      return transaction.get(uIDRef).then(uIDDoc => {
        // Compute new number of followers
        console.log(uIDDoc.data().followerCount)
        var newFollowersCount = uIDDoc.data().followerCount + 1
        console.log('old count ^^^^ -- new count (below)')
        console.log(newFollowersCount)
        
        // Update followers info
        return transaction.update(uIDRef, {
          followerCount: newFollowersCount
        })
      })
    })
  })

  exports.lostFollower = functions.firestore
  .document('users/{uID}/followers/{fID}')
  .onDelete((change, context) => {
    
    const uID = context.params.uID
    //const fID = context.params.fID

    uIDRef =  database.collection('users').doc(uID)
    
    // Update aggregations in a transaction
    return database.runTransaction(transaction => {
      return transaction.get(uIDRef).then(uIDDoc => {
        // Compute new number of followers
        console.log(uIDDoc.data().followerCount)
        var newFollowersCount = uIDDoc.data().followerCount -1
        console.log('old count ^^^^ -- new count (below)')
        console.log(newFollowersCount)

        
        // Update followers info
        return transaction.update(uIDRef, {
          followerCount: newFollowersCount
        })
      })
    })
})

exports.addedFollowing = functions.firestore
  .document('users/{uID}/following/{fID}')
  .onCreate((change, context) => {
    const uID = context.params.uID
    //const fID = context.params.fID

    uIDRef =  database.collection('users').doc(uID)
    
    // Update aggregations in a transaction
    return database.runTransaction(transaction => {
      return transaction.get(uIDRef).then(uIDDoc => {
        // Compute new number of followers
        console.log(uIDDoc.data().followingCount)
        var newFollowingCount = uIDDoc.data().followingCount + 1

        
        // Update followers info
        return transaction.update(uIDRef, {
          followingCount: newFollowingCount
        });
      });
    });
  })

  exports.lostFollowing = functions.firestore
  .document('users/{uID}/following/{fID}')
  .onDelete((change, context) => {
    const uID = context.params.uID
    //const fID = context.params.fID

    uIDRef =  database.collection('users').doc(uID)
    
    // Update aggregations in a transaction
    return database.runTransaction(transaction => {
      return transaction.get(uIDRef).then(uIDDoc => {
        // Compute new number of followers
        console.log(uIDDoc.data().followingCount)
        var newFollowingCount = uIDDoc.data().followingCount - 1

        
        // Update followers info
        return transaction.update(uIDRef, {
          followingCount: newFollowingCount
        });
      });
    });
})