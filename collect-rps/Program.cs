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

        static void Main(string[] args)
        {
            utils.Collect("resourceProvider", true, (subscriptionId, azureEndpoint, httpClient) => {
                string resourceProviderApiVersion = "2017-08-01";
                string resourceProviderEndpoint = 
                    String.Format("{0}providers?api-version={1}", azureEndpoint, resourceProviderApiVersion);
                if (Debug) utils.Log("ResourceProviderEndpoint: " + resourceProviderEndpoint);
                return httpClient.GetStringAsync(resourceProviderEndpoint).Result;
            });
        }
    }
}
