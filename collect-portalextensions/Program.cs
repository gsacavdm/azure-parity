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
        static int CycleTime = 24 * 60 * 60 * 1000; // 24 hours

        static void Main(string[] args)
        {
            while (true) {
                string configDirPath = utils.GetEnvironmentVariableOrFail("CONFIG_DIR_PATH");
                string dataDirPath = utils.GetEnvironmentVariableOrFail("DATA_DIR_PATH");
                var files = Directory.GetFiles(configDirPath);

                foreach (var file in files) {
                    Console.WriteLine("Processing " + file + "...");
                    string cloudConfig = File.ReadAllText(file);

                    Console.WriteLine("Getting cloud config...");
                    JObject cloudConfigJson = JObject.Parse(cloudConfig);
                    string cloudName = cloudConfigJson["CloudName"].Value<string>();
                    string subscriptionId = cloudConfigJson["SubscriptionId"].Value<string>();
                    string accessToken = cloudConfigJson["AccessToken"].Value<string>();
                    string portalEndpoint = cloudConfigJson["PortalEndpoint"].Value<string>();

                    Console.WriteLine("Getting portal extensions...");
                    var diagnosticsEndpoint = String.Format("https://{0}/api/diagnostics", portalEndpoint);
                    if (Debug) Console.WriteLine("DiagnosticsEndpoint: " + diagnosticsEndpoint);
             
                    var portalExtensions = new JArray();       
                    
                    using (var httpClient = new HttpClient()) {
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
                            if (Debug) Console.WriteLine("ExtensionEndpoint: " + extensionEndpoint);
                            try {
                                extensionInfo = httpClient.GetStringAsync(extensionEndpoint).Result;
                                validEndpoint = true;
                            } catch (Exception ex) {
                                Console.WriteLine("WARN: Skipping {0} due to exception: {1}", extensionName, ex.Message);
                            }

                            var matches = Regex.Matches(extensionInfo, "\"features\"[ ]*:[ ]*{.*?}", RegexOptions.IgnoreCase);
                            if (matches.Count > 0) {
                                var features ="{" + matches[0].Value + "}";
                                var featuresJson = JObject.Parse(features)["features"];

                                extensionObject["features"] = featuresJson;
                                regexMatch = true;
                            } else {
                                Console.WriteLine("WARN: No features found for extension {0}", extensionName);
                            }

                            extensionObject["validEndpoint"] = validEndpoint;
                            extensionObject["regexMatch"] = regexMatch;
                            portalExtensions.Add(extensionObject);
                            //File.WriteAllText(String.Format("bin/output/ext/{0}", extensionName), extensionInfo);
                        }
                        
                        //File.WriteAllText(String.Format("bin/output/{0}", portalEndpoint), diagnosticsClean);
                    }
                    //Console.WriteLine(portalExtensions);

                    var wrapper = new JObject();
                    wrapper["value"] = portalExtensions;
                    
                    var dataPath = String.Format("{0}/portalExtension_{1}.json", dataDirPath, cloudName);
                    Console.WriteLine(String.Format("Saving {0}", dataPath));
                    File.WriteAllText(dataPath, wrapper.ToString());
                }
            
                Console.WriteLine("Done!");
                Task.Delay(CycleTime).Wait();
            }
        }
    }
}
