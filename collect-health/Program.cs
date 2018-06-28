using System;
using System.IO;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity.collect_health
{
    class Program
    {
        static bool Debug = true;

        static void Main(string[] args)
        {
            utils.Collect("health", true, (subscriptionId, azureEndpoint, httpClient) => {
                string healthApiVersion = "2017-05-01";
                string healthEndpoint = 
                    String.Format("{0}subscriptions/{1}/providers/Microsoft.ResourceHealth?$expand=metadata&api-version={2}", 
                        azureEndpoint, subscriptionId, healthApiVersion);
                if (Debug) utils.Log("HealthEndpoint: " + healthEndpoint);
                return httpClient.GetStringAsync(healthEndpoint).Result;
            });
        }
    }
}
