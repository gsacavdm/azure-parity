# Azure Sovereign Cloud Parity Analyzer
This repository consists of several tools used to identify gaps between Azure public and the different sovereigns (Azure Government, Azure China, Azure Germany).

## Scope
| Type | Source | Data Collection | Post-Processing |
|------|--------|-----------------|-----------------|
| ARM Resource Providers | Azure Resource Manager API | collect-rps | process-rps |
| ARM Resource Types | Azure Resource Manager API | collect-rps | process-rps |
| ARM API Versions | Azure Resource Manager API | collect-rps | process-rps |
| Role Definitions | Azure Resource Manager API | collect-roles | process-roles |
| Policy Definitions | Azure Resource Manager API | collect-policies | process-policies |
| Azure Health Support | Azure Resource Manager API | collect-health | process-health |
| Portal Extensions | Azure Portal | collect-portalextensions | process-portalextensions |
| Portal Extension Feature Flags | Azure Portal | collect-portalextensions | process-portalextensions |

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

1. Setup your Mongo DB. You can use [Cosmos DB with MongoDB API](https://docs.microsoft.com/azure/cosmos-db/mongodb-introduction).

1. Setup your secrets:

    ```bash
    cp k8/keyvault.yaml k8/keyvault.ignore.yaml
    cp k8/mongo.yaml k8/mongo.ignore.yaml

    # Update the values in these *.ignore.yaml
    # Remember that you need to base64 encode the secrets
    # use "echo your-secret-value | base64" to obtain the encoded value
    ```

1. Deploy your secrets to Kubernetes:

    ```bash
    # Deploy your secrets
    kubectl apply -f k8/keyvault.ignore.yaml
    kubectl apply -f k8/mongo.ignore.yaml
    ```

1. Build all the containers

    ```bash
    # Check out the Makefile to see what 'make' does.
    # It's doing a docker build an docker push of each of the containers
    make
    ```

1. Deploy all pods to Kubernetes
    ```bash
    # Check out the Makefile to see what 'make deploy' does.
    # It delets all existing pods and redeploys them.
    make deploy
    ```

## TO-DO
* Spit out all tables for report:
    * Summary table:
        * db.resourceProviderMissingFeature.findOne()
    * ARM breakout table:
        * db.resourceProviderMissingResourceType.findOne()
        * db.resourceProviderMissingRole.findOne()
        * db.resourceProviderMissingHealth.findOne()
        * db.resourceProviderMissingPolicy.findOne()
    * Portal Extension breakout table:
        * db.portalExtensionMissingExtensionFeature.findOne()
    * Total missing features table:
        * db.featureMissing.findOne()
        * db.portalExtensionFeatureMissing.findOne()
* Pull *older than* from environment variable
* Do a proper redeploy - update container versions + Kubernetes rollout
* Move *DockerFile*s to a separate directory
* Add option to not docker push in Makefile
* Figure out better storage strategy (Mongo DB per day sucks!)
* Use Azure storage persistent volumes for collection