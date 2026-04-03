targetScope = 'resourceGroup'

@minLength(1)
@maxLength(64)
@description('Name of the environment that can be used as part of naming resource convention')
param environmentName string

@minLength(1)
@description('Primary location for all resources')
param location string

@description('Id of the user or app to assign application roles')
param principalId string = ''

// Container Apps Environment
var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = uniqueString(subscription().id, resourceGroup().id, location, environmentName)

// Tags
var tags = {
  'azd-env-name': environmentName
}

// User Assigned Managed Identity
module managedIdentity 'core/security/managed-identity.bicep' = {
  name: 'managed-identity'
  params: {
    name: 'id-${resourceToken}'
    location: location
    tags: tags
  }
}

// Log Analytics Workspace
module logAnalytics 'core/monitor/loganalytics.bicep' = {
  name: 'log-analytics'
  params: {
    name: '${abbrs.operationalInsightsWorkspaces}${resourceToken}'
    location: location
    tags: tags
  }
}

// Application Insights
module applicationInsights 'core/monitor/applicationinsights.bicep' = {
  name: 'application-insights'
  params: {
    name: '${abbrs.insightsComponents}${resourceToken}'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
  }
}

// Azure Container Registry
module containerRegistry 'core/host/container-registry.bicep' = {
  name: 'container-registry'
  params: {
    name: '${abbrs.containerRegistryRegistries}${resourceToken}'
    location: location
    tags: tags
  }
}

// ACR Pull Role Assignment for Managed Identity (MANDATORY before Container Apps)
module acrPullRoleAssignment 'core/security/role-assignment.bicep' = {
  name: 'acr-pull-role'
  params: {
    principalId: managedIdentity.outputs.principalId
    roleDefinitionId: '7f951dda-4ed3-4680-a7ca-43fe172d538d' // AcrPull role
    principalType: 'ServicePrincipal'
  }
  scope: resourceGroup()
}

// Storage Account for uploads
module storage 'core/storage/storage-account.bicep' = {
  name: 'storage'
  params: {
    name: '${abbrs.storageStorageAccounts}${resourceToken}'
    location: location
    tags: tags
    fileShareName: 'frameit-uploads'
    fileShareQuota: 10
  }
}

// Key Vault for secrets
module keyVault 'core/security/keyvault.bicep' = {
  name: 'key-vault'
  params: {
    name: '${abbrs.keyVaultVaults}${resourceToken}'
    location: location
    tags: tags
    principalId: principalId
  }
}

// Key Vault Secrets User role for Managed Identity
module keyVaultRoleAssignment 'core/security/role-assignment.bicep' = {
  name: 'keyvault-secrets-role'
  params: {
    principalId: managedIdentity.outputs.principalId
    roleDefinitionId: '4633458b-17de-408a-b874-0445c86b69e6' // Key Vault Secrets User
    principalType: 'ServicePrincipal'
  }
  scope: resourceGroup()
}

// Container Apps Environment
module containerAppsEnvironment 'core/host/container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  params: {
    name: '${abbrs.appManagedEnvironments}${resourceToken}'
    location: location
    tags: tags
    logAnalyticsWorkspaceId: logAnalytics.outputs.id
    logAnalyticsWorkspaceKey: logAnalytics.outputs.primarySharedKey
    storageAccountName: '${abbrs.storageStorageAccounts}${resourceToken}'
    storageAccountKey: listKeys(resourceId('Microsoft.Storage/storageAccounts', '${abbrs.storageStorageAccounts}${resourceToken}'), '2023-01-01').keys[0].value
    fileShareName: 'frameit-uploads'
  }
}

// Backend Container App (backoffice)
module backoffice 'core/host/container-app.bicep' = {
  name: 'backoffice'
  params: {
    name: '${abbrs.appContainerApps}backoffice-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'backoffice' })
    managedIdentityId: managedIdentity.outputs.id
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.id
    containerRegistryName: containerRegistry.outputs.name
    containerImage: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
    targetPort: 3001
    externalIngress: true
    environmentVariables: [
      {
        name: 'PORT'
        value: '3001'
      }
      {
        name: 'NODE_ENV'
        value: 'production'
      }
      {
        name: 'SESSION_SECRET'
        secretRef: 'session-secret'
      }
      {
        name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
        value: applicationInsights.outputs.connectionString
      }
    ]
    secrets: [
      {
        name: 'session-secret'
        keyVaultUrl: '${keyVault.outputs.endpoint}secrets/session-secret'
        identity: managedIdentity.outputs.id
      }
    ]
    volumeMounts: [
      {
        volumeName: 'uploads-storage'
        mountPath: '/app/uploads'
      }
    ]
    enableCors: true
    corsAllowedOrigins: ['*']
    cpu: '0.5'
    memory: '1Gi'
    minReplicas: 0
    maxReplicas: 10
  }
  dependsOn: [
    acrPullRoleAssignment
  ]
}

// Frontend Container App (frontoffice)
module frontoffice 'core/host/container-app.bicep' = {
  name: 'frontoffice'
  params: {
    name: '${abbrs.appContainerApps}frontoffice-${resourceToken}'
    location: location
    tags: union(tags, { 'azd-service-name': 'frontoffice' })
    managedIdentityId: managedIdentity.outputs.id
    containerAppsEnvironmentId: containerAppsEnvironment.outputs.id
    containerRegistryName: containerRegistry.outputs.name
    containerImage: 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'
    targetPort: 3000
    externalIngress: true
    environmentVariables: [
      {
        name: 'NODE_ENV'
        value: 'production'
      }
      {
        name: 'API_URL'
        value: 'https://${backoffice.outputs.fqdn}'
      }
      {
        name: 'NEXT_PUBLIC_API_URL'
        value: 'https://${backoffice.outputs.fqdn}'
      }
      {
        name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
        value: applicationInsights.outputs.connectionString
      }
    ]
    enableCors: false
    cpu: '0.25'
    memory: '0.5Gi'
    minReplicas: 0
    maxReplicas: 10
  }
  dependsOn: [
    acrPullRoleAssignment
  ]
}

// Outputs required by AZD
output RESOURCE_GROUP_ID string = resourceGroup().id
output AZURE_CONTAINER_REGISTRY_ENDPOINT string = containerRegistry.outputs.loginServer
output AZURE_CONTAINER_REGISTRY_NAME string = containerRegistry.outputs.name
output AZURE_KEY_VAULT_ENDPOINT string = keyVault.outputs.endpoint
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.name
output APPLICATIONINSIGHTS_CONNECTION_STRING string = applicationInsights.outputs.connectionString
output BACKOFFICE_URL string = 'https://${backoffice.outputs.fqdn}'
output FRONTOFFICE_URL string = 'https://${frontoffice.outputs.fqdn}'
output STORAGE_ACCOUNT_NAME string = storage.outputs.name
