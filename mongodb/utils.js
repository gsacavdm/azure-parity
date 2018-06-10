function getRecord(collectionName, recordNumber) {
  return db[collectionName].find().skip(recordNumber).limit(1)[0]
}

function dropDerivedResourceCollections() {
  db.getCollectionNames().filter(function(c) {return c.indexOf("resource") > -1 && c !== "resourceProvider"}).forEach(function(c){ db[c].drop()});
}

function dropAndInsert(collectionName, collection) {
  if (db.getCollectionNames().filter(function(c) {return c === collectionName}).length === 1) {
    db[collectionName].drop();
  }

  db[collectionName].insert(collection);
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

var rpRegEx = /Microsoft\.[a-zA-Z.]+/g