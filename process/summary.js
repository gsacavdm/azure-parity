dbs = db.adminCommand({ listDatabases:1 }).databases.map(d => db.getSiblingDB(d.name)).sort()

function printOverTime(dbs, collectionName) {
  dbs.forEach(db => {
    print(db);
    printjson(db[collectionName].findOne())
  })
}

function printDeltaOverTime(dbs, collectionName, sovereign) {
  if (!sovereign) sovereign = "Fairfax"

  dbs.forEach((db, i) => {
    db_p = dbs[i-1]
    if (i === 0) return;

    currMissing = db[collectionName].findOne()
    prevMissing = db_p[collectionName].findOne()

    curr = currMissing !== null ? currMissing[sovereign] : "N/A"
    prev = prevMissing !== null ? prevMissing[sovereign] : "N/A"
    delta = (curr - prev)

    print ("Previous DB: " + db_p + " | Previous Value: " + prev + " | Current DB: " + db + " | Current Value: " + curr + " | Delta: " + delta)
  })
}

printOverTime(dbs, "featureMissing")
printDeltaOverTime(dbs, "featureMissing")

printDeltaOverTime(dbs, "resourceTypeMissing")
printDeltaOverTime(dbs, "roleMissing")
printDeltaOverTime(dbs, "policyMissing")
printDeltaOverTime(dbs, "healthMissing")

printDeltaOverTime(dbs, "portalExtensionFeatureMissing")

db.featureMissing.find()

db.resourceTypeMissing.find()
db.policyMissing.find()
db.roleMissing.find()
db.healthMissing.find()

db.portalExtensionFeatureMissing.find()


db.featureMissingByNamespace.find({inFairfax:1}).map(f => { return {
  namespace: f.namespace,
  missingFeatures: f.missingFeaturesInFairfax,
  missingResourceTypes: f.missingResourceTypes.missingInFairfax,
  missingPolicy: f.missingPolicy.missingInFairfax,
  missingRole: f.missingRole.missingInFairfax,
  missingHealth: f.missingHealth.missingInFairfax,
}}).reduce((prev,curr) => prev.missingRole + curr.missingRole)


// Standard setup for all commands below
dbs = db.adminCommand({ listDatabases:1 }).databases.map(d => db.getSiblingDB(d.name)).sort()
i = db.adminCommand({listDatabases:1}).databases.length - 1

// Get delta over time for roles
curr = dbs[i].roleDelta.find({inFairfax:0,allRpsInFairfax:true,preview:false},{roleName:1,_id:0}).map(x => x)
prev = dbs[i-1].roleDelta.find({inFairfax:0,allRpsInFairfax:true,preview:false},{roleName:1,_id:0}).map(x => x)

curr.filter(p => prev.filter(c => c.roleName === p.roleName).length === 0)
prev.filter(p => curr.filter(c => c.roleName === p.roleName).length === 0)

// Get delta over time for resource types
curr = dbs[i].resourceTypeDelta.find({inFairfax:0,nonPreviewApis: {$gt:0}},{resourceType:1,_id:0}).map(x => x)
prev = dbs[i-1].resourceTypeDelta.find({inFairfax:0,nonPreviewApis: {$gt:0}},{resourceType:1,_id:0}).map(x => x)

curr.filter(p => prev.filter(c => c.resourceType === p.resourceType).length === 0)
prev.filter(p => curr.filter(c => c.resourceType === p.resourceType).length === 0)

// Get delta over time for portal extension features
curr = dbs[i].portalExtensionFeatureDelta.find({},{name:1, featureName:1, featureValue:1, featureValueInFairfax:1 ,_id:0}).map(x => x).filter(x => x.featureValue !== x.featureValueInFairfax)
prev = dbs[i-1].portalExtensionFeatureDelta.find({},{name:1, featureName:1, featureValue:1, featureValueInFairfax:1 ,_id:0}).map(x => x).filter(x => x.featureValue !== x.featureValueInFairfax)

curr.filter(p => prev.filter(c => c.name === p.name && c.featureName === p.featureName).length === 0)
prev.filter(p => curr.filter(c => c.name === p.name && c.featureName === p.featureName).length === 0)

// RPs
curr = dbs[i].resourceProviderDelta.find({inFairfax:0},{namespace:1,_id:0}).map(x => x)
prev = dbs[i-1].resourceProviderDelta.find({inFairfax:0},{namespace:1,_id:0}).map(x => x)

curr.filter(p => prev.filter(c => c.namespace === p.namespace).length === 0)
prev.filter(p => curr.filter(c => c.namespace === p.namespace).length === 0)