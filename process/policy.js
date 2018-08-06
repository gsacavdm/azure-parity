function getPolicyRows(cloud) { 
  return db.policyRaw.findOne({ Cloud:cloud, Date: { $gt : today } })
    .Data.value
    .map(p =>
      { return {
        date: today,
        cloud: cloud,
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
var p_ww = getOrGenerateByCloud("policy", "Ww", today, getPolicyRows); 
var p_ff = getOrGenerateByCloud("policy", "Ff", today, getPolicyRows); 
var p_mc = getOrGenerateByCloud("policy", "Mc", today, getPolicyRows); 
var p_bf = getOrGenerateByCloud("policy", "Bf", today, getPolicyRows); 

// Get delta for policies
var p_delta = getOrGenerate("policyDelta", today, function() {
  return p_ww.map(p => { return { 
    date: today,
    name: p.name, 
    displayName: p.displayName, 
    preview: p.preview, 
    deprecated: p.deprecated,
    resourceProviders: p.resourceProviders,
    inFairfax: p_ff.filter(ff => ff.name === p.name ).length, 
    allRpsInFairfax: allRpsAvailable(p.resourceProviders, "inFairfax"),
    inMooncake: p_mc.filter(mc => mc.name === p.name ).length, 
    allRpsInMooncake: allRpsAvailable(p.resourceProviders, "inMooncake"),
    inBlackforest: p_bf.filter(bf => bf.name === p.name ).length,
    allRpsInBlackforest: allRpsAvailable(p.resourceProviders, "inBlackforest")
  }});
});

// Get count of missing policies by sovereign
var p_missing = getOrGenerate("policyMissing", today, function() {
  function getMissingPolicyCount(policies, sovereignBit, includePreview) {
    return policies.filter(p => 
      p[sovereignBit] === 0
      && p["allRpsI" + sovereignBit.slice(1)]
      && !p.deprecated
      && (includePreview || !p.preview)
    ).length
  }

  return {
    date: today,
    Fairfax: getMissingPolicyCount(p_delta, "inFairfax"),
    Mooncake: getMissingPolicyCount(p_delta, "inMooncake"),
    Blackforest: getMissingPolicyCount(p_delta, "inBlackforest"),
    FairfaxIncludingPreview: getMissingPolicyCount(p_delta, "inFairfax", true),
    MooncakeIncludingPreview: getMissingPolicyCount(p_delta, "inMooncake", true),
    BlackforestIncludingPreview: getMissingPolicyCount(p_delta, "inBlackforest", true)
  }
});

// Get count of missing policies by RP
var p_missing_by_ns = getOrGenerate("policyMissingByNamespace", today, function() {
  function getPolicyMissingInSovereignBit(rpns, p_delta, sovereignBit, includePreview) {
    return rpns[sovereignBit] === 0 ?
      "N/A" :
      p_delta.filter(p => 
        p.resourceProviders.indexOf(rpns.namespace) > -1
        && p[sovereignBit] === 0
        && p["allRpsI" + sovereignBit.slice(1)]
        && (includePreview || !p.preview)
        && !p.deprecated
      ).length
  }

  return db.resourceProviderDelta.find().map(rpns => { return { 
    date: today,
    namespace: rpns.namespace,
    missingInFairfax: getPolicyMissingInSovereignBit(rpns, p_delta, "inFairfax", false),
    missingInMooncake: getPolicyMissingInSovereignBit(rpns, p_delta, "inMooncake", false),
    missingInBlackforest: getPolicyMissingInSovereignBit(rpns, p_delta, "inBlackforest", false),
    missingInFairfaxIncludingPreview: getPolicyMissingInSovereignBit(rpns, p_delta, "inFairfax", true),
    missingInMooncakeIncludingPreview: getPolicyMissingInSovereignBit(rpns, p_delta, "inMooncake", true),
    missingInBlackforestIncludingPreview: getPolicyMissingInSovereignBit(rpns, p_delta, "inBlackforest", true)
  }})
})

// Get count of resource providers missing one or more policies by sovereign

var rpns_missing_p = getOrGenerate("resourceProviderMissingPolicy", today, function() {
  return {
    date: today,
    Fairfax: p_missing_by_ns.filter(ns => ns.missingInFairfax > 0 ).length,
    Mooncake: p_missing_by_ns.filter(ns => ns.missingInMooncake > 0 ).length,
    Blackforest: p_missing_by_ns.filter(ns => ns.missingInBlackforest > 0 ).length,
    FairfaxIncludingPreview: p_missing_by_ns.filter(ns => ns.missingInFairfaxIncludingPreview > 0 ).length,
    MooncakeIncludingPreview: p_missing_by_ns.filter(ns => ns.missingInMooncakeIncludingPreview > 0 ).length,
    BlackforestIncludingPreview: p_missing_by_ns.filter(ns => ns.missingInBlackforestIncludingPreview > 0 ).length
  }
})

/*
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
db.policyMissingByNamespace.find({ 
  missingInFairfax : { $gt : 0 } 
}, { 
  _id : 0, 
  namespace : 1 , 
  missingInFairfax : 1 
})

// Get all the missing policies in Fairfax
// ACTION: Get status/reason for each one.
db.policyDelta.find({ 
  resourceProviders: "microsoft.sql", 
  inFairfax : 0, 
  allRpsInFairfax: true, 
  preview: false, 
  deprecated: false
}, {
  _id: 0,
  name: 1,
  displayName: 1
})

// ACTION: Get the policy guys to introduce VERSIONS
// ACTION: Get the policy guys to standardize approach for preview
*/