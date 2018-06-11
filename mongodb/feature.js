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
rp_o.filter(rp => 
  rp.inFairfax === 1 || rp.inMooncake === 1 || rp.inBlackforest == 1
).forEach(rp => {
  getMissingFeatureCount(rp, "Fairfax");
  getMissingFeatureCount(rp, "Mooncake");
  getMissingFeatureCount(rp, "Blackforest");
})
dropAndInsert("featureMissingByNamespace", rp_o);

// Get count of missing features by sovereign
f_missing = {
  Fairfax: db.featuresMissingByNamespace.find({inFairfax:1}).map(ns => ns.missingFeaturesInFairfax).reduce((prev, next) => prev+next),
  Mooncake: db.featuresMissingByNamespace.find({inMooncake:1}).map(ns => ns.missingFeaturesInMooncake).reduce((prev, next) => prev+next),
  Blackforest: db.featuresMissingByNamespace.find({inBlackforest:1}).map(ns => ns.missingFeaturesInBlackforest).reduce((prev, next) => prev+next)
}
dropAndInsert("featureMissing", f_missing);

// Get count of resource providers missing one or more features by sovereign
rpns_missing_f = {
  Fairfax: db.featuresMissingByNamespace.find({inFairfax:1}).map(ns => ns.missingFeaturesInFairfax).filter(mf => mf > 0).length,
  Mooncake: db.featuresMissingByNamespace.find({inMooncake:1}).map(ns => ns.missingFeaturesInMooncake).filter(mf => mf > 0).length,
  Blackforest: db.featuresMissingByNamespace.find({inBlackforest:1}).map(ns => ns.missingFeaturesInBlackforest).filter(mf => mf > 0).length,
}
dropAndInsert("resourceProviderMissingFeature", rpns_missing_f);
