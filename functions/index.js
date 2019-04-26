// A module for cleaner functions
//firebase deploy --only functions
// firebase functions:shell
// Index.js is a fucking mess

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
var database = admin.firestore();
const env = functions.config();
const algoliaSearch = require("algoliasearch");

const client = algoliaSearch(env.algolia.appid, env.algolia.apikey); /// Comment out when need to emulate

// This function is called when a user submits a new mix
// Notes :
// Doesn't have functionality for actual audio file yet,
// Needs to trigger further function to send new mID to followers' timelines'

//Not used, ran from front end
exports.addMix = functions.https.onCall((data, context) => {
  var firstPromises = [];
  var mixPromises = [];
  uID = context.auth.uid;
  var mixData = data;

  //Post to the 'mixes' collection

  //Post to the producer's 'mixes' subCollection

  //Post to every one of the producer's followers' 'timeline' subCollections

  // Receives data from request and puts into an object
  // var mixData = {
  //   uID: uID,
  //   title: data.title,
  //   dateUploaded: new Date(),
  //   tracklist: data.tracklist,
  //   series: data.series,
  //   producer: data.producer,
  //   likeCount : 0,
  // }

  mixData["DateUploaded"] = new Date();
  mixData["uID"] = uID;
  mixData["playCount"] = 0;
  mixData["likeCount"] = 0;

  const followersProm = returnIDs(uID, "followers", false);
  var mID = database
    .collection("mixes")
    .add(mixData)
    .then(response => {
      return response.id;
    })
    .catch(error => {
      return error;
    });

  firstPromises.push(followersProm);
  firstPromises.push(mID);

  return Promise.all(firstPromises)
    .then(response => {
      mIDs = response[0];
      mID = response[1];
      console.log(mID);
      mixPromises.push(
        database
          .collection("users")
          .doc(uID)
          .collection("mixes")
          .doc(mID)
          .set(mixData)
      );
      for (var follower in mIDs) {
        console.log(follower);
      }
      return response;
    })
    .then(() => {
      return Promise.all(mixPromises);
    })
    .catch(error => {
      console.log(error);
    });
});

// What needs to happen every time a producer adds a new mix ?
// All of their followers should have the new mix inserted at the top of their 'timeline' subCollections

// This function is called when a user deletes one of their own mixes
// Notes:
// Doesn't have functionality for actual audio file yet,
exports.deleteMix = functions.https.onCall((data, response) => {
  const storage = firebase.storage();

  var promises = [];
  const mID = data.mID;
  const uID = data.uID;
  promises.push(
    database
      .collection("mixes")
      .doc(mID)
      .delete()
  );
  promises.push(
    database
      .collection("users")
      .doc(uID)
      .collection("mixes")
      .doc(mID)
      .delete()
  );
  promises.push(
    database
      .collection("mixPlaylists")
      .doc(mID)
      .delete()
  );

  // Get the mixID and the userid from the request

  followersProm = returnIDs(uID, "followers", false);

  return database
    .collection("mixPlaylists")
    .doc(mID)
    .get()
    .then(response => {
      const playlistData = response.data();
      Object.keys(playlistData.uIDs).forEach(uID => {
        var playlistNames = playlistData.uIDs[uID];
        Object.keys(playlistNames).forEach(playlistNameKey => {
          var playlistName = playlistNames[playlistNameKey];

          var promise = database
            .collection("users")
            .doc(uID)
            .collection(playlistName)
            .doc(mID)
            .delete();
          promises.push(promise);
        });
      });
      return followersProm;
    })
    .then(response => {
      for (var follower in response) {
        console.log("response follower");
        console.log(response[follower]);
        promises.push(
          database
            .collection("users")
            .doc(response[follower])
            .collection("timeline")
            .doc(mID)
            .delete()
        );
        promises.push(
          database
            .collection("users")
            .doc(response[follower])
            .collection("history")
            .doc(mID)
            .delete()
        );
        promises.push(
          database
            .collection("users")
            .doc(response[follower])
            .collection("listenLater")
            .doc(mID)
            .delete()
        );
      }
      promises.push(
        firebase.functions().httpsCallable("unIndexMix", {
          NmID: NmID
        })
      );
      return promises;
    })
    .then(response => {
      return Promise.all(response);
    })
    .catch(error => {
      return {
        message: "Error removing document: " + error
      };
    })
    .then(response => {
      var deleteRef = storage.ref("mixesAudio/" + mID + ".mp3");

      // Delete the file
      return deleteRef.delete();
    })
    .then(() => {
      return "File Deleted Successfully";
    })
    .catch(error => {
      return error;
    });
});

