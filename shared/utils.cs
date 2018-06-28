﻿using System;
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

        public static void Log(string format, params object[] args){
            string date = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
            Console.WriteLine(date + ": " + format, args);
        }

        static int SleepDurationMiliseconds = 10 * 60 * 1000; // 10 minutes
        static int DataFreshnessHours = 24;

        public delegate string Collector(string subscriptionId, string endpoint, HttpClient httpClient);

        public static void Collect(string sourceName, bool useArm, Collector CollectDetails)
        {
            while (true) {
                string configDirPath = GetEnvironmentVariableOrFail("CONFIG_DIR_PATH");
                string dataDirPath = GetEnvironmentVariableOrFail("DATA_DIR_PATH");
                var files = Directory.GetFiles(configDirPath);

                var lastCollectedFilePath = String.Format("lastCollected_{0}.json", sourceName);
                var lastCollected = new JObject();
                if (File.Exists(lastCollectedFilePath)) {
                    lastCollected = JObject.Parse(File.ReadAllText(lastCollectedFilePath));
                }

                foreach (var file in files) {
                    utils.Log("Processing " + file + "...");

                    string cloudConfig = File.ReadAllText(file);

                    utils.Log("Getting cloud config...");
                    JObject cloudConfigJson = JObject.Parse(cloudConfig);
                    string cloudName = cloudConfigJson["CloudName"].Value<string>();
                    string subscriptionId = cloudConfigJson["SubscriptionId"].Value<string>();
                    string accessToken = cloudConfigJson["AccessToken"].Value<string>();
                    string azureEndpoint = cloudConfigJson["AzureEndpoint"].Value<string>();
                    string portalEndpoint = cloudConfigJson["PortalEndpoint"].Value<string>();

                    var dataFile = String.Format("{0}_{1}.json", sourceName, cloudName);                    
                    var dataPath = String.Format("{0}/{1}", dataDirPath, dataFile);                    
                    if (File.Exists(dataPath) && lastCollected[dataFile] != null) {
                        var createdTime = lastCollected[dataFile].Value<DateTime>();
                        var createdHoursAgo = (DateTime.UtcNow - createdTime).TotalHours;
                        if (createdHoursAgo < DataFreshnessHours) {
                            utils.Log("Skipping {0}. Collected {1} hours ago...", sourceName, createdHoursAgo);
                            continue;
                        }
                    }

                    utils.Log("Getting {0}...", sourceName);

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
                        utils.Log("WARN: Exception occurred. CloudName={0} SourceName={1} ExceptionMessage={2}", 
                            cloudName, sourceName, ex.Message);
                    }
                    //utils.Log(data);
                    
                    utils.Log(String.Format("Saving {0}", dataPath));
                    File.WriteAllText(dataPath, data);

                    lastCollected[dataFile] = DateTime.UtcNow.ToString();
                }
            
                File.WriteAllText(lastCollectedFilePath, lastCollected.ToString());

                utils.Log("Done!");
                Task.Delay(SleepDurationMiliseconds).Wait();
            }
        }
    }
}
