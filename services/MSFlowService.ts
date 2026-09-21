import 'server-only';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials';
import { createGraphTokenCredential } from '@/lib/auth/credentials';

export default class MSFlowService {
  async getMSFlowAuthProvider() {
    const credential = createGraphTokenCredential();

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
