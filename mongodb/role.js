// First need to import the role files
// via mongoimport and to the role collection

// Get policy records for each cloud
// TODO: Improve import so that I can use a find filter and not skip.
function getRoleDefinition(arr, i) { 
  return arr.find()
    .skip(i)
    .limit(1)[0]
    .value
    .filter(function(r) { return r.properties.type !== "CustomRole" })
    .map(function(r)
      { return {
        name: r.name,
        roleName: r.properties.roleName,
        preview: r.properties.description.indexOf("(Preview)") !== -1,
        resourceProviders: function (properties) {
          var rps = JSON.stringify(properties).match(rpRegEx);
          if (rps) {
            rps = rps.map(function (rp) { return rp.toLowerCase() });

            // Get distinct list of RPs
            return rps.filter(function(rp, i) { return rps.indexOf(rp) === i; })
          } else {
            return [];
          }
        }(r.properties)
      }}
    ) 
}
var r_ww = getRoleDefinition(db.role,0);
var r_ff = getRoleDefinition(db.role,1);
var r_mc = getRoleDefinition(db.role,2);
var r_bf = getRoleDefinition(db.role,3);

// Get delta for roles
var r_delta = r_ww.map(function(p) { return { 
  name: p.name, 
  roleName: p.roleName, 
  preview: p.preview, 
  resourceProviders: p.resourceProviders,
  inFairfax: r_ff.filter(function(ff) { return ff.name === p.name }).length, 
  inMooncake: r_mc.filter(function(mc) { return mc.name === p.name }).length, 
  inBlackforest: r_bf.filter(function(bf) { return bf.name === p.name }).length 
}});
dropAndInsert("roleDelta", r_delta);

// Get count of missing roles by sovereign
var r_missing = {
  Fairfax: r_delta.filter(function(p) { return !p.preview && p.inFairfax === 0 }).length,
  Mooncake: r_delta.filter(function(p) { return !p.preview && p.inMooncake === 0 }).length,
  Blackforest: r_delta.filter(function(p) { return !p.preview && p.inBlackforest === 0 }).length,
  FairfaxIncludingPreview: r_delta.filter(function(p) { return p.inFairfax === 0 }).length,
  MooncakeIncludingPreview: r_delta.filter(function(p) { return p.inMooncake === 0 }).length,
  BlackforestIncludingPreview: r_delta.filter(function(p) { return p.inBlackforest === 0 }).length
}
dropAndInsert("roleMissing", r_missing);

// Get count of missing roles by RP
function getRoleMissingInSovereignBit(rpns, r_delta, sovereignBit, includePreview) {
  return rpns[sovereignBit] === 0 ?
    "N/A" :
    r_delta.filter(function(p) {
      return p.resourceProviders.indexOf(rpns.namespace) > -1
      && p[sovereignBit] === 0
      && (includePreview || !p.preview)
    }).length
}
r_missing_by_ns = db.resourceProviderDelta.find().map(function(rpns) { return { 
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
  Fairfax: r_missing_by_ns.filter(function(ns) { return ns.missingInFairfax > 0 }).length,
  Mooncake: r_missing_by_ns.filter(function(ns) { return ns.missingInMooncake > 0 }).length,
  Blackforest: r_missing_by_ns.filter(function(ns) { return ns.missingInBlackforest > 0 }).length,
  FairfaxIncludingPreview: r_missing_by_ns.filter(function(ns) { return ns.missingInFairfaxIncludingPreview > 0 }).length,
  MooncakeIncludingPreview: r_missing_by_ns.filter(function(ns) { return ns.missingInMooncakeIncludingPreview > 0 }).length,
  BlackforestIncludingPreview: r_missing_by_ns.filter(function(ns) { return ns.missingInBlackforestIncludingPreview > 0 }).length
}
dropAndInsert("resourceProviderMissingRole", rpns_missing_r);