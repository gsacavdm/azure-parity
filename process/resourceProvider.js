function getResourceProviderRows(cloud) { 
  return db.resourceProviderRaw.findOne({ Cloud:cloud, Date: { $gt : today } })
    .Data.value
    .map(rp => { return {
      date: today,
      cloud: cloud,
      namespace: rp.namespace,
      resourceTypes: rp.resourceTypes
    }})
}
var rp_ww = getOrGenerateByCloud("resourceProvider", "Ww", today, getResourceProviderRows); 
var rp_ff = getOrGenerateByCloud("resourceProvider", "Ff", today, getResourceProviderRows); 
var rp_mc = getOrGenerateByCloud("resourceProvider", "Mc", today, getResourceProviderRows); 
var rp_bf = getOrGenerateByCloud("resourceProvider", "Bf", today, getResourceProviderRows);

// Get list of namespaces per cloud
function getNamespaces(rps) { 
  return rps.map(rp => rp.namespace.toLowerCase()).sort()
}
var rpns_ww = getNamespaces(rp_ww);
var rpns_ff = getNamespaces(rp_ff);
var rpns_mc = getNamespaces(rp_mc);
var rpns_bf = getNamespaces(rp_bf);

// Get resource types per cloud
function getResourceTypes(rps) { 
  return [].concat.apply(
    [], rps.map(rp => 
      rp.resourceTypes.map(rpt => { return {
        namespace: rp.namespace.toLowerCase(),
        resourceType: rp.namespace.toLowerCase() + '/' + rpt.resourceType.toLowerCase()
      }})
    )
  ).sort()
}
var rprt_ww = getResourceTypes(rp_ww);
var rprt_ff = getResourceTypes(rp_ff);
var rprt_mc = getResourceTypes(rp_mc);
var rprt_bf = getResourceTypes(rp_bf);

// Get APIs per cloud
function getApis(rps) {
  return [].concat.apply([],
    [].concat.apply([], 
      rps.map(rp => rp.resourceTypes.map(rpt => 
          rpt.apiVersions.map(apiVersion => { 
            return {
              namespace: rp.namespace.toLowerCase(), 
              resourceType: rp.namespace.toLowerCase() + '/' + rpt.resourceType.toLowerCase(),
              apiVersion: apiVersion
            }
          })
        )
      )
    )
  ).sort() 
}
var api_ww = getApis(rp_ww);
var api_ff = getApis(rp_ff);
var api_mc = getApis(rp_mc);
var api_bf = getApis(rp_bf);

// Get delta for namespaces
var rpns_delta = getOrGenerate("resourceProviderDelta", today, function() {
  return rpns_ww.map(rpns => { return { 
    date: today,
    namespace:rpns, 
    isFirstParty: rpns.toLowerCase().indexOf("microsoft") !== -1,
    inFairfax:rpns_ff.filter(ff => ff === rpns).length, 
    inMooncake:rpns_mc.filter(mc => mc === rpns).length, 
    inBlackforest:rpns_bf.filter(bf => bf === rpns).length 
  }});
})

// Get count of missing RPs by sovereign
var rpns_missing = getOrGenerate("resourceProviderMissing", today, function() {
  return {
    date: today,
    Fairfax: rpns_delta.filter(rpns => rpns.isFirstParty && rpns.inFairfax === 0 ).length,
    Mooncake: rpns_delta.filter(rpns => rpns.isFirstParty && rpns.inMooncake === 0 ).length,
    Blackforest: rpns_delta.filter(rpns => rpns.isFirstParty && rpns.inBlackforest === 0 ).length,
    FairfaxIncluding3rdParties: rpns_delta.filter(rpns => rpns.inFairfax === 0 ).length,
    MooncakeIncluding3rdParties: rpns_delta.filter(rpns => rpns.inMooncake === 0 ).length,
    BlackforestIncluding3rdParties: rpns_delta.filter(rpns => rpns.inBlackforest === 0 ).length
  }
})

// Get delta for resource types
//TODO: harden this do that it doesn't fail if no namespace match
//      caused by the property access to the [0] in the inFairfax
var rprt_delta = getOrGenerate("resourceTypeDelta", today, function() {
  function getResourceTypeInSovereignBit(rpns_delta, rprt, rprt_sovereign, sovereignBit) {
    return (rpns_delta.filter(ns => ns.namespace === rprt.namespace ))[0][sovereignBit] ? 
              rprt_sovereign.filter(sovereign => sovereign.resourceType === rprt.resourceType ).length 
              : "N/A"
  }

  return rprt_ww.map(rprt => { return { 
    date: today,
    namespace: rprt.namespace, 
    resourceType: rprt.resourceType,
    nonPreviewApis: api_ww.filter(api => api.resourceType === rprt.resourceType && api.apiVersion.indexOf("preview") === -1 ).length,
    inFairfax: getResourceTypeInSovereignBit(rpns_delta, rprt, rprt_ff, "inFairfax"),
    inMooncake: getResourceTypeInSovereignBit(rpns_delta, rprt, rprt_mc, "inMooncake"),
    inBlackforest: getResourceTypeInSovereignBit(rpns_delta, rprt, rprt_bf, "inBlackforest"),
  }});
})

