if (allExists([
  "featureDelta"
])) {
  quit();
}
db.featureDelta.drop()

list_rt = db.resourceTypeDelta.find({ 
  inFairfax:0, 
  nonPreviewApis: { $gt: 0 }
}).map( rt => { return { 
  _id: "ResourceType/" + rt.resourceType,
  cloud: "Fairfax",
  type: "ResourceType",
  status: "New",
  reason: "",
  additionalInfo: "NonPreviewApis: " + rt.nonPreviewApis 
}})
db.featureDelta.insert(list_rt)

list_h = db.healthDelta.find({
  inFairfax:0
}).map(h => { return {
  _id: "Health/" + h.resourceType,
  cloud: "Fairfax",
  type: "Health",
  status: "New",
  reason: "",
  additionalInfo: ""
}})
db.featureDelta.insert(list_h)

list_p = db.policyDelta.find({
  allRpsInFairfax: true, 
  inFairfax:0
}).map(p => { return {
  _id: "Policy/" + p.name,
  cloud: "Fairfax",
  type: "Policy",
  status: "New",
  reason: "",
  additionalInfo: "DisplayName: " + p.displayName + 
    " | ResourceProviders: " + p.resourceProviders
}})
db.featureDelta.insert(list_p)

list_r = db.roleDelta.find({
  allRpsInFairfax: true,
  inFairfax:0
}).map(r => { return {
  _id: "Role/" + r.name,
  cloud: "Fairfax",
  type: "Role",
  status: "New",
  reason: "",
  additionalInfo: "RoleName: " + r.roleName + 
    " | ResourceProviders: " + r.resourceProviders
}})
db.featureDelta.insert(list_r)

list_pef = db.portalExtensionFeatureDelta.find({
  featureValueInFairfax: { $ne: "-Missing-" }
}).map(f => f).filter(f => 
  f.featureValue !== f.featureValueInFairfax
).map(f => { return {
  _id: "PortalExtensionFeature/" + f.name + "/" + f.featureName,
  cloud: "Fairfax",
  type: "PortalExtensionFeature",
  status: "New",
  reason: "",
  additionalInfo: "FeatureValue: " + f.featureValue + 
    " | featureValueInFairfax: " + f.featureValueInFairfax
}})
db.featureDelta.insert(list_pef)
