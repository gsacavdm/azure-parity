// First need to import the policy files
// via mongoimport and to the policy collection

function safeGet(obj, properties, defaultVal) {
  var properties = properties.split(".");

  for (var i = 0; i < properties.length; i++) {
    if (!obj || !obj[properties[i]]) {
      return defaultVal;
    }
    obj = obj[properties[i]];
  }
  return obj;
}

// Get policy records for each cloud
// TODO: Improve import so that I can use a find filter and not skip.
var rpRegEx = /Microsoft\.[a-zA-Z.]+/g
function getPolicyDefinition(arr, i) { 
  return arr.find()
    .skip(i)
    .limit(1)[0]
    .value
    .filter(function(p) { return !safeGet(p, "properties.metadata.deprecated", false) })
    .map(function(p)
      { return {
        name: p.name,
        displayName: p.properties.displayName,
        preview: safeGet(p, "properties.metadata.preview", false),
        resourceProviders: function (properties) {
          var rps = JSON.stringify(properties).match(rpRegEx);
          return rps ? rps.filter(function(rp, i) {
            return rps.indexOf(rp) === i;
          }) : []
        }(p.properties)
      }}
    ) 
}
var p_ww = getPolicyDefinition(db.policy,0);
var p_ff = getPolicyDefinition(db.policy,1);
var p_mc = getPolicyDefinition(db.policy,2);
var p_bf = getPolicyDefinition(db.policy,3);

// Flatten to one record per policy per RP
function flattenPolicies(policies) {
  return [].concat.apply([],
    policies.map(function(p) {
      return p.resourceProviders.map(function(rp) { 
        return {
          resourceProvider: rp, 
          name: p.name,
          displayName: p.displayName,
          preview: p.preview,
          inFairfax: p_ff.filter(function(p_sovereign) { return p_sovereign.name === p.name }).length,
          inMooncake: p_mc.filter(function(p_sovereign) { return p_sovereign.name === p.name }).length,
          inBlackforest: p_bf.filter(function(p_sovereign) { return p_sovereign.name === p.name }).length
        }
      })
    })
  ).sort() 
}

var p_sovereign = flattenPolicies(p_ww);

var p_missing = {
  Fairfax: p_sovereign.filter(function(p) { return !p.inFairfax && !p.preview }).length,
  Mooncake: p_sovereign.filter(function(p) { return !p.inMooncake && !p.preview }).length,
  Blackforest: p_sovereign.filter(function(p) { return !p.inBlackforest && !p.preview }).length,
  FairfaxIncludingPreview: p_sovereign.filter(function(p) { return !p.inFairfax }).length,
  MooncakeIncludingPreview: p_sovereign.filter(function(p) { return !p.inMooncake }).length,
  BlackforestIncludingPreview: p_sovereign.filter(function(p) { return !p.inBlackforest }).length,
}