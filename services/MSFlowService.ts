import 'server-only';
import { ClientCertificateCredential } from '@azure/identity';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { getEnvCert } from '@/utils/envCert';

export default class MSFlowService {
  async getMSFlowAuthProvider() {
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
      scopes: ['https://service.flow.microsoft.com//.default'],
    });

    return authProvider;
  }

  async getMSFlowAuthToken() {
    const authProvider = await this.getMSFlowAuthProvider();
    return await authProvider.getAccessToken();
  }
}
