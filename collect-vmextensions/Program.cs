using System;
using System.IO;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace azure_parity.collect_vmextensions
{
    class Program
    {
        static bool Debug = true;

        static void Main(string[] args)
        {
            utils.Collect("vmExtension", true, (subscriptionId, azureEndpoint, httpClient) => {
                var apiVersion = "2017-12-01";
                var locationsEndpointFmt = 
                    "{0}subscriptions/{1}/locations";
                var publishersEndpointFmt = 
                    "{0}subscriptions/{1}/providers/Microsoft.Compute/locations/{2}/publishers";
                var typesEndpointFmt = 
                    "{0}/{1}/artifacttypes/vmextension/types";
                var versionsEndpointFmt =
                    "{0}/{1}/versions";
    
                var vmExtensions = new JArray();
                var locationsEndpoint = String.Format(locationsEndpointFmt, azureEndpoint, subscriptionId);
                if (Debug) utils.Log("LocationsEndpoint: " + locationsEndpoint);
                var locationsResult = httpClient.GetStringAsync(locationsEndpoint + "?api-version=" + apiVersion).Result;
                var locations =  JObject.Parse(locationsResult)["value"];

                var publishersEndpoint = String.Format(publishersEndpointFmt, azureEndpoint, subscriptionId, locations[0]["name"]);
                if (Debug) utils.Log("PublishersEndpoint: " + publishersEndpoint);
                var publishersResult = httpClient.GetStringAsync(publishersEndpoint + "?api-version=" + apiVersion).Result;
                var publishers = JArray.Parse(publishersResult);

                foreach(var publisher in publishers) {
                    try {
                        var typesEndpoint = String.Format(typesEndpointFmt, publishersEndpoint, publisher["name"]);
                        if (Debug) utils.Log("TypesEndpoint: " + typesEndpoint);
                        var typesResult = httpClient.GetStringAsync(typesEndpoint + "?api-version=" + apiVersion).Result;
                        var types = JArray.Parse(typesResult);

                        foreach(var type in types) {
                            var versionsEndpoint = String.Format(versionsEndpointFmt, typesEndpoint, type["name"]);
                            if (Debug) utils.Log("VersionsEndpoint: " + versionsEndpoint);
                            var versionsResult = httpClient.GetStringAsync(versionsEndpoint + "?api-version=" + apiVersion).Result;
                            var versions = JArray.Parse(versionsResult);

                            foreach (var version in versions) {
                                var vmExtension = new JObject();
                                vmExtension["PublisherName"] = publisher["name"];
                                vmExtension["TypeName"] = type["name"];
                                vmExtension["Version"] = version["name"];
                                vmExtensions.Add(vmExtension);
                            }
                        }
                    } catch (Exception ex) {
                        // TODO: Narrow the scope of the try/catch and exception. Investigate why this errors out.
                        // Some publishers error out when getting their extension types
                        // for example Microsoft.Azure.NetworkWatcher.Edp
                        utils.Log("WARN: Exception occurred. Endpoint={0} ExceptionMessage={1}", 
                            azureEndpoint, ex.Message);
                    }
                }                   
                //utils.Log(vmExtensions);

                var wrapper = new JObject();
                wrapper["value"] = vmExtensions;
                return wrapper.ToString();
            });
        }
    }
}
