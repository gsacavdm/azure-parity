// First need to import via mongoimport and specify collection

// Get health records for each cloud
// TODO: Improve import so that I can use a find filter and not skip.
var h_ww = getRecord("health", 0).metadata.supportedResourceTypes;
var h_ff = getRecord("health", 1).metadata.supportedResourceTypes;
var h_mc = getRecord("health", 2).metadata.supportedResourceTypes;
var h_bf = getRecord("health", 3).metadata.supportedResourceTypes;

// Get delta for health
h_delta = h_ww.map(function(h) { return { 
  namespace: h.match(rpRegEx)[0].toLowerCase(),
  resourceType: h.toLowerCase(),
  inFairfax: h_ff.indexOf(h) > -1 ? 1 : 0,
  inMooncake: h_mc.indexOf(h) > -1 ? 1 : 0,
  inBlackforest: h_bf.indexOf(h) > -1 ? 1 : 0,
}}).sort()
dropAndInsert("healthDelta", h_delta)


// Get count of missing helath resource types by RP
function getHealthMissingInSovereignBit(rpns, h_delta, sovereignBit) {
  return rpns[sovereignBit] === 0 ?
    "N/A" :
    h_delta.filter(function(h) {
      return h.namespace === rpns.namespace
      && h[sovereignBit] === 0
    }).length
}
h_missing_by_ns = db.resourceProviderDelta.find().map(function(rpns) { return { 
  namespace: rpns.namespace,
  missingInFairfax: getHealthMissingInSovereignBit(rpns, h_delta, "inFairfax", false),
  missingInMooncake: getHealthMissingInSovereignBit(rpns, h_delta, "inMooncake", false),
  missingInBlackforest: getHealthMissingInSovereignBit(rpns, h_delta, "inBlackforest", false)
}})
dropAndInsert("healthMissingByNamespace", h_missing_by_ns)


// Get count of resource providers missing one or more resource types in health by sovereign
rpns_missing_h = {
  Fairfax: h_missing_by_ns.filter(function(ns) { return ns.missingInFairfax > 0 }).length,
  Mooncake: h_missing_by_ns.filter(function(ns) { return ns.missingInMooncake > 0 }).length,
  Blackforest: h_missing_by_ns.filter(function(ns) { return ns.missingInBlackforest > 0 }).length
}
dropAndInsert("resourceProviderMissingHealth", rpns_missing_h);