// First need to import via mongoimport and specify collection

// Get RP records for each cloud
// TODO: Improve import so that I can use a find filter and not skip.
var rp_ww = db.resourceProvider.find().skip(0).limit(1)[0].value;
var rp_ff = db.resourceProvider.find().skip(1).limit(1)[0].value;
var rp_mc = db.resourceProvider.find().skip(2).limit(1)[0].value;
var rp_bf = db.resourceProvider.find().skip(3).limit(1)[0].value;

// Get list of namespaces per cloud
function getNamespaces(rps) { return rps.map(function(rp){return rp.namespace}).sort() }
var rpns_ww = getNamespaces(rp_ww);
var rpns_ff = getNamespaces(rp_ff);
var rpns_mc = getNamespaces(rp_mc);
var rpns_bf = getNamespaces(rp_bf);

// Get resource types per cloud
function getResourceTypes(rps) { return [].concat.apply([], rps.map(function(rp){return rp.resourceTypes.map(function(rpt){return {namespace: rp.namespace, resourceType: rp.namespace + '/' + rpt.resourceType }} )})).sort() }
var rprt_ww = getResourceTypes(rp_ww);
var rprt_ff = getResourceTypes(rp_ff);
var rprt_mc = getResourceTypes(rp_mc);
var rprt_bf = getResourceTypes(rp_bf);

// Get apis per cloud
function getApis(rps) {
  return [].concat.apply([],
    [].concat.apply([], 
      rps.map(function(rp) { 
        return rp.resourceTypes.map(function(rpt) { 
          return rpt.apiVersions.map(function(apiVersion) { return {
            namespace: rp.namespace, 
            resourceType: rp.namespace + '/' + rpt.resourceType,
            apiVersion: apiVersion
          }})
        })
      })
    )
  ).sort() 
}
var api_ww = getApis(rp_ww);
var api_ff = getApis(rp_ff);
var api_mc = getApis(rp_mc);
var api_bf = getApis(rp_bf);

// Get delta for namespaces
var rpns_delta = rpns_ww.map(function(rpns) { return { 
  namespace:rpns, 
  isFirstParty: rpns.toLowerCase().indexOf("microsoft") !== -1,
  inFairfax:rpns_ff.filter(function(ff) { return ff === rpns }).length, 
  inMooncake:rpns_mc.filter(function(mc) { return mc === rpns }).length, 
  inBlackforest:rpns_bf.filter(function(bf) { return bf === rpns }).length 
}});

// Get count of missing RPs by sovereign
var rpns_missing = {
  Fairfax: rpns_delta.filter(function(rpns) { return rpns.isFirstParty && rpns.inFairfax === 0 }).length,
  Mooncake: rpns_delta.filter(function(rpns) { return rpns.isFirstParty && rpns.inMooncake === 0 }).length,
  Blackforest: rpns_delta.filter(function(rpns) { return rpns.isFirstParty && rpns.inBlackforest === 0 }).length
}

// Get namespaces that are present in at least one sovereign
var rpns_sovereign = rpns_delta.filter(function(rpns) { return rpns.inFairfax || rpns.inMooncake || rpns.inBlackforest })

// Get delta for resource types
//TODO: harden this do that it doesn't fail if no namespace match
//      caused by the property access to the [0] in the inFairfax
function getResourceTypeInSovereignBit(rpns_delta, rprt, rprt_sovereign, sovereignBit) {
  return (rpns_delta.filter(function(ns) { return ns.namespace === rprt.namespace }))[0][sovereignBit] ? 
            rprt_sovereign.filter(function(sovereign) { return sovereign.resourceType === rprt.resourceType }).length 
            : "N/A"
}
rprt_delta = rprt_ww.map(function(rprt) { return { 
  namespace: rprt.namespace, 
  resourceType: rprt.resourceType,
  nonPreviewApis: api_ww.filter(function(api) { return api.resourceType === rprt.resourceType && api.apiVersion.indexOf("preview") === -1 }).length,
  inFairfax: getResourceTypeInSovereignBit(rpns_delta, rprt, rprt_ff, "inFairfax"),
  inMooncake: getResourceTypeInSovereignBit(rpns_delta, rprt, rprt_mc, "inMooncake"),
  inBlackforest: getResourceTypeInSovereignBit(rpns_delta, rprt, rprt_bf, "inBlackforest"),
}});

rprt_sovereign = rprt_delta.filter(function(rprt) { return rprt.inFairfax !== "N/A" || rprt.inMooncake !== "N/A" || rprt.inBlackforest !== "N/A" })

// Get missing resource types
function getMissingInSovereignBit(rpns, rprt_sovereign, sovereignBit, includePreview) {
  return rpns[sovereignBit] === 0 ?
    "N/A" :
    rprt_sovereign.filter(function(rprt_sov) {
      return rprt_sov.namespace === rpns.namespace
      && rprt_sov[sovereignBit] === 0 // Feature is missing
      && (includePreview || rprt_sov.nonPreviewApis > 0 )
    }).length
}
rprt_missing = rpns_sovereign.map(function(rpns) { return { 
  namespace: rpns.namespace,
  missingInFairfax: getMissingInSovereignBit(rpns, rprt_sovereign, "inFairfax", false),
  missingInMooncake: getMissingInSovereignBit(rpns, rprt_sovereign, "inMooncake", false),
  missingInBlackforest: getMissingInSovereignBit(rpns, rprt_sovereign, "inBlackforest", false),
  missingInFairfaxIncludingPreview: getMissingInSovereignBit(rpns, rprt_sovereign, "inFairfax", true),
  missingInMooncakeIncludingPreview: getMissingInSovereignBit(rpns, rprt_sovereign, "inMooncake", true),
  missingInBlackforestIncludingPreview: getMissingInSovereignBit(rpns, rprt_sovereign, "inBlackforest", true)
 }}).filter(function(rprt) { 
      return rprt.missingInFairfax > 0 || rprt.missingInMooncake > 0 || rprt.missingInBlackforest > 0
})

// Get count of RPs with missing features by sovereign
function normalizeNa(val) { return val === "N/A" ? 0 : val}
rp_missing_rt = {
  Fairfax: rprt_missing.map(function(rprt) { return rprt.missingInFairfax }).reduce(function(prev,next) { return normalizeNa(prev) + normalizeNa(next)}),
  Mooncake: rprt_missing.map(function(rprt) { return rprt.missingInMooncake }).reduce(function(prev,next) { return normalizeNa(prev) + normalizeNa(next)}),
  Blackforest: rprt_missing.map(function(rprt) { return rprt.missingInBlackforest }).reduce(function(prev,next) { return normalizeNa(prev) + normalizeNa(next)})
}

// Get all missing features for a sovereign
rprt_sovereign.filter(function(x) { return x.inFairfax === 0 && x.nonPreviewApis > 0 })

// Get all missing features for a namespace
rprt_sovereign.filter(function(x) { return x.namespace === "microsoft.insights" && x.nonPreviewApis > 0 && (x.inFairfax === 0 || x.inMooncake === 0 || x.inBlackforest ===0 ) })

// Get all missing features
rprt_sovereign.filter(function(x) { return x.nonPreviewApis > 0 && (x.inFairfax === 0 || x.inMooncake === 0 || x.inBlackforest === 0 ) })
 
