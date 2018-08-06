function getHealthRows(cloud) { 
  return db.healthRaw.findOne({ Cloud:cloud, Date: { $gt : today } })
    .Data.metadata.supportedResourceTypes
    .map(h =>
      { return {
        date: today,
        cloud: cloud,
        namespace: h.toLowerCase()
      }
    }) 
}

var h_ww = getOrGenerateByCloud("health", "Ww", today, getHealthRows); 
var h_ff = getOrGenerateByCloud("health", "Ff", today, getHealthRows); 
var h_mc = getOrGenerateByCloud("health", "Mc", today, getHealthRows); 
var h_bf = getOrGenerateByCloud("health", "Bf", today, getHealthRows); 

// Get delta for health
var h_delta = getOrGenerate("healthDelta", today, function() {
  function getHealthInSovereignBit(rp, h_sov, h, sovereignBit) {
    query = {}
    query.resourceType = h
    query[sovereignBit] = 1
    if (rp.find(query).count() > 0) {
      return h_sov.map(h_s => h_s.namespace).indexOf(h) > -1 ? 1 : 0
    } else {
      return "N/A"
    }
  }

  return h_ww.map(h => { return { 
    date: today,
    namespace: h.namespace.match(rpRegEx)[0],
    resourceType: h.namespace,
    inFairfax: getHealthInSovereignBit(db.resourceTypeDelta, h_ff, h.namespace, "inFairfax"), //TODO: Before h_ff and H was just the array of strings, now it's an array of objects where the relevant property is namespace
    inMooncake: getHealthInSovereignBit(db.resourceTypeDelta, h_mc, h.namespace, "inMooncake"),
    inBlackforest: getHealthInSovereignBit(db.resourceTypeDelta, h_bf, h.namespace, "inBlackforest")
  }}).sort()
})

// Get count of missing health by sovereign
var h_missing = getOrGenerate("healthMissing", today, function() {
  return {
    date: today,
    Fairfax: h_delta.filter(h => h.inFairfax === 0 ).length,
    Mooncake: h_delta.filter(h => h.inMooncake === 0 ).length,
    Blackforest: h_delta.filter(h => h.inBlackforest === 0 ).length,
  }
})

// Get count of missing helath resource types by RP
var h_missing_by_ns = getOrGenerate("healthMissingByNamespace", today, function() {

  function getHealthMissingInSovereignBit(rpns, h_delta, sovereignBit) {
    return rpns[sovereignBit] === 0 ?
      "N/A" :
      h_delta.filter(h => 
        h.namespace === rpns.namespace
        && h[sovereignBit] === 0
      ).length
  }

  return db.resourceProviderDelta.find().map(rpns => { return { 
    date: today,
    namespace: rpns.namespace,
    missingInFairfax: getHealthMissingInSovereignBit(rpns, h_delta, "inFairfax", false),
    missingInMooncake: getHealthMissingInSovereignBit(rpns, h_delta, "inMooncake", false),
    missingInBlackforest: getHealthMissingInSovereignBit(rpns, h_delta, "inBlackforest", false)
  }})
})


// Get count of resource providers missing one or more resource types in health by sovereign
var rpns_missing_h = getOrGenerate("resourceProviderMissingHealth", today, function() {
  return {
    date: today,
    Fairfax: h_missing_by_ns.filter(ns => ns.missingInFairfax > 0 ).length,
    Mooncake: h_missing_by_ns.filter(ns => ns.missingInMooncake > 0 ).length,
    Blackforest: h_missing_by_ns.filter(ns => ns.missingInBlackforest > 0 ).length
  }
})

/*
/////////////////////////
// Presenting this information
/////////////////////////

// These many "services" have missing "features" in Fairfax.
// Considerations: 
//  * RP used as proxy for service
//  * Resource type onboarded to resource health used as proxy for feature
//  * No notion of preview for health
db.resourceProviderMissingHealth.find()

// Get all the RPs with missing roles in Fairfax
db.healthMissingByNamespace.find({ missingInFairfax : { $gt : 0 } }, { _id : 0, namespace : 1 , missingInFairfax : 1 })

// Get all the resource types missing resource health onboarding in Fairfax
// ACTION: Get status/reason for each one.
db.healthDelta.find({ namespace: "microsoft.apimanagement", inFairfax : 0 }, { _id: 0 })

// ACTION: Get the RBAC guys to introduce VERSIONS
// ACTION: Get the RBAC guys to standardize approach for preview
*/