exports.deleteFromShowEvent = functions.https.onCall((data, response) => {
  const type = data.type;
  const gatherName = data.gatherName;
  const mID = data.mID;

  //get ID from gathername

  return database
    .collection(type)
    .where("name", "==", gatherName)
    .get()
    .then(response => {
      return response.docs[0].id;
    })
    .then(xID => {
      //delete the mix from the mixes subcollection
      return database
        .collection(type)
        .doc(xID)
        .collection("mixes")
        .doc(mID)
        .delete();
    });
});

exports.deleteFromPlaylists = functions.https.onCall((data, response) => {
  // Each document in the collection is a song that is in atleast one user's playlist
  // Each document contains a map for each user that has the song in atleast one playlist
  // The mID will be passed as input

  const mID = data.mID;
  var deletePromises = [];

  return database
    .collection("playlists")
    .doc(mID)
    .get()
    .then(response => {
      var users = Object.keys(response.data());
      var playlistNames = Object.values(response.data());

      //For each every playlist that each user has the mix, create a promise to delete the mix from that users playlist subCollection

      for (var i in users) {
        var currentUser = users[i];
        var currentPlaylistNames = playlistNames[i].playlistNames;

        // eslint-disable-next-line no-loop-func
        currentPlaylistNames.forEach(pName => {
          var promise = database
            .collection("users")
            .doc(currentUser)
            .collection(pName)
            .doc(mID)
            .delete();
          deletePromises.push(promise);
        });
      }
      return deletePromises;
    })
    .then(() => {
      return Promise.all(deletePromises);
    });
});

// Remove mID from all follower 'timeline collections
// Delete the mix using the mID reference from the 'mixes' collection
// and user 'mixes' collection

// Function to receive a path to a subcollection, possibly uID, and return all the objects in that subcollection -- for getting lists of IDs

//function returnIDs(uID, subCollection, orderBy){
function returnIDs(uID, subCollection, orderBy) {
  //Create query based on uID and subCollection given
  results = [];

  //if statement for if ordered or not
  if (!orderBy) {
    var query = database
      .collection("users")
      .doc(uID)
      .collection(subCollection);
  } else {
    query = database
      .collection("users")
      .doc(uID)
      .collection(subCollection)
      .orderBy(orderBy, "DESC")
      .limit(12);
  }

  return query
    .get()
    .then(snapshot => {
      const documents = snapshot.docs;
      for (var entry = 0; entry < documents.length; entry++) {
        // Adds the document to an array, that will be passed into the next function --- *** currently working on, is not yet designed correctly, may cause errors ***
        // Must ensure that when new mix is added, the cloud function creates the entries elsewhere using the SAME DOCUMENT ID, otherwise this will fail
        const item = documents[entry].id;
        results.push(item);
      }
      return results;
    })
    .catch(error => {
      console.log(error);
    });
  //populate array with mIDs

  //Return --- may need to be a promise
}

// Function to receive a list of IDs and a subcollection, and return all information about those IDs

function returnData(mIDs, subCollection) {
  // Populate a list of promises with the mIDs passed
  var promises = [];
  var results = [];

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
});

// Function to return the X most recent entries into a subcollection
// This function is to be used for returning data that needs to be ordered by date, and by date only
// This will be used for retrieving timelines / mixes
// Will receive a uID and the subCollection in order to work out the path
exports.getSubCollectionbyDate = functions.https.onCall((data, response) => {
  var results = [];
  const uID = data.uID;
  const subCollection = data.subCollection;
  const amount = data.amount;

  const query = database
    .collection("users")
    .doc(uID)
    .collection(subCollection)
    .orderBy("dateUploaded", "DESC")
    .limit(amount);

  return query
    .get()
    .then(snapshot => {
      const documents = snapshot.docs;

      for (var entry = 0; entry < documents.length; entry++) {
        // Adds the document to an array, that will be passed into the next function --- *** currently working on, is not yet designed correctly, may cause errors ***
        // Must ensure that when new mix is added, the cloud function creates the entries elsewhere using the SAME DOCUMENT ID, otherwise this will fail
        const item = documents[entry].data();

        results.push(item);
      }
      return results;
    })
    .catch(error => {
      console.log(error);
    });
});

