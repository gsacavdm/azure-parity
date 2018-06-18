using System;
using System.IO;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Linq;

using Microsoft.Azure.KeyVault;
using Microsoft.IdentityModel.Clients.ActiveDirectory;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity
{
    class Program
    {
        static bool Debug = true;
        //static string WhatToGet = "rps,policies,roles,health,monitor,vmextensions,portalextensions";
        static string WhatToGet = "monitor";

        static void Main(string[] args)
        {
            var mainClientId = Environment.GetEnvironmentVariable("CLIENT_ID");
            var mainClientSecret = Environment.GetEnvironmentVariable("CLIENT_SECRET"); 
            var vaultBaseUrl = Environment.GetEnvironmentVariable("VAULT_BASE_URL");

            var keyVaultClient = new KeyVaultClient(
                new KeyVaultClient.AuthenticationCallback(
                    (authority, resource, scope) => 
                        GetAccessToken(authority, resource, mainClientId, mainClientSecret)
                ));
            

            var clouds = new string[] { "Ww", "Ff", "Mc", "Bf" };
            var aadEndpoints = new string[] { "https://login.microsoftonline.com/", "https://login.microsoftonline.us/", "https://login.chinacloudapi.cn/", "https://login.microsoftonline.de/" };
            var azureEndpoints = new string[] { "https://management.azure.com/", "https://management.usgovcloudapi.net/", "https://management.chinacloudapi.cn/", "https://management.microsoftazure.de/" };
            var portalEndpoints = new string[] { "portal.azure.com", "portal.azure.us", "portal.azure.cn", "portal.microsoftazure.de" };

            var whatToGet = WhatToGet.Split(",");

            for (int i = 0; i < 4; i++) {
                Console.WriteLine("Processing " + clouds[i] + "...");

                Console.WriteLine("Getting cloud config...");
                var secretName = string.Format("parityApp{0}", clouds[i]);
                var cloudConfig = keyVaultClient.GetSecretAsync(vaultBaseUrl, secretName).Result.Value;
                
                var cloudConfigJson = JObject.Parse(cloudConfig);
                string subscriptionId = cloudConfigJson["SubscriptionId"].Value<string>();
                string tenantId = cloudConfigJson["TenantId"].Value<string>();
                var authority = String.Format("{0}{1}", aadEndpoints[i], tenantId);
                string clientId = cloudConfigJson["ClientId"].Value<string>();
                string clientSecret = cloudConfigJson["ClientSecret"].Value<string>();
                var armResource = azureEndpoints[i];

                Console.WriteLine("Getting ARM access token...");
                var accessToken = GetAccessToken(authority, armResource, clientId, clientSecret).Result;
                Console.WriteLine(accessToken);
                var armHttpClient = GetHttpClient(accessToken);

                if (Array.Exists(whatToGet, x => x == "rps")) {
                    Console.WriteLine("Getting resource providers...");
                    var resourceProvider = GetResourceProviders(armHttpClient, armResource).Result;
                    //Console.WriteLine(resourceProvider);
                    WriteToFile("resourceProvider_" + clouds[i] + ".json", resourceProvider);
                }

                if (Array.Exists(whatToGet, x => x == "policies")) {
                    Console.WriteLine("Getting policies...");
                    var policies = GetPolicies(armHttpClient, armResource, subscriptionId).Result;
                    //Console.WriteLine(policies);
                    WriteToFile("policy_" + clouds[i] + ".json", policies);
                }

                if (Array.Exists(whatToGet, x => x == "roles")) {
                    Console.WriteLine("Getting roles...");
                    var roles = GetRoles(armHttpClient, armResource, subscriptionId).Result;
                    //Console.WriteLine(roles);
                    WriteToFile("role_" + clouds[i] + ".json", roles);
                }

                if (Array.Exists(whatToGet, x => x == "health")) {
                    Console.WriteLine("Getting health...");
                    var health = GetHealth(armHttpClient, armResource, subscriptionId).Result;
                    //Console.WriteLine(health);
                    WriteToFile("health_" + clouds[i] + ".json", health);
                }

                if (Array.Exists(whatToGet, x => x == "monitor")) {
                    Console.WriteLine("Getting monitor...");
                    var monitor = GetMonitor(armHttpClient, armResource, subscriptionId).Result;
                    //Console.WriteLine(monitor);
                    WriteToFile("monitor_" + clouds[i] + ".json", monitor);
                }

                if (Array.Exists(whatToGet, x => x == "vmextensions")) {
                    Console.WriteLine("Getting VM extensions...");
                    var vmExtensions = GetVmExtensions(armHttpClient, armResource, subscriptionId).Result;
                    //Console.WriteLine(vmExtensions);
                    WriteToFile("vmExtension_" + clouds[i] + ".json", vmExtensions); 
                }  

                var portalHttpClient = GetHttpClient();

                if (Array.Exists(whatToGet, x => x == "portalextensions")) {
                    Console.WriteLine("Getting portal extensions...");
                    var portalExtensions = GetPortalExtensions(portalHttpClient, portalEndpoints[i]).Result;
                    //Console.WriteLine(portalExtensions);
                    WriteToFile("portalExtension_" + clouds[i] + ".json", portalExtensions);
                }

                Console.WriteLine("Done!");
            }
        }

        public static async Task<string> GetAccessToken(string authority, string resource, string clientId, string clientSecret) {
            var credentials = new ClientCredential(clientId, clientSecret);

            var context = new AuthenticationContext(authority, false);
            var token = await context.AcquireTokenAsync(resource, credentials);
            
            return token.AccessToken;
        }

        public static HttpClient GetHttpClient(string accessToken = "") {
            var httpClient = new HttpClient();
            if (!string.IsNullOrEmpty(accessToken)) httpClient.DefaultRequestHeaders.Add("Authorization", "Bearer " + accessToken);
            return httpClient;
        }

        public static void WriteToFile(string fileName, string contents) {
            var filePath = String.Format("bin/output/{0}", fileName);
            File.WriteAllText(filePath, contents);
        }

        public static async Task<string> GetResourceProviders(HttpClient httpClient, string azureEndpoint) {
            var resourceProviderApiVersion = "2017-08-01";
            var resourceProviderEndpoint = 
                String.Format("{0}providers?api-version={1}", azureEndpoint, resourceProviderApiVersion);
            if (Debug) Console.WriteLine("ResourceProviderEndpoint: " + resourceProviderEndpoint);
            return await httpClient.GetStringAsync(resourceProviderEndpoint);
        }

        public static async Task<string> GetPolicies(HttpClient httpClient, string azureEndpoint, string subscriptionId) {
            var policyApiVersion = "2018-03-01";
            var policyEndpoint = 
                String.Format("{0}subscriptions/{1}/providers/Microsoft.Authorization/policyDefinitions?api-version={2}", 
                    azureEndpoint, subscriptionId, policyApiVersion);
            if (Debug) Console.WriteLine("PolicyEndpoint: " + policyEndpoint);
            return await httpClient.GetStringAsync(policyEndpoint);
        }

        public static async Task<string> GetRoles(HttpClient httpClient, string azureEndpoint, string subscriptionId) {
            var roleApiVersion = "2017-05-01";
            var roleEndpoint = 
                String.Format("{0}subscriptions/{1}/providers/Microsoft.Authorization/roleDefinitions?api-version={2}", 
                    azureEndpoint, subscriptionId, roleApiVersion);
            if (Debug) Console.WriteLine("RoleEndpoint: " + roleEndpoint);
            return await httpClient.GetStringAsync(roleEndpoint);
        }

        public static async Task<string> GetHealth(HttpClient httpClient, string azureEndpoint, string subscriptionId) {
            var healthApiVersion = "2017-05-01";
            var healthEndpoint = 
                String.Format("{0}subscriptions/{1}/providers/Microsoft.ResourceHealth?$expand=metadata&api-version={2}", 
                    azureEndpoint, subscriptionId, healthApiVersion);
            if (Debug) Console.WriteLine("HealthEndpoint: " + healthEndpoint);
            return await httpClient.GetStringAsync(healthEndpoint);
        }

        public static async Task<string> GetMonitor(HttpClient httpClient, string azureEndpoint, string subscriptionId) {
            var resourceProviderApiVersion = "2017-05-01";
            var resourceProviderEndpointFmt = 
                "{0}providers";

            var operationsEndpointFmt = 
                "{0}providers/{1}/operations";

            var resourceProviderEndpoint = String.Format(resourceProviderEndpointFmt, azureEndpoint);
            if (Debug) Console.WriteLine("ResourceProviderEndpoint: " + resourceProviderEndpoint);
            var resourceProviders =  JObject.Parse(await httpClient.GetStringAsync(resourceProviderEndpoint + "?api-version=" + resourceProviderApiVersion))["value"];

            var monitor = new JArray();

            foreach(var resourceProviderJson in resourceProviders) {
                var resourceProvider = resourceProviderJson["namespace"].Value<string>();
                
                if (!resourceProvider.StartsWith("Microsoft", StringComparison.OrdinalIgnoreCase)) 
                    continue;
                
                var operations = new JObject();

                try {
                    var operationsApiVersion = resourceProviderJson.SelectToken("$.resourceTypes[?(@.resourceType == 'operations')].apiVersions[0]");
                    
                    if (operationsApiVersion != null) {
                        var operationsEndpoint = String.Format(operationsEndpointFmt, azureEndpoint, resourceProvider);
                        if (Debug) Console.WriteLine("OperationsEndpoint: " + operationsEndpoint + "?api-version=" + operationsApiVersion);
                        operations = JObject.Parse(await httpClient.GetStringAsync(operationsEndpoint + "?api-version=" + operationsApiVersion));
                    } else {
                        Console.WriteLine("WARN: No operations API. ResourceProvider=" +resourceProvider);
                    }
                } catch (Exception ex) {
                    // TODO: Narrow the scope of the try/catch and exception. Investigate why this errors out.
                    // Some publishers error out when getting their extension types
                    // for example Microsoft.Azure.NetworkWatcher.Edp
                    Console.WriteLine("WARN: Exception occurred. " + ex.Message);
                }

                foreach(var resourceTypeJson in resourceProviderJson["resourceTypes"]) {
                    var resourceType = resourceTypeJson["resourceType"].Value<string>();

                    var metricsJson = new JObject();
                    metricsJson["namespace"] = resourceProvider;
                    metricsJson["resourceType"] = resourceType;

                    var metricsOperations = new JArray();
                    if (operations["value"] != null) {
                        var tmp = operations["value"].Children().Where(o => 
                            o["name"] != null 
                            && o["name"].Value<string>().Contains("Microsoft.Insights", StringComparison.OrdinalIgnoreCase)
                            && o["name"].Value<string>().Contains(resourceProvider + "/" + resourceType + "/", StringComparison.OrdinalIgnoreCase));
                            
                        //Console.WriteLine(String.Format("Found {0} for {1}: ", tmp.Count(), resourceType));
                        if (tmp.Any()) {
                            metricsOperations.Add(tmp);
                        }
                    }
                    else {
                        metricsOperations = new JArray();
                    }

                    if (metricsOperations.Any()) {
                        metricsJson["metricsOperations"] = metricsOperations;
                        monitor.Add(metricsJson);
                    }
                }
            }

            return monitor.ToString();
        }

        public static async Task<string> GetVmExtensions(HttpClient httpClient, string azureEndpoint, string subscriptionId) {
            var apiVersion = "2017-12-01";
            var locationsEndpointFmt = 
                "{0}subscriptions/{1}/locations";
            var publishersEndpointFmt = 
                "{0}subscriptions/{1}/providers/Microsoft.Compute/locations/{2}/publishers";
            var typesEndpointFmt = 
                "{0}/{1}/artifacttypes/vmextension/types";
            var versionsEndpointFmt =
                "{0}/{1}/versions";

            var locationsEndpoint = String.Format(locationsEndpointFmt, azureEndpoint, subscriptionId);
            if (Debug) Console.WriteLine("LocationsEndpoint: " + locationsEndpoint);
            var locations =  JObject.Parse(await httpClient.GetStringAsync(locationsEndpoint + "?api-version=" + apiVersion))["value"];

            var publishersEndpoint = String.Format(publishersEndpointFmt, azureEndpoint, subscriptionId, locations[0]["name"]);
            if (Debug) Console.WriteLine("PublishersEndpoint: " + publishersEndpoint);
            var publishers = JArray.Parse(await httpClient.GetStringAsync(publishersEndpoint + "?api-version=" + apiVersion));

            var vmExtensions = new JArray();

            foreach(var publisher in publishers) {
                try {
                    var typesEndpoint = String.Format(typesEndpointFmt, publishersEndpoint, publisher["name"]);
                    if (Debug) Console.WriteLine("TypesEndpoint: " + typesEndpoint);
                    var types = JArray.Parse(await httpClient.GetStringAsync(typesEndpoint + "?api-version=" + apiVersion));

                    foreach(var type in types) {
                        var versionsEndpoint = String.Format(versionsEndpointFmt, typesEndpoint, type["name"]);
                        if (Debug) Console.WriteLine("VersionsEndpoint: " + versionsEndpoint);
                        var versions = JArray.Parse(await httpClient.GetStringAsync(versionsEndpoint + "?api-version=" + apiVersion));

                        foreach (var version in versions) {
                            var vmExtension = new JObject();
                            vmExtension["PublisherName"] = publisher["name"];
                            vmExtension["TypeName"] = type["name"];
                            vmExtension["Version"] = version["name"];
                            vmExtensions.Add(vmExtension);
                        }
                    }
                } catch (Exception) {
                    // TODO: Narrow the scope of the try/catch and exception. Investigate why this errors out.
                    // Some publishers error out when getting their extension types
                    // for example Microsoft.Azure.NetworkWatcher.Edp
                    Console.Write("WARN: Exception occurred");
                }
            }

            var wrapper = new JObject();
            wrapper["value"] = vmExtensions;
            return wrapper.ToString();
        }

        public static async Task<string> GetPortalExtensions(HttpClient httpClient, string portalEndpoint) {
            var diagnosticsEndpoint = String.Format("https://{0}/api/diagnostics", portalEndpoint);
            if (Debug) Console.WriteLine("DiagnosticsEndpoint: " + diagnosticsEndpoint);
            var diagnosticsRaw = await httpClient.GetStringAsync(diagnosticsEndpoint);

            var diagnosticsClean = diagnosticsRaw.Replace("<pre>","").Replace("</pre>","");
            var diagnostics = JObject.Parse(diagnosticsClean);

            var extensions = new JArray();

            foreach (var extension in diagnostics["shellEnvironment"]["extensionsMetadata"]) {
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
                    extensionInfo = await httpClient.GetStringAsync(extensionEndpoint);
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
                extensions.Add(extensionObject);
                //File.WriteAllText(String.Format("bin/output/ext/{0}", extensionName), extensionInfo);
            }
            
            //File.WriteAllText(String.Format("bin/output/{0}", portalEndpoint), diagnosticsClean);
            var wrapper = new JObject();
            wrapper["value"] = extensions;
            return wrapper.ToString();
        }
    }
}