// Get count of missing resource types by resource provider
var rprt_missing_by_ns = getOrGenerate("resourceTypeMissingByNamespace", today, function() {
  function getMissingInSovereignBit(rpns, rprt, sovereignBit, includePreview) {
    return rpns[sovereignBit] === 0 ?
      "N/A" :
      rprt.filter(rt => {
        return rt.namespace === rpns.namespace
        && rt[sovereignBit] === 0 // Feature is missing
        && (includePreview || rt.nonPreviewApis > 0 )
      }).length
  }

  return rpns_delta.map(rpns => { return { 
    date: today,
    namespace: rpns.namespace,
    missingInFairfax: getMissingInSovereignBit(rpns, rprt_delta, "inFairfax", false),
    missingInMooncake: getMissingInSovereignBit(rpns, rprt_delta, "inMooncake", false),
    missingInBlackforest: getMissingInSovereignBit(rpns, rprt_delta, "inBlackforest", false),
    missingInFairfaxIncludingPreview: getMissingInSovereignBit(rpns, rprt_delta, "inFairfax", true),
    missingInMooncakeIncludingPreview: getMissingInSovereignBit(rpns, rprt_delta, "inMooncake", true),
    missingInBlackforestIncludingPreview: getMissingInSovereignBit(rpns, rprt_delta, "inBlackforest", true)
  }})
})

// Get count of RPs with missing features by sovereign
var rprt_missing = getOrGenerate("resourceTypeMissing", today, function() {
  return {
    date: today,
    Fairfax: rprt_delta.filter(rprt => rprt.inFairfax === 0 && rprt.nonPreviewApis > 0 ).length,
    Mooncake: rprt_delta.filter(rprt => rprt.inMooncake === 0 && rprt.nonPreviewApis > 0 ).length,
    Blackforest: rprt_delta.filter(rprt => rprt.inBlackforest === 0 && rprt.nonPreviewApis > 0 ).length,
    FairfaxIncludingPreview: rprt_delta.filter(rprt => rprt.inFairfax === 0 ).length,
    MooncakeIncludingPreview: rprt_delta.filter(rprt => rprt.inMooncake === 0 ).length,
    BlackforestIncludingPreview: rprt_delta.filter(rprt => rprt.inBlackforest === 0 ).length
  }
})

// Get count of resource providers missing one or more resouce types by sovereign
var rpns_missing_rt = getOrGenerate("resourceProviderMissingResourceType", today, function() {
  return {
    date: today,
    Fairfax: rprt_missing_by_ns.filter(ns => ns.missingInFairfax > 0 ).length,
    Mooncake: rprt_missing_by_ns.filter(ns => ns.missingInMooncake > 0 ).length,
    Blackforest: rprt_missing_by_ns.filter(ns => ns.missingInBlackforest > 0 ).length,
    FairfaxIncludingPreview: rprt_missing_by_ns.filter(ns => ns.missingInFairfaxIncludingPreview > 0 ).length,
    MooncakeIncludingPreview: rprt_missing_by_ns.filter(ns => ns.missingInMooncakeIncludingPreview > 0 ).length,
    BlackforestIncludingPreview: rprt_missing_by_ns.filter(ns => ns.missingInBlackforestIncludingPreview > 0 ).length
  }
})

/*
/////////////////////////
// Presenting this information
/////////////////////////

// These many "services" are missing in Fairfax.
// Considerations: 
//  * RP used as proxy for service
//  * None of the sovereigns have any 3rd party service
//      (these are marketplace developer services like SendGrid & AppDynamics )
db.resourceProviderMissing.find()

// Get all the missing RPs in Fairfax
// ACTION: Get status/reason for each one.
db.resourceProviderDelta.find({inFairfax : 0, isFirstParty : true }, { _id : 0, namespace: 1 })

// These many "services" have missing "features" in Fairfax.
// Considerations: 
//  * RP used as proxy for service
//  * ResourceType used as proxy for feature
//  * PreviewAPIs used as a proxy for preview features
db.resourceProviderMissingResourceType.find()

// Get all the RPs with missing resource types in Fairfax
db.resourceTypeMissingByNamespace.find({ missingInFairfax : { $gt : 0 } }, { _id : 0, namespace : 1 , missingInFairfax : 1 })

// Get all the missing resource types in Fairfax
// ACTION: Get status/reason for each one.
db.resourceTypeDelta.find({ namespace: "microsoft.compute", inFairfax : 0 }, { _id : 0, resourceType : 1 , nonPreviewApis : 1 })
*/