function getSubCollection(uID, subCollection, amount) {
  var results = [];

  if (!amount) {
    query = database
      .collection("users")
      .doc(uID)
      .collection(subCollection);
  } else {
    query = database
      .collection("users")
      .doc(uID)
      .collection(subCollection)
      .orderBy("dateUploaded", "DESC")
      .limit(amount);
  }

  return query
    .get()
    .then(snapshot => {
      const documents = snapshot.docs;

      for (var entry = 0; entry < documents.length; entry++) {
        const item = documents[entry].data();
        item["mID"] = documents[entry].id;
        results.push(item);
      }
      return results;
    })
    .catch(error => {
      console.log(error);
    });
}

exports.getFollowX = functions.https.onCall((data, response) => {
  const uID = data.uID;
  const followX = data.followX;
  results = [];
  //depending on if 'followers' or 'following' is passed as input, the given subCollection is queried
  //for the selectedUser
  query = database
    .collection("users")
    .doc(uID)
    .collection(followX)
    .limit(15);

  return query
    .get()
    .then(snapshot => {
      const documents = snapshot.docs;
      for (var entry = 0; entry < documents.length; entry++) {
        const item = documents[entry].data();
        item["uID"] = documents[entry].id;
        //each follower / following is iterated through pushed an array called 'results'
        results.push(item);
      }
      //the populated array is returned
      return results;
    })
    .catch(error => {
      console.log(error);
    });
});

exports.followUser = functions.https.onCall((data, response) => {
  const follower = data.follower;
  const following = data.following;
  const follow = data.follow;

  //defining the objects that will be set in the database
  followingNameObject = {
    name: following.name,
    profileURL: following.profileURL
  };
  followerNameObject = {
    name: follower.name,
    profileURL: follower.profileURL
  };
  const followinguID = following.uID;
  const followeruID = follower.uID;
  var promises = [];

  //create the database requests to add the followed user user from the user that is doing the following's
  //"following" subColletion, and add the followed "followers" subCollection for the user that is being followed
  if (follow) {
    promises.push(
      database.collection("users").doc(followinguID).collection("followers").doc(followeruID).set(followerNameObject)
    );
    promises.push(
      database.collection("users").doc(followeruID).collection("following").doc(followinguID).set(followingNameObject)
    );
    //the editTimeline function is called
    editTimeline(followeruID, followinguID, true);
    //create the database requests to delete the followed user from the user that is doing the following's
    //"following" subColletion, and delete the following user from the "followers" subCollection for the user that is being followed
  } else {
    promises.push(
      database.collection("users").doc(followinguID).collection("followers").doc(followeruID).delete()
    );
    promises.push(
      database.collection("users").doc(followeruID).collection("following").doc(followinguID).delete()
    );
    editTimeline(followeruID, followinguID, false);
  }
  return Promise.all(promises).then(response => {
    return "Complete";
  });
});

// this function called when a user follows or un-follows another user
// the user that was just followed or un-followed's mixes will be add or deleted from
// the 'timeline' subcollection of the user that just followed or un-followed them
function editTimeline(followeruID, followeduID, copy) {
  //receives the userID of the user being doing the following and the user being followed.
  //copy - is Boolean that denotes whether to add(True)or delete(False) the mixes
  promises = [];

  //get user that has been followed mixes
  const mixes = getSubCollection(followeduID, "mixes", false);

  //add them to the user doing the 'following's timeline
  return mixes
    .then(response => {
      //loop through each mix returned
      response.forEach(mixResp => {
        var mix = mixResp;
        if (copy) {
          addMix = {
            dateUploaded: mix.dateUploaded,
            show: mix.show,
            title: mix.title,
            audioURL: mix.audioURL,
            artworkURL: mix.artworkURL,
            producers: mix.producers,
            likeCount: mix.likeCount
          };
          //if the mixes should be added to the timeline, each mix is looped through and added
          setter = database.collection("users").doc(followeruID).collection("timeline").doc(mix.mID).set(addMix);
        } else {
          //if the mixes should be deleted, each mix is looped through and the mID used to delete the required mixes from the timeline
          setter = database.collection("users").doc(followeruID).collection("timeline").doc(mix.mID).delete();
        }
        promises.push(setter);
      });
      return promises;
    })
    .then(response => {
      return Promise.all(promises);
    });
}

