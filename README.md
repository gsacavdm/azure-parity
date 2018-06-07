# Azure Sovereign Cloud Parity Analyzer
This repository consists of several tools used to identify gaps between Azure public and the different sovereigns (Azure Government, Azure China, Azure Germany).

## Scope
| Type | Source | Data Collection | Post-Processing |
|------|--------|-----------------|-----------------|
| ARM Resource Providers | Azure Resource Manager API | Program.cs | mongodb.js |
| ARM Resource Types | Azure Resource Manager API | Program.cs | mongodb.js |
| ARM API Versions | Azure Resource Manager API | Program.cs | TBD |
| Role Definitions | Azure Resource Manager API | Program.cs | TBD |
| Policy Definitions | Azure Resource Manager API | Program.cs | TBD |
| Portal Extensions | Azure Portal | Program.cs | mongodb.js |
| Portal Extension Feature Flags | Azure Portal | TBD | TBD |

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

1. Load these files into MongoDB using the mongoimport tool

    >NOTE: At this time only the resourceProvider-* files should be loaded.
    ><br>They need to be loaded in the following order: Ww, Ff, Mc, Bf

1. In MongoDB, run everything in the [mongodb.js file](mongodb.js)
