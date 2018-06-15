using System;
using System.IO;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Microsoft.Azure.KeyVault;
using Microsoft.IdentityModel.Clients.ActiveDirectory;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity.cloudcfg
{
    class Program
    {
        static int CycleTime = 1 * 60 * 60 * 1000; // 1 hour

        static void Main(string[] args)
        {
            while (true) {
                var mainClientId = utils.GetEnvironmentVariableOrFail("CLIENT_ID");
                var mainClientSecret = utils.GetEnvironmentVariableOrFail("CLIENT_SECRET"); 
                var vaultBaseUrl = utils.GetEnvironmentVariableOrFail("VAULT_BASE_URL");
                var configDirPath = utils.GetEnvironmentVariableOrFail("CONFIG_DIR_PATH");

                var keyVaultClient = new KeyVaultClient(
                    new KeyVaultClient.AuthenticationCallback(
                        (authority, resource, scope) => 
                            GetAccessToken(authority, resource, mainClientId, mainClientSecret)
                    ));

                var cloudNames = new string[] { "Ww", "Ff", "Mc", "Bf" };
                var aadEndpoints = new string[] { "https://login.microsoftonline.com/", "https://login.microsoftonline.us/", "https://login.chinacloudapi.cn/", "https://login.microsoftonline.de/" };
                var azureEndpoints = new string[] { "https://management.azure.com/", "https://management.usgovcloudapi.net/", "https://management.chinacloudapi.cn/", "https://management.microsoftazure.de/" };
                var portalEndpoints = new string[] { "portal.azure.com", "portal.azure.us", "portal.azure.cn", "portal.microsoftazure.de" };

                for (int i = 0; i < cloudNames.Length; i++) {
                    var cloudName = cloudNames[i];
                    var armResource = azureEndpoints[i];
                    Console.WriteLine("Processing " + cloudName + "...");

                    Console.WriteLine("Getting cloud config...");
                    var secretName = string.Format("parityApp{0}", cloudName);

                    var cloudConfig = keyVaultClient.GetSecretAsync(vaultBaseUrl, secretName).Result.Value;
                    
                    var cloudConfigJson = JObject.Parse(cloudConfig);
                    cloudConfigJson["CloudName"] = cloudName;
                    cloudConfigJson["AzureEndpoint"] = armResource;
                    cloudConfigJson["PortalEndpoint"] = portalEndpoints[i];

                    Console.WriteLine("Getting ARM access token...");
                    var tenantId = cloudConfigJson["TenantId"].Value<string>();
                    var clientId = cloudConfigJson["ClientId"].Value<string>();
                    var clientSecret = cloudConfigJson["ClientSecret"].Value<string>();
                    var authority = String.Format("{0}{1}", aadEndpoints[i], tenantId);

                    var accessToken = GetAccessToken(authority, armResource, clientId, clientSecret).Result;
                    cloudConfigJson["AccessToken"] = accessToken;

                    /*
                    // ======== REMOVE ME ==============
                    var cloudConfigJson = new JObject();
                    cloudConfigJson["CloudName"] = cloudName;
                    cloudConfigJson["SubscriptionId"] = "9e261e0b-3149-42c1-b63d-89c28a7d8512";
                    cloudConfigJson["AccessToken"] = "AccessTokenValue";
                    cloudConfigJson["AzureEndpoint"] = armResource;
                    // ======== REMOVE ME ==============
                    */

                    var configPath = String.Format("{0}/{1}.json", configDirPath, cloudName);
                    Console.WriteLine(String.Format("Saving {0}", configPath));
                    File.WriteAllText(configPath, cloudConfigJson.ToString());
                }
                
                Console.WriteLine("Done!");
                Task.Delay(CycleTime).Wait();
            }
        }

        public static async Task<string> GetAccessToken(string authority, string resource, string clientId, string clientSecret) {
            var credentials = new ClientCredential(clientId, clientSecret);

            var context = new AuthenticationContext(authority, false);
            var token = await context.AcquireTokenAsync(resource, credentials);
            
            return token.AccessToken;
        }
    }
}
