function getPolicyDefinition(arr, i) { 
  return arr.findOne()
    .value
    .map(p =>
      { return {
        name: p.name,
        displayName: p.properties.displayName,
        preview: p.properties.displayName.indexOf("[Preview]") > -1,
        deprecated: safeGet(p, "properties.metadata.deprecated", false),
        resourceProviders: function (properties) {
          var rps = JSON.stringify(properties).match(rpRegEx);
          if (rps) {
            rps = rps.map(rp => rp.toLowerCase());

            // Get distinct list of RPs
            return rps.filter((rp, i) => rps.indexOf(rp) === i)
          } else {
            return [];
          }
        }(p.properties)
      }}
    ) 
}
var p_ww = getPolicyDefinition(db.policy_Ww);
var p_ff = getPolicyDefinition(db.policy_Ff);
var p_mc = getPolicyDefinition(db.policy_Mc);
var p_bf = getPolicyDefinition(db.policy_Bf);

// Get delta for policies
var p_delta = p_ww.map(p => { return { 
  name: p.name, 
  displayName: p.displayName, 
  preview: p.preview, 
  deprecated: p.deprecated,
  resourceProviders: p.resourceProviders,
  inFairfax: p_ff.filter(ff => ff.name === p.name ).length, 
  inMooncake: p_mc.filter(mc => mc.name === p.name ).length, 
  inBlackforest: p_bf.filter(bf => bf.name === p.name ).length 
}});
dropAndInsert("policyDelta", p_delta);

// Get count of missing policies by sovereign
var p_missing = {
  Fairfax: p_delta.filter(p => !p.deprecated && !p.preview && p.inFairfax === 0 ).length,
  Mooncake: p_delta.filter(p => !p.deprecated && !p.preview && p.inMooncake === 0 ).length,
  Blackforest: p_delta.filter(p => !p.deprecated && !p.preview && p.inBlackforest === 0 ).length,
  FairfaxIncludingPreview: p_delta.filter(p => !p.deprecated && p.inFairfax === 0 ).length,
  MooncakeIncludingPreview: p_delta.filter(p => !p.deprecated && p.inMooncake === 0 ).length,
  BlackforestIncludingPreview: p_delta.filter(p => !p.deprecated && p.inBlackforest === 0 ).length
}
dropAndInsert("policyMissing", p_missing);

// Get count of missing policies by RP
function getPolicyMissingInSovereignBit(rpns, p_delta, sovereignBit, includePreview) {
  return rpns[sovereignBit] === 0 ?
    "N/A" :
    p_delta.filter(p => 
      p.resourceProviders.indexOf(rpns.namespace) > -1
      && p[sovereignBit] === 0
      && (includePreview || !p.preview)
      && !p.deprecated
    ).length
}
p_missing_by_ns = db.resourceProviderDelta.find().map(rpns => { return { 
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
  Fairfax: p_missing_by_ns.filter(ns => ns.missingInFairfax > 0 ).length,
  Mooncake: p_missing_by_ns.filter(ns => ns.missingInMooncake > 0 ).length,
  Blackforest: p_missing_by_ns.filter(ns => ns.missingInBlackforest > 0 ).length,
  FairfaxIncludingPreview: p_missing_by_ns.filter(ns => ns.missingInFairfaxIncludingPreview > 0 ).length,
  MooncakeIncludingPreview: p_missing_by_ns.filter(ns => ns.missingInMooncakeIncludingPreview > 0 ).length,
  BlackforestIncludingPreview: p_missing_by_ns.filter(ns => ns.missingInBlackforestIncludingPreview > 0 ).length
}
dropAndInsert("resourceProviderMissingPolicy", rpns_missing_p);


/////////////////////////
// Presenting this information
/////////////////////////

// These many "services" have missing "features" in Fairfax.
// Considerations: 
//  * RP used as proxy for service
//  * Policy used as proxy for feature
//  * Preview in policy name used as a proxy for preview features
db.resourceProviderMissingPolicy.find()

// Get all the RPs with missing policies in Fairfax
db.policyMissingByNamespace.find({ missingInFairfax : { $gt : 0 } }, { _id : 0, namespace : 1 , missingInFairfax : 1 })

// Get all the missing policies in Fairfax
// ACTION: Get status/reason for each one.
db.policyDelta.find({ resourceProviders: "microsoft.sql", inFairfax : 0 }, { _id: 0 })

// ACTION: Get the policy guys to introduce VERSIONS
// ACTION: Get the policy guys to standardize approach for preview