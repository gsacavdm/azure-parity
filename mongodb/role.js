// First need to import the role files
// via mongoimport and to the role collection

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
          var rps = JSON.stringify(properties.permissions).match(rpRegEx);
          return rps ? rps.filter(function(rp, i) {
            return rps.indexOf(rp) === i;
          }) : []
        }(r.properties)
      }}
    ) 
}
var r_ww = getRoleDefinition(db.role,0);
var r_ff = getRoleDefinition(db.role,1);
var r_mc = getRoleDefinition(db.role,2);
var r_bf = getRoleDefinition(db.role,3);

// Flatten to one record per role per RP
function flattenRoles(roles) {
  return [].concat.apply([],
    roles.map(function(r) {
      return r.resourceProviders.map(function(rp) { 
        return {
          resourceProvider: rp, 
          name: r.name,
          roleName: r.roleName,
          preview: r.preview,
          inFairfax: r_ff.filter(function(r_sovereign) { return r_sovereign.name === r.name }).length,
          inMooncake: r_mc.filter(function(r_sovereign) { return r_sovereign.name === r.name }).length,
          inBlackforest: r_bf.filter(function(r_sovereign) { return r_sovereign.name === r.name }).length
        }
      })
    })
  ).sort() 
}

var r_sovereign = flattenRoles(r_ww);

var r_missing = {
  Fairfax: r_sovereign.filter(function(r) { return !r.inFairfax && !r.preview }).length,
  Mooncake: r_sovereign.filter(function(r) { return !r.inMooncake && !r.preview }).length,
  Blackforest: r_sovereign.filter(function(r) { return !r.inBlackforest && !r.preview }).length,
  FairfaxIncludingPreview: r_sovereign.filter(function(r) { return !r.inFairfax }).length,
  MooncakeIncludingPreview: r_sovereign.filter(function(r) { return !r.inMooncake }).length,
  BlackforestIncludingPreview: r_sovereign.filter(function(r) { return !r.inBlackforest }).length,
}