exports.unFollowUser = functions.https.onCall((data, response) => {
  //unFollowUser({ 'followingName' : 'Producer Jamie' , 'followeruID' : 'GBeZHcjhNjX44PXcJ8mE5BeYLBj2' , 'followerName' : 'Perfect User'})
  followingName = data.followingName; // The name of the user that is being unfollowed
  followeruID = data.followeruID; // The uID of the user that is doing the following
  followerName = data.followerName; // The name of the user that is doing the following

  followingNameObject = {
    name: followingName
  };
  followerNameObject = {
    name: followerName
  };

  //Get the following uID from the following name

  const followinguID = database
    .collection("users")
    .where("name", "==", followingName)
    .get()
    .then(response => {
      //The uID of the user that is being followed
      return response.docs[0].id;
    })
    .catch(error => {
      return error;
    });

  var promises = [];
  //Promise to add followerUID and name to the 'followers' sub collection of the user being followed. and update the aggregate count,

  //Add followerUID and name to the 'followers' sub collection of the user being followed. and update the aggregate count,

  return followinguID
    .then(response => {
      console.log(response);
      console.log(promises.length);

      promises.push(
        database
          .collection("users")
          .doc(response)
          .collection("followers")
          .doc(followeruID)
          .delete()
      );
      console.log("hello");
      promises.push(
        database
          .collection("users")
          .doc(followeruID)
          .collection("following")
          .doc(response)
          .delete()
      );
      console.log(promises.length);
      return Promise.all(promises);
    })
    .catch(error => {
      return error;
    });
});

exports.addedFollower = functions.firestore
  .document("users/{uID}/followers/{fID}")
  .onCreate((change, context) => {
    const uID = context.params.uID; //the user that has been followed
    const fID = context.params.fID; //the user doing the following

    //const uID = 'GBeZHcjhNjX44PXcJ8mE5BeYLBj2' //the user that has been followed
    //const fID = 'lN4w75KT3la5sCRS5UjZE2uqxd43' //the user doing the following

    console.log("added follower");

    var topPromises = [];
    var mixPromises = [];

    const firstPromises = getSubCollection(uID, "mixes", false);
    uIDRef = database.collection("users").doc(uID);

    // Update aggregations in a transaction
    var dbTrans = database.runTransaction(transaction => {
      return transaction.get(uIDRef).then(uIDDoc => {
        // Compute new number of followers
        console.log(uIDDoc.data().followerCount);
        var newFollowersCount = uIDDoc.data().followerCount + 1;
        console.log("old count ^^^^ -- new count (below)");
        console.log(newFollowersCount);

        // Update followers info
        return transaction.update(uIDRef, {
          followerCount: newFollowersCount
        });
      });
    });

    topPromises.push(firstPromises);
    topPromises.push(dbTrans);

    return Promise.all(topPromises).then(response => {
      var mixes = response[0];
      for (i in mixes) {
        mix = mixes[i];
        console.log(mix);
        addMix = {
          dateUploaded: mix.dateUploaded,
          title: mix.title,
          producerrs: mix.producers,
          likeCount: mix.likeCount,
          audio: mix.audio,
          artworkURL: mix.artworkURL
        };
        const mixPromise = database
          .collection("users")
          .doc(fID)
          .collection("timeline")
          .doc(mix.id)
          .set(addMix);
        mixPromises.push(mixPromise);
      }
      return Promise.all(mixPromises);
    });
  });

