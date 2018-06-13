function getRoleDefinition(arr) { 
  return arr.findOne()
    .value
    .filter(r => r.properties.type !== "CustomRole" )
    .map(function(r)
      { return {
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
var r_ww = getRoleDefinition(db.role_Ww);
var r_ff = getRoleDefinition(db.role_Ff);
var r_mc = getRoleDefinition(db.role_Mc);
var r_bf = getRoleDefinition(db.role_Bf);

// Get delta for roles
var r_delta = r_ww.map(r => { return { 
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
dropAndInsert("roleDelta", r_delta);

// Get count of missing roles by sovereign
function getMissingRoleCount(roles, sovereignBit, includePreview){
  return roles.filter(r => 
    r[sovereignBit] === 0
    && r["allRpsI" + sovereignBit.slice(1)]
    && (includePreview || !r.preview)
  ).length
}
var r_missing = {
  Fairfax: getMissingRoleCount(r_delta, "inFairfax"),
  Mooncake: getMissingRoleCount(r_delta, "inMooncake"),
  Blackforest: getMissingRoleCount(r_delta, "inBlackforest"),
  FairfaxIncludingPreview: getMissingRoleCount(r_delta, "inFairfax", true),
  MooncakeIncludingPreview: getMissingRoleCount(r_delta, "inMooncake", true),
  BlackforestIncludingPreview: getMissingRoleCount(r_delta, "inBlackforest", true)
}
dropAndInsert("roleMissing", r_missing);

// Get count of missing roles by RP
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
r_missing_by_ns = db.resourceProviderDelta.find().map(rpns => { return { 
  namespace: rpns.namespace,
  missingInFairfax: getRoleMissingInSovereignBit(rpns, r_delta, "inFairfax", false),
  missingInMooncake: getRoleMissingInSovereignBit(rpns, r_delta, "inMooncake", false),
  missingInBlackforest: getRoleMissingInSovereignBit(rpns, r_delta, "inBlackforest", false),
  missingInFairfaxIncludingPreview: getRoleMissingInSovereignBit(rpns, r_delta, "inFairfax", true),
  missingInMooncakeIncludingPreview: getRoleMissingInSovereignBit(rpns, r_delta, "inMooncake", true),
  missingInBlackforestIncludingPreview: getRoleMissingInSovereignBit(rpns, r_delta, "inBlackforest", true)
}})
dropAndInsert("roleMissingByNamespace", r_missing_by_ns)

// Get count of resource providers missing one or more roles by sovereign
rpns_missing_r = {
  Fairfax: r_missing_by_ns.filter(ns => ns.missingInFairfax > 0 ).length,
  Mooncake: r_missing_by_ns.filter(ns => ns.missingInMooncake > 0 ).length,
  Blackforest: r_missing_by_ns.filter(ns => ns.missingInBlackforest > 0 ).length,
  FairfaxIncludingPreview: r_missing_by_ns.filter(ns => ns.missingInFairfaxIncludingPreview > 0 ).length,
  MooncakeIncludingPreview: r_missing_by_ns.filter(ns => ns.missingInMooncakeIncludingPreview > 0 ).length,
  BlackforestIncludingPreview: r_missing_by_ns.filter(ns => ns.missingInBlackforestIncludingPreview > 0 ).length
}
dropAndInsert("resourceProviderMissingRole", rpns_missing_r);

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