using System;
using System.IO;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity.collect_policies
{
    class Program
    {
        static bool Debug = true;

        static void Main(string[] args)
        {
            utils.Collect("policy", true, (subscriptionId, azureEndpoint, httpClient) => {
                var policyApiVersion = "2018-03-01";
                var policyEndpoint = 
                    String.Format("{0}subscriptions/{1}/providers/Microsoft.Authorization/policyDefinitions?api-version={2}", 
                        azureEndpoint, subscriptionId, policyApiVersion);
                if (Debug) utils.Log("PolicyEndpoint: " + policyEndpoint);
                return httpClient.GetStringAsync(policyEndpoint).Result;
            });
        }
    }
}
