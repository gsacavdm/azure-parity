// First need to import the policy files
// via mongoimport and to the policy collection

// Get policy records for each cloud
// TODO: Improve import so that I can use a find filter and not skip.
function getPolicyDefinition(arr, i) { 
  return arr.find()
    .skip(i)
    .limit(1)[0]
    .value
    .map(function(p)
      { return {
        name: p.name,
        displayName: p.properties.displayName,
        preview: safeGet(p, "properties.metadata.preview", false),
        deprecated: safeGet(p, "properties.metadata.deprecated", false),
        resourceProviders: function (properties) {
          var rps = JSON.stringify(properties).match(rpRegEx);
          if (rps) {
            rps = rps.map(function (rp) { return rp.toLowerCase() });

            // Get distinct list of RPs
            return rps.filter(function(rp, i) { return rps.indexOf(rp) === i; })
          } else {
            return [];
          }
        }(p.properties)
      }}
    ) 
}
var p_ww = getPolicyDefinition(db.policy,0);
var p_ff = getPolicyDefinition(db.policy,1);
var p_mc = getPolicyDefinition(db.policy,2);
var p_bf = getPolicyDefinition(db.policy,3);

// Get delta for policies
var p_delta = p_ww.map(function(p) { return { 
  name: p.name, 
  displayName: p.displayName, 
  preview: p.preview, 
  deprecated: p.deprecated,
  resourceProviders: p.resourceProviders,
  inFairfax: p_ff.filter(function(ff) { return ff.name === p.name }).length, 
  inMooncake: p_mc.filter(function(mc) { return mc.name === p.name }).length, 
  inBlackforest: p_bf.filter(function(bf) { return bf.name === p.name }).length 
}});
dropAndInsert("policyDelta", p_delta);

// Get count of missing policies by sovereign
var p_missing = {
  Fairfax: p_delta.filter(function(p) { return !p.deprecated && !p.preview && p.inFairfax === 0 }).length,
  Mooncake: p_delta.filter(function(p) { return !p.deprecated && !p.preview && p.inMooncake === 0 }).length,
  Blackforest: p_delta.filter(function(p) { return !p.deprecated && !p.preview && p.inBlackforest === 0 }).length,
  FairfaxIncludingPreview: p_delta.filter(function(p) { return !p.deprecated && p.inFairfax === 0 }).length,
  MooncakeIncludingPreview: p_delta.filter(function(p) { return !p.deprecated && p.inMooncake === 0 }).length,
  BlackforestIncludingPreview: p_delta.filter(function(p) { return !p.deprecated && p.inBlackforest === 0 }).length
}
dropAndInsert("policyMissing", p_missing);

// Get count of missing policies by RP
function getPolicyMissingInSovereignBit(rpns, p_delta, sovereignBit, includePreview) {
  return rpns[sovereignBit] === 0 ?
    "N/A" :
    p_delta.filter(function(p) {
      return p.resourceProviders.indexOf(rpns.namespace) > -1
      && p[sovereignBit] === 0
      && (includePreview || !p.preview)
      && !p.deprecated
    }).length
}
p_missing_by_ns = db.resourceProviderDelta.find().map(function(rpns) { return { 
  namespace: rpns.namespace,
  missingInFairfax: getPolicyMissingInSovereignBit(rpns, p_delta, "inFairfax", false),
  missingInMooncake: getPolicyMissingInSovereignBit(rpns, p_delta, "inMooncake", false),
  missingInBlackforest: getPolicyMissingInSovereignBit(rpns, p_delta, "inBlackforest", false),
  missingInFairfaxIncludingPreview: getPolicyMissingInSovereignBit(rpns, p_delta, "inFairfax", true),
  missingInMooncakeIncludingPreview: getPolicyMissingInSovereignBit(rpns, p_delta, "inMooncake", true),
  missingInBlackforestIncludingPreview: getPolicyMissingInSovereignBit(rpns, p_delta, "inBlackforest", true)
}})
dropAndInsert("policyMissingByNamespace", p_missing_by_ns)

// Get count of resource providers missing one or more policies by sovereign
rpns_missing_p = {
  Fairfax: p_missing_by_ns.filter(function(ns) { return ns.missingInFairfax > 0 }).length,
  Mooncake: p_missing_by_ns.filter(function(ns) { return ns.missingInMooncake > 0 }).length,
  Blackforest: p_missing_by_ns.filter(function(ns) { return ns.missingInBlackforest > 0 }).length,
  FairfaxIncludingPreview: p_missing_by_ns.filter(function(ns) { return ns.missingInFairfaxIncludingPreview > 0 }).length,
  MooncakeIncludingPreview: p_missing_by_ns.filter(function(ns) { return ns.missingInMooncakeIncludingPreview > 0 }).length,
  BlackforestIncludingPreview: p_missing_by_ns.filter(function(ns) { return ns.missingInBlackforestIncludingPreview > 0 }).length
}
dropAndInsert("resourceProviderMissingPolicy", rpns_missing_p);



// ACTION: Get the policy guys to introduce VERSIONS