import 'server-only';
import { ClientCertificateCredential } from '@azure/identity';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { getEnvCert } from '@/utils/envCert';

export default class MSGraphService {
  async getMSGraphClient() {
    const { azure_ad_pem_key } = await getEnvCert();

    const credential = new ClientCertificateCredential(
      process.env.MSAL_TENANT_ID ?? '',
      process.env.MSAL_CLIENT_ID ?? '',
      {
        certificate: azure_ad_pem_key,
      },
    );

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      // The client credentials flow requires that you request the
      // /.default scope, and pre-configure your permissions on the
      // app registration in Azure. An administrator must grant consent
      // to those permissions beforehand.
      scopes: ['https://graph.microsoft.com/.default'],
    });

    return Client.initWithMiddleware({
      authProvider: authProvider,
    });
  }
}
