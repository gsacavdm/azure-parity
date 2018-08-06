function getPortalExtensionRows(cloud) {
  return db.portalExtensionRaw
    .findOne({ Cloud:cloud, Date: { $gt : today } })
    .Data.value
    .map(pe => { return {
      date: today,
      cloud: cloud,
      name: pe.name,
      validEdnpoint: pe.validEdnpoint,
      regexMatch: pe.regexMatch,
      featues: pe.features
    }})
}

var pe_ww = getOrGenerateByCloud("portalExtension", "Ww", today, getPortalExtensionRows); 
var pe_ff = getOrGenerateByCloud("portalExtension", "Ff", today, getPortalExtensionRows); 
var pe_mc = getOrGenerateByCloud("portalExtension", "Mc", today, getPortalExtensionRows); 
var pe_bf = getOrGenerateByCloud("portalExtension", "Bf", today, getPortalExtensionRows);

// Get portal extension features per cloud
function getPortalExtensionFeatures(cloud) {
  return [].concat.apply([], 
    db.portalExtension
      .find({ Cloud:cloud, Date: { $gt : today } })
      .map(pe => Object.keys(pe.features ? pe.features: {}).map(f =>
        { return {
          date: today,
          cloud: cloud,
          name: pe.name,
          featureName: f,
          featureValue: pe.features[f],
        }}
    ))
  ).sort()
}

var pef_ww = getOrGenerateByCloud("portalExtensionFeature", "Ww", today, getPortalExtensionFeatures); 
var pef_ff = getOrGenerateByCloud("portalExtensionFeature", "Ff", today, getPortalExtensionFeatures); 
var pef_mc = getOrGenerateByCloud("portalExtensionFeature", "Mc", today, getPortalExtensionFeatures); 
var pef_bf = getOrGenerateByCloud("portalExtensionFeature", "Bf", today, getPortalExtensionFeatures);

// Get delta for portal extensions
var pe_delta = getOrGenerate("portalExtensionDelta", today, function() {
  return pe_ww.map(pe => { return {
    date: today,
    name: pe.name,
    inFairfax: pe_ff.filter(pe_sov => pe_sov.name === pe.name).length,
    inMooncake: pe_mc.filter(pe_sov => pe_sov.name === pe.name).length,
    inBlackforest: pe_bf.filter(pe_sov => pe_sov.name === pe.name).length,
  }})
})

// Get count of missing portal extensions by sovereign
var pe_missing = getOrGenerate("portalExtensionMissing", today, function() {
  return {
    date: today,
    Fairfax: pe_delta.filter(pe => pe.inFairfax === 0 ).length,
    Mooncake: pe_delta.filter(pe => pe.inMooncake === 0 ).length,
    Blackforest: pe_delta.filter(pe => pe.inBlackforest === 0 ).length,
  }
})

// Get delta for portal extension features
var pef_delta = getOrGenerate("portalExtensionFeatureDelta", today, function() {
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
  return pef_ww.map(pef => { return {
    date: today,
    name: pef.name,
    featureName: pef.featureName,
    featureValue: pef.featureValue,
    featureValueInFairfax: getPortalExtensionFeatureInSovereignBit(pe_delta, pef, pef_ff, "inFairfax"),
    featureValueInMooncake: getPortalExtensionFeatureInSovereignBit(pe_delta, pef, pef_mc, "inMooncake"),
    featureValueInBlackforest: getPortalExtensionFeatureInSovereignBit(pe_delta, pef, pef_bf, "inBlackforest"),
  }})
})

// Get count of missing features by extension
var pef_missing_by_ns = getOrGenerate("portalExtensionFeatureMissingByNamespace", today, function() {
function getMissingInSovereignBit(pe, pef, sovereignBit) {
  return pe[sovereignBit] === 0 ?
    "N/A" :
    pef.filter(f => {
      return f.name === pe.name
      && f.featureValue !== f["featureValueI" + sovereignBit.slice(1)]
    }).length
}
  return pe_delta.map(pe => { return { 
    date: today,
    name: pe.name,
    missingInFairfax: getMissingInSovereignBit(pe, pef_delta, "inFairfax"),
    missingInMooncake: getMissingInSovereignBit(pe, pef_delta, "inMooncake"),
    missingInBlackforest: getMissingInSovereignBit(pe, pef_delta, "inBlackforest"),
  }})
})

// Get count of missing portal extension features by sovereign
var pef_missing = getOrGenerate("portalExtensionFeatureMissing", today, function() {
  return {
    date: today,
    Fairfax: pef_delta.filter(pef => pef.featureValueInFairfax !== "N/A" && pef.featureValue !== pef.featureValueInFairfax).length,
    Mooncake: pef_delta.filter(pef => pef.featureValueInMooncake !== "N/A"  && pef.featureValue !== pef.featureValueInMooncake).length,
    Blackforest: pef_delta.filter(pef => pef.featureValueInBlackforest !== "N/A" && pef.featureValue !== pef.featureValueInBlackforest).length
  }
})
