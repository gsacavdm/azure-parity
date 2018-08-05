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
        //static int SleepDurationMiliseconds = 10 * 1000; // 10 seconds
        static int SleepDurationMiliseconds = 10 * 60 * 1000; // 10 minutes
        static int ConfigFreshnessHours = 24;

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

                var lastDownloadedFilePath = "lastDownloaded.json";
                var lastDownloaded = new JObject();
                if (File.Exists(lastDownloadedFilePath)) {
                    lastDownloaded = JObject.Parse(File.ReadAllText(lastDownloadedFilePath));
                }

                for (int i = 0; i < cloudNames.Length; i++) {
                    var cloudName = cloudNames[i];
                    var armResource = azureEndpoints[i];
                    utils.Log("Process Cloud. CloudName=" + cloudName);

                    var configFile = String.Format("{0}.json", cloudName);                    
                    var configPath = String.Format("{0}/{1}.json", configDirPath, configFile);
                    if (File.Exists(configPath) && lastDownloaded[configFile] != null) {
                        var createdTime = lastDownloaded[configFile].Value<DateTime>();
                        var createdHoursAgo = (DateTime.UtcNow - createdTime).TotalHours;
                        if (createdHoursAgo < ConfigFreshnessHours) {
                            utils.Log("Skip Processing. CloudName={0} CreatedHoursAgo={1}", cloudName, createdHoursAgo);
                            continue;
                        }
                    }

                    utils.Log("Download CloudConfig. CloudName={0}", cloudName);
                    var secretName = string.Format("parityApp{0}", cloudName);

                    var cloudConfig = keyVaultClient.GetSecretAsync(vaultBaseUrl, secretName).Result.Value;
                    
                    var cloudConfigJson = JObject.Parse(cloudConfig);
                    cloudConfigJson["CloudName"] = cloudName;
                    cloudConfigJson["AzureEndpoint"] = armResource;
                    cloudConfigJson["PortalEndpoint"] = portalEndpoints[i];

                    utils.Log("Get ARM access token. CloudName={0}", cloudName);
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

                    utils.Log(String.Format("Save CloudConfig. ConfigPath={0}", configPath));
                    File.WriteAllText(configPath, cloudConfigJson.ToString());

                    lastDownloaded[configFile] = DateTime.UtcNow.ToString();
                }
                
                File.WriteAllText(lastDownloadedFilePath, lastDownloaded.ToString());

                utils.Log("CloudConfig Download Complete.");
                utils.Log("Sleep. SleepDurationMiliseconds={0}", SleepDurationMiliseconds);
                Task.Delay(SleepDurationMiliseconds).Wait();
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
