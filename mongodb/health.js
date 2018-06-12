var h_ww = db.health_Ww.findOne().metadata.supportedResourceTypes;
var h_ff = db.health_Ff.findOne().metadata.supportedResourceTypes;
var h_mc = db.health_Mc.findOne().metadata.supportedResourceTypes;
var h_bf = db.health_Bf.findOne().metadata.supportedResourceTypes;

// Get delta for health
h_delta = h_ww.map(h => { return { 
  namespace: h.match(rpRegEx)[0].toLowerCase(),
  resourceType: h.toLowerCase(),
  inFairfax: h_ff.indexOf(h) > -1 ? 1 : 0,
  inMooncake: h_mc.indexOf(h) > -1 ? 1 : 0,
  inBlackforest: h_bf.indexOf(h) > -1 ? 1 : 0,
}}).sort()
dropAndInsert("healthDelta", h_delta)

// Get count of missing health by sovereign
var h_missing = {
  Fairfax: h_delta.filter(h => h.inFairfax === 0 ).length,
  Mooncake: h_delta.filter(h => h.inMooncake === 0 ).length,
  Blackforest: h_delta.filter(h => h.inBlackforest === 0 ).length,
}
dropAndInsert("healthMissing", h_missing);

// Get count of missing helath resource types by RP
function getHealthMissingInSovereignBit(rpns, h_delta, sovereignBit) {
  return rpns[sovereignBit] === 0 ?
    "N/A" :
    h_delta.filter(h => 
      h.namespace === rpns.namespace
      && h[sovereignBit] === 0
    ).length
}
h_missing_by_ns = db.resourceProviderDelta.find().map(rpns => { return { 
  namespace: rpns.namespace,
  missingInFairfax: getHealthMissingInSovereignBit(rpns, h_delta, "inFairfax", false),
  missingInMooncake: getHealthMissingInSovereignBit(rpns, h_delta, "inMooncake", false),
  missingInBlackforest: getHealthMissingInSovereignBit(rpns, h_delta, "inBlackforest", false)
}})
dropAndInsert("healthMissingByNamespace", h_missing_by_ns)


// Get count of resource providers missing one or more resource types in health by sovereign
rpns_missing_h = {
  Fairfax: h_missing_by_ns.filter(ns => ns.missingInFairfax > 0 ).length,
  Mooncake: h_missing_by_ns.filter(ns => ns.missingInMooncake > 0 ).length,
  Blackforest: h_missing_by_ns.filter(ns => ns.missingInBlackforest > 0 ).length
}
dropAndInsert("resourceProviderMissingHealth", rpns_missing_h);


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