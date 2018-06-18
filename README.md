# Azure Sovereign Cloud Parity Analyzer
This repository consists of several tools used to identify gaps between Azure public and the different sovereigns (Azure Government, Azure China, Azure Germany).

## Scope
| Type | Source | Data Collection | Post-Processing |
|------|--------|-----------------|-----------------|
| ARM Resource Providers | Azure Resource Manager API | collect-rps | TBD |
| ARM Resource Types | Azure Resource Manager API | collect-rps | TBD |
| ARM API Versions | Azure Resource Manager API | collect-rps | TBD |
| Role Definitions | Azure Resource Manager API | TBD | TBD |
| Policy Definitions | Azure Resource Manager API | TBD | TBD |
| Azure Health Support | Azure Resource Manager API | TBD | TBD |
| Portal Extensions | Azure Portal | TBD | TBD |
| Portal Extension Feature Flags | Azure Portal | TBD | TBD |

## Running This Tool
Everything is done through containers.

* Data is collected by a containerized dotnet core program. 
* Data is uploaded by a containerized bash script.
* Data is post-processed by a containerized nodeJs program.
* Secrets are obtained by Key Vault by containerized dotnet core program.

This repo requires that you have a Key Vault which has Azure AD SP credentials to access all clouds (public and the sovereigns). It is assumed that you have a user account in each cloud to execute some of these setup steps.

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
    az login

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

1. Setup your secrets:

    ```bash
    cp k8/keyvault.yaml k8/keyvault.ignore.yaml

    # Update the values in keyvault.ignore.yaml
    ```

1. Deploy to Kubernetes:

    ```bash
    # Deploy your Key Vault secrets
    kubectl apply -f k8/keyvault.ignore.yaml

    # Deploy the pod that will collect resource provider data
    kubectl apply -f k8/rps.yaml
    
    ```
