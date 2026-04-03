param name string
param location string
param tags object = {}
param logAnalyticsWorkspaceId string
param logAnalyticsWorkspaceKey string
param storageAccountName string = ''
@secure()
param storageAccountKey string = ''
param fileShareName string = ''

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: name
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: reference(logAnalyticsWorkspaceId, '2022-10-01').customerId
        sharedKey: logAnalyticsWorkspaceKey
      }
    }
    zoneRedundant: false
  }
}

// Storage mount for Azure Files
resource storage 'Microsoft.App/managedEnvironments/storages@2023-05-01' = if (!empty(storageAccountName)) {
  parent: containerAppsEnvironment
  name: 'uploads-storage'
  properties: {
    azureFile: {
      accountName: storageAccountName
      accountKey: storageAccountKey
      shareName: fileShareName
      accessMode: 'ReadWrite'
    }
  }
}

output id string = containerAppsEnvironment.id
output name string = containerAppsEnvironment.name
output defaultDomain string = containerAppsEnvironment.properties.defaultDomain
output storageName string = !empty(storageAccountName) ? storage.name : ''
