function dropDerivedResourceCollections() {
  db.getCollectionNames().filter(c =>  c.indexOf("resource") > -1 && c !== "resourceProvider").forEach(c => { db[c].drop()} );
}
function dropDerivedCollections(name) {
  db.getCollectionNames().filter(c =>  c.indexOf(name) > -1 && c !== name).forEach(c => { db[c].drop()} );
}

function dropAndInsert(collectionName, collection) {
  if (db.getCollectionNames().filter(c => c === collectionName).length === 1) {
    db[collectionName].drop();
  }

  db[collectionName].insert(collection);
}
 
function allRpsAvailable(rps, sovereignBit){
  //TODO: Do this outside of the function
  //Do some kind of caching once we have ScanDate
  rpDelta = db.resourceProviderDelta.find().map(rp => rp);

  return rps.filter(rp => {
    rpd = rpDelta.filter(rpd => rpd.namespace === rp);
    if (rpd.length === 0) {
      // Not a real RP, so we don't need
      // to ensure this one is available
      // the sovereign
      return true;
    } else {
      return rpd[0][sovereignBit] == 1
    }
  }).length === rps.length
}

function normalizeNa(val) { 
  return val === "N/A" ? 0 : val
}

function safeGet(obj, properties, defaultVal) {
  var properties = properties.split(".");

  for (var i = 0; i < properties.length; i++) {
    if (!obj || !obj[properties[i]]) {
      return defaultVal;
    }
    obj = obj[properties[i]];
  }
  return obj;
}

var rpRegEx = /[Mm]icrosoft\.[a-zA-Z.]+/g