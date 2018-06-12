# Azure Sovereign Cloud Parity Analyzer
This repository consists of several tools used to identify gaps between Azure public and the different sovereigns (Azure Government, Azure China, Azure Germany).

## Scope
| Type | Source | Data Collection | Post-Processing |
|------|--------|-----------------|-----------------|
| ARM Resource Providers | Azure Resource Manager API | Program.cs | mongodb/resourceProvider.js |
| ARM Resource Types | Azure Resource Manager API | Program.cs | mongodb/resourceProvider.js |
| ARM API Versions | Azure Resource Manager API | Program.cs | TBD |
| Role Definitions | Azure Resource Manager API | Program.cs | mongodb/role.js |
| Policy Definitions | Azure Resource Manager API | Program.cs | mongodb/policy.js |
| Azure Health Support | Azure Resource Manager API | Program.cs | mongodb/health.js |
| Portal Extensions | Azure Portal | Program.cs | mongodb/portalExtensions.js |
| Portal Extension Feature Flags | Azure Portal | Program.cs | mongodb/portalExtensions.js |

## Data Collector
Data is collected by a dotnet core program. 

It requires that you have a Key Vault which has Azure AD SP credentials to access all clouds (public and the sovereigns). It is assumed that you have an account in each cloud.

1. Clone the repo and cd into it:

    ```bash
    git clone https://github.com/gsacavdm/azure-parity
    cd azure-parity
    ```

1. Generate the temp config files that will be stored in Key Vault:

    ```bash
    cp ParityWw.json ParityWw.ignore.json
    cp ParityWw.json ParityFf.ignore.json
    cp ParityWw.json ParityMc.ignore.json
    cp ParityWw.json ParityBf.ignore.json
    ```
    
1. Create the Azure AD SP. Run this command once for each of your accounts in the different clouds:

    ```bash
    az cloud set -n <EnvironmentName>

    #TODO: Add the right parameters to the command
    az ad sp create-for-rbac

    # Store the values produced by this command in the appropriate ParityXx.ignore.json file
    ```

1. Create a Key Vault and store the cloud configs in it. You can do this in any cloud in any subscription.

    ```bash
    az keyvault create -n <YOUR-VAULT> -g <YOUR-GROUP>
    az keyvault secret set --vault-name <YOUR-VAULT> -n ParityWw -f ParityWw.ignore.json
    # Store the Key Vault URL, you'll need it later
    ```

1. Create an Azure AD SP for the data collector to talk to the Key Vault:

    ```bash
    #TODO: Add the right parameters to the command
    az ad sp create-for-rbac
    # Store the values produced by this command, you'll need them later.

    #TODO: az keyvault command to grant the Azure AD SP permissions to the key vault
    ```

1. Setup your environment variables:

    ```bash
    cp secrets.sh secrets.ignore.sh

    # Update the values in secrets.ignore.sh

    source secrets.sh
    ```

1. Run the data collector:

    ```bash
    dotnet restore
    dotnet run
    ```

## Post-Processing
The data collector will produce a bunch of json files in `bin\output`.
These need to be further massaged in MongoDB.

1. Load these files into MongoDB using the mongoimport tool:

    ```bash
    mongoimport --host <hostname> -u <username> -p <password> --ssl --sslAllowInvalidCertificates -d azure-parity -c <collectionName> --file <fileName>-<cloudShortName>.json
    ```
    
    For example:
    
    ```bash
    mongoimport --host azureparity.documents.azure.us:10255 -u azureparityadmin -p X --ssl --sslAllowInvalidCertificates -d azure-parity -c health --file health-Ww.json
    ```

    * For MongoDB via Azure Cosmos DB, you can obtain the connection string information via **Quick start** > **MongoDB Shell** > **"Connect using MongoDB Shell"**.

    * The collection name should be based on the file name as follows:
    
        |File name|Collection Name|
        |------|------|
        |resourceProvider-Xx.json|-c resourceProvider|
        |health-Xx.json|-c health|
        |roles-Xx.json|-c role|
        |policies-Xx.json|-c policy|
        |portalextensions-Xx.json|-c portal**E**xtension|
            
    * Files need to be loaded in the following order: Ww, Ff, Mc, Bf. Note that all the files for a given type, irrespective of the cloud, are loaded into the same collection.
    * When importing **portalextensions**, add ```--jsonArray ``` at end of import command. 

1. In MongoDB, run everything in the mongodb directory.

    ```bash
    mongo <host> -u <username> -p <password> --ssl --sslAllowInvalidCertificates
    ```

    And from within that bash instance, copy and paste (manually) the contents of the mongodb/\*.js files **starting with resourceProvider.js**.

 1. If you want to do offline analysis in Excel, you can export the data using mongoexport:

    ```bash
    mongoexport --host <hostname> -u <username> -p <password> --ssl --sslAllowInvalidCertificates -d azure-parity -c portalExtensionFeatureMissingByNamespace --type=csv -f "name,missingInFairfax,missingInMooncake,missingInBlackforest" -o portalExtensionFeatureMissingByNamespace.csv
    ```
