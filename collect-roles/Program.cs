using System;
using System.IO;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity.collect_roles
{
    class Program
    {
        static bool Debug = true;
        
        static void Main(string[] args)
        {
            utils.Collect("role", true, (subscriptionId, azureEndpoint, httpClient) => {
                var roleApiVersion = "2017-05-01";
                var roleEndpoint = 
                    String.Format("{0}subscriptions/{1}/providers/Microsoft.Authorization/roleDefinitions?api-version={2}", 
                        azureEndpoint, subscriptionId, roleApiVersion);
                if (Debug) utils.Log("Collect Role. RoleEndpoint={0}", roleEndpoint);
                return httpClient.GetStringAsync(roleEndpoint).Result;
            });
        }
    }
}
