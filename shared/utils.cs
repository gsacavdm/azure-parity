using System;
using System.IO;
using System.Net.Http;
using System.Threading.Tasks;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity
{
    public static class utils
    {
        public static string GetEnvironmentVariableOrFail(string name){
            var value = Environment.GetEnvironmentVariable(name);
            if (String.IsNullOrEmpty(value)){
                throw new ArgumentException(String.Format("Environment Variable variable {0} has not been set.", name));
            }
            return value;
        }

        static int CycleTime = 24 * 60 * 60 * 1000; // 24 hours

        public delegate string Collector(string subscriptionId, string endpoint, HttpClient httpClient);

        public static void Collect(string sourceName, bool useArm, Collector CollectDetails)
        {
            while (true) {
                string configDirPath = GetEnvironmentVariableOrFail("CONFIG_DIR_PATH");
                string dataDirPath = GetEnvironmentVariableOrFail("DATA_DIR_PATH");
                var files = Directory.GetFiles(configDirPath);

                foreach (var file in files) {
                    Console.WriteLine("Processing " + file + "...");
                    string cloudConfig = File.ReadAllText(file);

                    Console.WriteLine("Getting cloud config...");
                    JObject cloudConfigJson = JObject.Parse(cloudConfig);
                    string cloudName = cloudConfigJson["CloudName"].Value<string>();
                    string subscriptionId = cloudConfigJson["SubscriptionId"].Value<string>();
                    string accessToken = cloudConfigJson["AccessToken"].Value<string>();
                    string azureEndpoint = cloudConfigJson["AzureEndpoint"].Value<string>();
                    string portalEndpoint = cloudConfigJson["PortalEndpoint"].Value<string>();

                    Console.WriteLine("Getting {0}...", sourceName);

                    string data = "{}";
                    try {
                        using (var httpClient = new HttpClient()) {
                            string endpoint = portalEndpoint;
                            if (useArm) {
                                httpClient.DefaultRequestHeaders.Add("Authorization", "Bearer " + accessToken);
                                endpoint = azureEndpoint;
                            }
                            data = CollectDetails(subscriptionId, endpoint, httpClient);
                        }
                    } catch (Exception ex) {
                        Console.WriteLine("WARN: Exception occurred. CloudName={0} SourceName={1} ExceptionMessage={2}", 
                            cloudName, sourceName, ex.Message);
                    }
                    //Console.WriteLine(data);
                    
                    var dataPath = String.Format("{0}/{1}_{2}.json", dataDirPath, sourceName, cloudName);
                    Console.WriteLine(String.Format("Saving {0}", dataPath));
                    File.WriteAllText(dataPath, data);
                }
            
                Console.WriteLine("Done!");
                Task.Delay(CycleTime).Wait();
            }
        }
    }
}