exports.lostFollower = functions.firestore
  .document("users/{uID}/followers/{fID}")
  .onDelete((change, context) => {
    const uID = context.params.uID; //the user that has been followed
    const fID = context.params.fID; //the user doing the following

    // const uID = 'GBeZHcjhNjX44PXcJ8mE5BeYLBj2' //the user that has been followed
    // const fID = 'lN4w75KT3la5sCRS5UjZE2uqxd43' //the user doing the following

    console.log("lost follower");

    var topPromises = [];
    var mixPromises = [];

    const firstPromises = getSubCollection(uID, "mixes", false);
    uIDRef = database.collection("users").doc(uID);

    // Update aggregations in a transaction
    var dbTrans = database.runTransaction(transaction => {
      return transaction.get(uIDRef).then(uIDDoc => {
        // Compute new number of followers
        console.log(uIDDoc.data().followerCount);
        var newFollowersCount = uIDDoc.data().followerCount - 1;
        console.log("old count ^^^^ -- new count (below)");
        console.log(newFollowersCount);
        // Update followers info
        return transaction.update(uIDRef, {
          followerCount: newFollowersCount
        });
      });
    });

    topPromises.push(firstPromises);
    topPromises.push(dbTrans);

    return Promise.all(topPromises).then(response => {
      var mixes = response[0];
      for (i in mixes) {
        mix = mixes[i];
        console.log(mix);

        const mixPromise = database
          .collection("users")
          .doc(fID)
          .collection("timeline")
          .doc(mix.id)
          .delete();
        mixPromises.push(mixPromise);
      }
      return Promise.all(mixPromises);
    });
  });

exports.addedFollowing = functions.firestore
  .document("users/{uID}/following/{fID}")
  .onCreate((change, context) => {
    const uID = context.params.uID;
    //const fID = context.params.fID

    uIDRef = database.collection("users").doc(uID);

    // Update aggregations in a transaction
    return database.runTransaction(transaction => {
      return transaction.get(uIDRef).then(uIDDoc => {
        // Compute new number of followers
        console.log(uIDDoc.data().followingCount);
        var newFollowingCount = uIDDoc.data().followingCount + 1;

        // Update followers info
        return transaction.update(uIDRef, {
          followingCount: newFollowingCount
        });
      });
    });
  });

exports.addedMixToShow = functions.firestore
  .document("shows/{sID}/mixes/{mID}")
  .onCreate((change, context) => {
    const sID = context.params.sID;
    //const fID = context.params.fID

    showRef = database.collection("shows").doc(sID);

    // Update aggregations in a transaction
    return database.runTransaction(transaction => {
      return transaction.get(showRef).then(show => {
        var newMixCount = show.data().mixCount + 1;

        // Update followers info
        return transaction.update(showRef, {
          mixCount: newMixCount
        });
      });
    });
  });

exports.lostFollowing = functions.firestore
  .document("users/{uID}/following/{fID}")
  .onDelete((change, context) => {
    const uID = context.params.uID;
    //const fID = context.params.fID

    uIDRef = database.collection("users").doc(uID);

    // Update aggregations in a transaction
    return database.runTransaction(transaction => {
      return transaction.get(uIDRef).then(uIDDoc => {
        // Compute new number of followers
        console.log(uIDDoc.data().followingCount);
        var newFollowingCount = uIDDoc.data().followingCount - 1;

        // Update followers info
        return transaction.update(uIDRef, {
          followingCount: newFollowingCount
        });
      });
    });
  });

exports.addedToMixesSubCollection = functions.firestore
  .document("mixes/{mID}/{subCollection}/{uID}")
  .onCreate((change, context) => {
    const mID = context.params.mID;
    const uID = context.params.uID;
    const subCollection = context.params.subCollection;

    //addedToMixesSubCollection({ data : 'data' } , { params : {mID : 'aXMRaJwmgMONp4I83tEi', subCollection : 'likes' , ID : 'GBeZHcjhNjX44PXcJ8mE5BeYLBj2' } })

    console.log(mID, uID, subCollection);

    mIDRef = database.collection("mixes").doc(mID);

    // Update aggregations in a transaction
    return database.runTransaction(transaction => {
      return transaction.get(mIDRef).then(mIDDoc => {
        // Compute new number of followers
        console.log(mIDDoc.data().likeCount);
        var newlikeCount = mIDDoc.data().likeCount + 1;

        // Update followers info
        return transaction.update(mIDRef, {
          likeCount: newlikeCount
        });
      });
    });
  });

