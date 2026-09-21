import 'server-only';

import { parsePfx } from './cert';

export async function getEnvCert() {
  const pfx = parsePfx(process.env.MSAL_CERT_PFX ?? '');

  const azure_ad_pem_key = `${pfx.certificatePem}\n${pfx.privateKey}`;
  const azure_ad_cert_thumbprint = pfx.thumbprint;


  return {
    azure_ad_cert_thumbprint: azure_ad_cert_thumbprint,
    azure_ad_pem_key: azure_ad_pem_key
  };
}
