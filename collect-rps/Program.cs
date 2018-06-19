using System;
using System.IO;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity.collect_rps
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
                    string azureEndpoint = cloudConfigJson["AzureEndpoint"].Value<string>();

                    Console.WriteLine("Getting resource providers...");
                    string resourceProviderApiVersion = "2017-08-01";
                    string resourceProviderEndpoint = 
                        String.Format("{0}providers?api-version={1}", azureEndpoint, resourceProviderApiVersion);
                    if (Debug) Console.WriteLine("ResourceProviderEndpoint: " + resourceProviderEndpoint);

                    string resourceProvider = "{}";
                    try {
                        using (var httpClient = new HttpClient()) {
                            httpClient.DefaultRequestHeaders.Add("Authorization", "Bearer " + accessToken);
                            resourceProvider = httpClient.GetStringAsync(resourceProviderEndpoint).Result;
                        }
                    } catch (Exception ex) {
                        Console.WriteLine("WARN: Exception occurred. CloudName={0} EndPoint={1} ExceptionMessage={2}", 
                            cloudName, resourceProviderEndpoint, ex.Message);
                    }
                    //Console.WriteLine(resourceProvider);
                    
                    var dataPath = String.Format("{0}/resourceProvider_{1}.json", dataDirPath, cloudName);
                    Console.WriteLine(String.Format("Saving {0}", dataPath));
                    File.WriteAllText(dataPath, resourceProvider);
                }
            
                Console.WriteLine("Done!");
                Task.Delay(CycleTime).Wait();
            }
        }
    }
}
