var pe_ww = db.portalExtension_Ww.findOne().value;
var pe_ff = db.portalExtension_Ff.findOne().value;
var pe_mc = db.portalExtension_Mc.findOne().value;
var pe_bf = db.portalExtension_Bf.findOne().value;

// Get portal extension features per cloud
function getPortalExtensionFeatures(pes) {
  return [].concat.apply([], 
    pes.map(pe => Object.keys(pe.features ? pe.features: {}).map(f =>
      { return {
        name: pe.name,
        featureName: f,
        featureValue: pe.features[f],
      }}
    ))
  ).sort()
}
var pef_ww = getPortalExtensionFeatures(pe_ww);
var pef_ff = getPortalExtensionFeatures(pe_ff);
var pef_mc = getPortalExtensionFeatures(pe_mc);
var pef_bf = getPortalExtensionFeatures(pe_bf);

// Get delta for portal extensions
pe_delta = pe_ww.map(pe => { return {
  name: pe.name,
  inFairfax: pe_ff.filter(pe_sov => pe_sov.name === pe.name).length,
  inMooncake: pe_mc.filter(pe_sov => pe_sov.name === pe.name).length,
  inBlackforest: pe_bf.filter(pe_sov => pe_sov.name === pe.name).length,
}})
dropAndInsert("portalExtensionDelta", pe_delta)

// Get count of missing portal extensions by sovereign
var pe_missing = {
  Fairfax: pe_delta.filter(pe => pe.inFairfax === 0 ).length,
  Mooncake: pe_delta.filter(pe => pe.inMooncake === 0 ).length,
  Blackforest: pe_delta.filter(pe => pe.inBlackforest === 0 ).length,
}
dropAndInsert("portalExtensionMissing", pe_missing);

// Get delta for portal extension features
function getPortalExtensionFeatureInSovereignBit(pe_delta, pef, pef_sov, sovereignBit) {
  portalExtensionInSovereign = pe_delta.filter(pe => pe.name === pef.name)[0][sovereignBit];
  portalExtensionFeatureInSovereign = pef_sov.filter(sovereign => 
            sovereign.name === pef.name
          && sovereign.featureName === pef.featureName);
  
  if (portalExtensionInSovereign) {
    if (portalExtensionFeatureInSovereign.length > 0) {
      return portalExtensionFeatureInSovereign[0].featureValue;
    }
    else {
      return "-Missing-"
    }
  } else {
    return "N/A"
  }
}
pef_delta = pef_ww.map(pef => { return {
  name: pef.name,
  featureName: pef.featureName,
  featureValue: pef.featureValue,
  featureValueInFairfax: getPortalExtensionFeatureInSovereignBit(pe_delta, pef, pef_ff, "inFairfax"),
  featureValueInMooncake: getPortalExtensionFeatureInSovereignBit(pe_delta, pef, pef_mc, "inMooncake"),
  featureValueInBlackforest: getPortalExtensionFeatureInSovereignBit(pe_delta, pef, pef_bf, "inBlackforest"),
}})
dropAndInsert("portalExtensionFeatureDelta", pef_delta)

// Get count of missing features by extension
function getMissingInSovereignBit(pe, pef, sovereignBit) {
  return pe[sovereignBit] === 0 ?
    "N/A" :
    pef.filter(f => {
      return f.name === pe.name
      && f.featureValue !== f["featureValueI" + sovereignBit.slice(1)]
    }).length
}
pef_missing_by_ns = pe_delta.map(pe => { return { 
  name: pe.name,
  missingInFairfax: getMissingInSovereignBit(pe, pef_delta, "inFairfax"),
  missingInMooncake: getMissingInSovereignBit(pe, pef_delta, "inMooncake"),
  missingInBlackforest: getMissingInSovereignBit(pe, pef_delta, "inBlackforest"),
}})
dropAndInsert("portalExtensionFeatureMissingByNamespace", pef_missing_by_ns);

// Get count of missing portal extension features by sovereign
pef_missing = {
  Fairfax: pef_delta.filter(pef => pef.featureValueInFairfax !== "N/A" && pef.featureValue !== pef.featureValueInFairfax).length,
  Mooncake: pef_delta.filter(pef => pef.featureValueInMooncake !== "N/A"  && pef.featureValue !== pef.featureValueInMooncake).length,
  Blackforest: pef_delta.filter(pef => pef.featureValueInBlackforest !== "N/A" && pef.featureValue !== pef.featureValueInBlackforest).length
}
dropAndInsert("portalExtensionFeatureMissing", pef_missing);
