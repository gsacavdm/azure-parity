using System;
using System.IO;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity.collect_portalextensions
{
    class Program
    {
        static bool Debug = true;

        static void Main(string[] args)
        {
            utils.Collect("portalExtension", false, (subscriptionId, portalEndpoint, httpClient) => {
                var diagnosticsEndpoint = String.Format("https://{0}/api/diagnostics", portalEndpoint);
                
                if (Debug) utils.Log("Collect Portal Extension. DiagnosticsEndpoint={0}", diagnosticsEndpoint);
             
                var portalExtensions = new JArray();       
                
                var diagnosticsRaw = httpClient.GetStringAsync(diagnosticsEndpoint).Result;

                var diagnosticsClean = diagnosticsRaw.Replace("<pre>","").Replace("</pre>","");
                var diagnostics = JObject.Parse(diagnosticsClean);    

                JArray extensions = diagnostics["shellEnvironment"]["extensionsMetadata"] as JArray; // Older version
                if (extensions == null) extensions = diagnostics["extensionsMetadata"]["extensions"] as JArray;
                
                foreach (var extension in extensions) {
                    var extensionName = extension["name"];
                    var extensionUri = extension["uri"];
                    var extensionEndpoint = String.Format("https:{0}?sessionId=01234567890abcdef&trustedAuthority={1}&shellVersion=1.2.3.4&l=en", extensionUri, portalEndpoint);
                    
                    var extensionObject = new JObject();
                    extensionObject["name"] = extensionName;
                    var regexMatch = false;
                    var validEndpoint = false;

                    var extensionInfo = String.Empty;
                    if (Debug) utils.Log("Collect Portal Extension Config. ExtensionEndpoint={0}", extensionEndpoint);
                    try {
                        extensionInfo = httpClient.GetStringAsync(extensionEndpoint).Result;
                        validEndpoint = true;
                    } catch (Exception ex) {
                        utils.Log("WARNING Exception. ExtensionName={0} ExceptionMessage={1}", extensionName, ex.Message);
                    }

                    var matches = Regex.Matches(extensionInfo, "\"features\"[ ]*:[ ]*{.*?}", RegexOptions.IgnoreCase);
                    if (matches.Count > 0) {
                        var features ="{" + matches[0].Value + "}";
                        var featuresJson = JObject.Parse(features)["features"];

                        extensionObject["features"] = featuresJson;
                        regexMatch = true;
                    } else {
                        utils.Log("WARNING No Features Found. ExtensionName={0}", extensionName);
                    }

                    extensionObject["validEndpoint"] = validEndpoint;
                    extensionObject["regexMatch"] = regexMatch;
                    portalExtensions.Add(extensionObject);
                    //File.WriteAllText(String.Format("bin/output/ext/{0}", extensionName), extensionInfo);
                }
                    
                //File.WriteAllText(String.Format("bin/output/{0}", portalEndpoint), diagnosticsClean);
                //utils.Log("Collect Portal Extensions Complete. PortalExtensions={0}", portalExtensions);

                var wrapper = new JObject();
                wrapper["value"] = portalExtensions;
                return wrapper.ToString();
            });
        }
    }
}
