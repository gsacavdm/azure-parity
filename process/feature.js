f_missing_ns = db.resourceProviderDelta.find({inFairfax:1}).map(rp => { return {
  namespace: rp.namespace,
  isFirstParty: rp.isFirstParty,
  inFairfax: rp.inFairfax,
  inMooncake: rp.inMooncake,
  inBlackforest: rp.inBlackforest,
  missingResourceTypes: db.resourceTypeMissingByNamespace.findOne({namespace:rp.namespace}, {missingInFairfax:1, missingInMooncake:1, missingInBlackforest:1}),
  missingPolicy: db.policyMissingByNamespace.findOne({namespace:rp.namespace}, {missingInFairfax:1, missingInMooncake:1, missingInBlackforest:1}),
  missingRole: db.roleMissingByNamespace.findOne({namespace:rp.namespace}, {missingInFairfax:1, missingInMooncake:1, missingInBlackforest:1}),
  missingHealth: db.healthMissingByNamespace.findOne({namespace:rp.namespace}, {missingInFairfax:1, missingInMooncake:1, missingInBlackforest:1})
}})

function getMissingFeatureCount(rp, sovereign) {
  rp["missingFeaturesIn" + sovereign] = rp["in" + sovereign] === 0 ?
    "N/A" :
    rp.missingResourceTypes["missingIn" + sovereign]
    + rp.missingPolicy["missingIn" + sovereign]
    + rp.missingRole["missingIn" + sovereign]
    + rp.missingHealth["missingIn" + sovereign]
}
f_missing_ns.filter(rp => 
  rp.inFairfax === 1 || rp.inMooncake === 1 || rp.inBlackforest == 1
).forEach(rp => {
  getMissingFeatureCount(rp, "Fairfax");
  getMissingFeatureCount(rp, "Mooncake");
  getMissingFeatureCount(rp, "Blackforest");
})
dropAndInsert("featureMissingByNamespace", f_missing_ns);

// Get count of missing features by sovereign
f_missing = {
  Fairfax: db.featureMissingByNamespace.find({inFairfax:1}).map(ns => ns.missingFeaturesInFairfax).reduce((prev, next) => prev+next),
  Mooncake: db.featureMissingByNamespace.find({inMooncake:1}).map(ns => ns.missingFeaturesInMooncake).reduce((prev, next) => prev+next),
  Blackforest: db.featureMissingByNamespace.find({inBlackforest:1}).map(ns => ns.missingFeaturesInBlackforest).reduce((prev, next) => prev+next)
}
dropAndInsert("featureMissing", f_missing);

// Get count of resource providers missing one or more features by sovereign
rpns_missing_f = {
  Fairfax: db.featureMissingByNamespace.find({inFairfax:1}).map(ns => ns.missingFeaturesInFairfax).filter(mf => mf > 0).length,
  Mooncake: db.featureMissingByNamespace.find({inMooncake:1}).map(ns => ns.missingFeaturesInMooncake).filter(mf => mf > 0).length,
  Blackforest: db.featureMissingByNamespace.find({inBlackforest:1}).map(ns => ns.missingFeaturesInBlackforest).filter(mf => mf > 0).length,
}
dropAndInsert("resourceProviderMissingFeature", rpns_missing_f);
