// First need to import via mongoimport and specify collection

// Get portal extension records for each cloud
// TODO: Improve import so that I can use a find filter and not skip.
var pe_ww = getRecord("portalExtension", 0).shellEnvironment.extensionsMetadata;
var pe_ff = getRecord("portalExtension", 1).shellEnvironment.extensionsMetadata;
var pe_mc = getRecord("portalExtension", 2).shellEnvironment.extensionsMetadata;
var pe_bf = getRecord("portalExtension", 3).shellEnvironment.extensionsMetadata;

// Get delta for portal extensions
function getExtensionUri(pes, name) {
  var extension = pes.filter(pe => pe.name === name);
  if (extension && extension.length > 0) {
    return extension[0].uri
  }
  else {
    return "N/A"
  }
}
pe_delta = pe_ww.map(pe => { return { 
  name: pe.name,
  feedbackEmail: pe.feedbackEmail,
  uri: pe.uri,
  uriFairfax: getExtensionUri(pe_ff, pe.name),
  uriMooncake: getExtensionUri(pe_mc, pe.name),
  uriBlackforest: getExtensionUri(pe_bf, pe.name)
}}).sort()
dropAndInsert("portalExtentionDelta", pe_delta)