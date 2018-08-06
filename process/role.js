function getRoleRows(cloud) { 
  return db.roleRaw.findOne({ Cloud:cloud, Date: { $gt : today } })
    .Data.value
    .filter(r => r.properties.type !== "CustomRole" )
    .map(function(r)
      { return {
        date: today,
        cloud: cloud,
        name: r.name,
        roleName: r.properties.roleName,
        preview: r.properties.description.indexOf("(Preview)") !== -1,
        resourceProviders: function (properties) {
          var rps = JSON.stringify(properties).match(rpRegEx);
          if (rps) {
            rps = rps.map(rp => rp.toLowerCase());

            // Get distinct list of RPs
            return rps.filter((rp, i) => rps.indexOf(rp) === i)
          } else {
            return [];
          }
        }(r.properties)
      }}
    ) 
}

var r_ww = getOrGenerateByCloud("role", "Ww", today, getRoleRows); 
var r_ff = getOrGenerateByCloud("role", "Ff", today, getRoleRows); 
var r_mc = getOrGenerateByCloud("role", "Mc", today, getRoleRows); 
var r_bf = getOrGenerateByCloud("role", "Bf", today, getRoleRows); 

// Get delta for roles
var r_delta = getOrGenerate("roleDelta", today, function() {
  return r_ww.map(r => { return { 
    date: today,
    name: r.name, 
    roleName: r.roleName, 
    preview: r.preview, 
    resourceProviders: r.resourceProviders,
    inFairfax: r_ff.filter(ff => ff.name === r.name ).length,
    allRpsInFairfax: allRpsAvailable(r.resourceProviders, "inFairfax"),
    inMooncake: r_mc.filter(mc => mc.name === r.name ).length,
    allRpsInMooncake: allRpsAvailable(r.resourceProviders, "inMooncake"),
    inBlackforest: r_bf.filter(bf => bf.name === r.name ).length,
    allRpsInBlackforest: allRpsAvailable(r.resourceProviders, "inBlackforest")
  }});
})

// Get count of missing roles by sovereign
var r_missing = getOrGenerate("roleMissing", today, function() {
  function getMissingRoleCount(roles, sovereignBit, includePreview){
    return roles.filter(r => 
      r[sovereignBit] === 0
      && r["allRpsI" + sovereignBit.slice(1)]
      && (includePreview || !r.preview)
    ).length
  }
  return {
    date: today,
    Fairfax: getMissingRoleCount(r_delta, "inFairfax"),
    Mooncake: getMissingRoleCount(r_delta, "inMooncake"),
    Blackforest: getMissingRoleCount(r_delta, "inBlackforest"),
    FairfaxIncludingPreview: getMissingRoleCount(r_delta, "inFairfax", true),
    MooncakeIncludingPreview: getMissingRoleCount(r_delta, "inMooncake", true),
    BlackforestIncludingPreview: getMissingRoleCount(r_delta, "inBlackforest", true)
  }
})

// Get count of missing roles by RP
var r_missing_by_ns = getOrGenerate("roleMissingByNamespace", today, function() {
  function getRoleMissingInSovereignBit(rpns, r_delta, sovereignBit, includePreview) {
    return rpns[sovereignBit] === 0 ?
      "N/A" :
      r_delta.filter(r => 
        r.resourceProviders.indexOf(rpns.namespace) > -1
        && r[sovereignBit] === 0
        && r["allRpsI" + sovereignBit.slice(1)]
        && (includePreview || !r.preview)
      ).length
  }
  return db.resourceProviderDelta.find().map(rpns => { return { 
    date: today,
    namespace: rpns.namespace,
    missingInFairfax: getRoleMissingInSovereignBit(rpns, r_delta, "inFairfax", false),
    missingInMooncake: getRoleMissingInSovereignBit(rpns, r_delta, "inMooncake", false),
    missingInBlackforest: getRoleMissingInSovereignBit(rpns, r_delta, "inBlackforest", false),
    missingInFairfaxIncludingPreview: getRoleMissingInSovereignBit(rpns, r_delta, "inFairfax", true),
    missingInMooncakeIncludingPreview: getRoleMissingInSovereignBit(rpns, r_delta, "inMooncake", true),
    missingInBlackforestIncludingPreview: getRoleMissingInSovereignBit(rpns, r_delta, "inBlackforest", true)
  }})
})

// Get count of resource providers missing one or more roles by sovereign
var rpns_missing_r = getOrGenerate("resourceProviderMissingRole", today, function() {
  return {
    date: today,
    Fairfax: r_missing_by_ns.filter(ns => ns.missingInFairfax > 0 ).length,
    Mooncake: r_missing_by_ns.filter(ns => ns.missingInMooncake > 0 ).length,
    Blackforest: r_missing_by_ns.filter(ns => ns.missingInBlackforest > 0 ).length,
    FairfaxIncludingPreview: r_missing_by_ns.filter(ns => ns.missingInFairfaxIncludingPreview > 0 ).length,
    MooncakeIncludingPreview: r_missing_by_ns.filter(ns => ns.missingInMooncakeIncludingPreview > 0 ).length,
    BlackforestIncludingPreview: r_missing_by_ns.filter(ns => ns.missingInBlackforestIncludingPreview > 0 ).length
  }
})

/*
/////////////////////////
// Presenting this information
/////////////////////////

// These many "services" have missing "features" in Fairfax.
// Considerations: 
//  * RP used as proxy for service
//  * Role used as proxy for feature
//  * Preview in role name used as a proxy for preview features
db.resourceProviderMissingRole.find()

// Get all the RPs with missing roles in Fairfax
db.roleMissingByNamespace.find({ 
  missingInFairfax : { $gt : 0 } 
}, { 
  _id : 0, 
  namespace : 1 , 
  missingInFairfax : 1 
})

// Get all the missing roles in Fairfax
// ACTION: Get status/reason for each one.
db.roleDelta.find({ 
  resourceProviders: "microsoft.network", 
  inFairfax : 0, 
  allRpsInFairfax: true, 
  preview: false, 
}, {
  _id: 0,
  name: 1,
  roleName: 1
})

// ACTION: Get the RBAC guys to introduce VERSIONS
// ACTION: Get the RBAC guys to standardize approach for preview
*/