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