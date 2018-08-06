function getOrGenerateByCloud(collectionName, cloudName, date, generateFunction) {
  var result = db[collectionName].find({ cloud:cloudName, date: date }) 
  if (result.count() == 0) {
    result = generateFunction(cloudName);
    db[collectionName].insert(result);
  }
  else {
    result = result.map(r => r);
  }
  return result
}

function getOrGenerate(collectionName, date, generateFunction) {
  var result = db[collectionName].find({ date: date }) 
  if (result.count() == 0) {
    result = generateFunction();
    db[collectionName].insert(result);
  }
  else {
    result = result.map(r => r);
  }
  return result
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

function getToday() {
  var today = new Date();
  return today.toISOString().split('T')[0];
}
today = getToday();

var rpRegEx = /[Mm]icrosoft\.[a-zA-Z.]+/g