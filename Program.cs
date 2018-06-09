using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

using Microsoft.Azure.KeyVault;
using Microsoft.IdentityModel.Clients.ActiveDirectory;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity
{
    class Program
    {
        static bool Debug = true;
        static string WhatToGet = "rps,policies,roles,vmextensions,portalextensions";

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
            var portalEndpoints = new string[] { "https://portal.azure.com/", "https://portal.azure.us/", "https://portal.azure.cn/", "https://portal.microsoftazure.de/" };

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
                //Console.WriteLine(accessToken);
                var armHttpClient = GetHttpClient(accessToken);

                if (Array.Exists(whatToGet, x => x == "rps")) {
                    Console.WriteLine("Getting resource providers...");
                    var resourceProvider = GetResourceProviders(armHttpClient, armResource).Result;
                    //Console.WriteLine(resourceProvider);
                    WriteToFile("resourceProvider-" + clouds[i] + ".json", resourceProvider);
                }

                if (Array.Exists(whatToGet, x => x == "policies")) {
                    Console.WriteLine("Getting policies...");
                    var policies = GetPolicies(armHttpClient, armResource, subscriptionId).Result;
                    //Console.WriteLine(policies);
                    WriteToFile("policies-" + clouds[i] + ".json", policies);
                }

                if (Array.Exists(whatToGet, x => x == "roles")) {
                    Console.WriteLine("Getting roles...");
                    var roles = GetRoles(armHttpClient, armResource, subscriptionId).Result;
                    //Console.WriteLine(roles);
                    WriteToFile("roles-" + clouds[i] + ".json", roles);
                }

                if (Array.Exists(whatToGet, x => x == "vmextensions")) {
                    Console.WriteLine("Getting VM extensions...");
                    var vmExtensions = GetVmExtensions(armHttpClient, armResource, subscriptionId).Result;
                    //Console.WriteLine(vmExtensions);
                    WriteToFile("vmextensions-" + clouds[i] + ".json", vmExtensions); 
                }  

                var portalHttpClient = GetHttpClient();

                if (Array.Exists(whatToGet, x => x == "portalextensions")) {
                    Console.WriteLine("Getting portal extensions...");
                    var portalExtensions = GetPortalExtensions(portalHttpClient, portalEndpoints[i]).Result;
                    //Console.WriteLine(portalExtensions);
                    WriteToFile("portalextensions-" + clouds[i] + ".json", portalExtensions);
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

            return vmExtensions.ToString();
        }

        public static async Task<string> GetPortalExtensions(HttpClient httpClient, string portalEndpoint) {
            var diagnosticsEndpoint = String.Format("{0}api/diagnostics", portalEndpoint);
            if (Debug) Console.WriteLine("DiagnosticsEndpoint: " + diagnosticsEndpoint);
            var payload = await httpClient.GetStringAsync(diagnosticsEndpoint);

            var payloadClean = payload.Replace("<pre>","").Replace("</pre>","");
            return payloadClean;
        }
    }
}