exports.removedFromMixesSubCollection = functions.firestore
  .document("mixes/{mID}/{subCollection}/{uID}")
  .onDelete((change, context) => {
    const mID = context.params.mID;
    const uID = context.params.uID;
    const subCollection = context.params.subCollection;

    //removedFromMixesSubCollection({ data : 'data' } , { params : {mID : 'aXMRaJwmgMONp4I83tEi', subCollection : 'likes' , ID : 'GBeZHcjhNjX44PXcJ8mE5BeYLBj2' } })

    console.log(mID, uID, subCollection);

    mIDRef = database.collection("mixes").doc(mID);

    // Update aggregations in a transaction
    return database.runTransaction(transaction => {
      return transaction.get(mIDRef).then(mIDDoc => {
        // Compute new number of followers
        console.log(mIDDoc.data().likeCount);
        var newlikeCount = mIDDoc.data().likeCount - 1;

        // Update followers info
        return transaction.update(mIDRef, {
          likeCount: newlikeCount
        });
      });
    });
  });

exports.likeMix = functions.https.onCall((data, response) => {
  console.log(data);
  mID = data.mID;
  likeruID = data.likeruID;
  produceruID = data.likeruID;
  likerName = data.likerName;
  mixName = data.mixName;
  liked = data.liked;
  producers = data.producers;
  profileURL = data.profileURL;
  artworkURL = data.artworkURL;
  likeCount = data.likeCount;
  playCount = data.playCount;

  // mID = 'aXMRaJwmgMONp4I83tEi'
  // likeruID = 'GBeZHcjhNjX44PXcJ8mE5BeYLBj2'
  // produceruID = 'lN4w75KT3la5sCRS5UjZE2uqxd43'
  // likerName = 'Perfect User'
  // mixName = 'Mix 2'
  // liked = false

  likerNameObject = {
    name: likerName,
    profileURL: profileURL
  };
  mixNameObject = {
    title: mixName,
    producers: producers,
    artWorkURL: artworkURL,
    likeCount: likeCount,
    playCount: playCount
  };

  console.log("hello");

  var promises = [];
  //Promise to add followerUID and name to the 'followers' sub collection of the user being followed. and update the aggregate count,
  //Add followerUID and name to the 'followers' sub collection of the user being followed. and update the aggregate count,

  if (liked) {
    producers.forEach(producer => {
      var uID = producer.uID;
      promises.push(
        database
          .collection("users")
          .doc(uID)
          .collection("mixes")
          .doc(mID)
          .collection("liked")
          .doc(likeruID)
          .set(likerNameObject)
      );
    });
    promises.push(
      database
        .collection("mixes")
        .doc(mID)
        .collection("liked")
        .doc(likeruID)
        .set(likerNameObject)
    );
    promises.push(
      database
        .collection("users")
        .doc(likeruID)
        .collection("liked")
        .doc(mID)
        .set(mixNameObject)
    );
  } else {
    producers.forEach(producer => {
      var uID = producer.uID;
      promises.push(
        database
          .collection("users")
          .doc(uID)
          .collection("mixes")
          .doc(mID)
          .collection("liked")
          .doc(likeruID)
          .delete()
      );
    });
    promises.push(
      database
        .collection("mixes")
        .doc(mID)
        .collection("liked")
        .doc(likeruID)
        .delete()
    );
    promises.push(
      database
        .collection("users")
        .doc(likeruID)
        .collection("liked")
        .doc(mID)
        .delete()
    );
  }

  return Promise.all(promises);
});

exports.indexMix = functions.https.onCall((mix, response) => {
  var options = {
    year: "numeric",
    month: "long",
    day: "numeric"
  };
  var options2 = {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  };
  const index = client.initIndex("mixes");

  const data = mix.mixData;
  const objectID = mix.NmID;
  const mID = mix.NmID;

  const title = data.title;
  const artworkURL = data.artworkURL;
  const audioURL = data.audioURL;
  const likeCount = 0;
  const playCount = 0;

  const streamURL = data.streamURL;
  const producers = data.producers;
  const unix = new Date();
  const timestamp = Date.now();
  const dateUploaded = unix.toLocaleDateString("en-GB", options);
  const dateUploaded2 = unix.toLocaleDateString("en-GB", options2); //Secondary search for users that want to search in the dd/mm/yy format, which was not previously supported

  var indexObject = {
    objectID,
    title,
    playCount,
    likeCount,
    mID,
    audioURL,
    producers,
    dateUploaded,
    timestamp,
    artworkURL,
    dateUploaded2
  };

  if (data.event) {
    indexObject["event"] = data.event;
  }
  if (data.show) {
    indexObject["show"] = data.show;
  }

  return index.addObject(indexObject);
});

exports.unIndexMix = functions.firestore
  .document("mixes/{mID}")
  .onDelete((snap, context) => {
    const index = client.initIndex("mixes");
    const objectID = snap.id;
    return index.deleteObject(objectID);
  });

exports.unIndexShow = functions.firestore
  .document("mixes/{mID}")
  .onDelete((snap, context) => {
    const index = client.initIndex("show");
    const objectID = snap.id;
    return index.deleteObject(objectID);
  });

exports.unIndexUser = functions.firestore
  .document("users/{uID}")
  .onDelete((snap, context) => {
    const index = client.initIndex("producers");
    const objectID = snap.id;
    return index.deleteObject(objectID);
  });

exports.unIndexEvent = functions.firestore
  .document("shows/{sID}")
  .onDelete((snap, context) => {
    const index = client.initIndex("shows");
    const objectID = snap.id;
    return index.deleteObject(objectID);
  });

exports.indexEvent = functions.https.onCall((eventData, response) => {
  var options = {
    year: "numeric",
    month: "long",
    day: "numeric"
  };
  var options2 = {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  };
  const index = client.initIndex("events");

  const data = eventData.eventData;
  const objectID = eventData.eID;
  const eID = eventData.eID;
  const name = data.name;
  const producers = data.producers;
  const unix = new Date();
  const timestamp = Date.now();
  const dateCreated = unix.toLocaleDateString("en-GB", options);
  const dateCreated2 = unix.toLocaleDateString("en-GB", options2); //Secondary search for users that want to search in the dd/mm/yy format, which was not previously supported

  var indexObject = {
    objectID,
    name,
    producers,
    timestamp,
    dateCreated,
    eID,
    dateCreated2
  };
  return index.addObject(indexObject);
});

exports.indexShow = functions.https.onCall((showData, response) => {
  var options = {
    year: "numeric",
    month: "long",
    day: "numeric"
  };
  var options2 = {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  };
  const index = client.initIndex("shows");

  const data = showData.showData;
  const objectID = showData.eID;
  const sID = showData.eID;
  const name = data.name;

  const producers = data.producers;
  const unix = new Date();
  const timestamp = Date.now();
  const dateCreated = unix.toLocaleDateString("en-GB", options);
  const dateCreated2 = unix.toLocaleDateString("en-GB", options2); //Secondary search for users that want to search in the dd/mm/yy format, which was not previously supported

  var indexObject = {
    objectID,
    producers,
    sID,
    name,
    timestamp,
    dateCreated,
    dateCreated2
  };

  return index.addObject(indexObject);
});

exports.indexUser = functions.https.onCall((data, response) => {
  //options1 and 2 are objects that are passed to dateFormatting functions in future
  var options = {
    year: "numeric",
    month: "long",
    day: "numeric"
  };
  var options2 = {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  };

  //index defines the index in Algolia we wish to modify
  const index = client.initIndex("producers");

  //defining the data that will be written to Algoilia
  const uID = data.uID;
  const name = data.name;
  const unix = new Date();
  const timestamp = Date.now();
  const dateCreated = unix.toLocaleDateString("en-GB", options);
  const dateCreated2 = unix.toLocaleDateString("en-GB", options2);

  //specifying the data in an object
  var indexObject = {
    name,
    timestamp,
    dateCreated,
    dateCreated2,
    uID
  };

  //creates the specified object in algolia
  return index.addObject(indexObject);
});

exports.updateUserProfile = functions.https.onCall((data, response) => {
  const index = client.initIndex("producers");

  console.log("objectID");
  console.log(data.objectID);
  return index.partialUpdateObject({
    objectID: data.objectID,
    profileURL: data.profileURL
  });
});

exports.updateShowIndex = functions.https.onCall((data, response) => {
  const index = client.initIndex("shows");

  return index.partialUpdateObject({
    objectID: data.objectID,
    imageURL: data.imageURL
  });
});

exports.updateEventIndex = functions.https.onCall((data, response) => {
  const index = client.initIndex("events");

  return index.partialUpdateObject({
    objectID: data.objectID,
    imageURL: data.imageURL
  });
});
