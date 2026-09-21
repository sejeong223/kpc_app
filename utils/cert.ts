import forge from "node-forge";

export interface CertificateMaterial {
  certificatePem: string;
  privateKeyPem: string;
  thumbprint: string;
  combinedPem: string;
}

export class CertificateConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CertificateConfigurationError";
  }
}

export function parsePfx(
  base64EncodedPfx: string,
  password?: string,
): CertificateMaterial {
  try {
    const pfxBytes = Buffer.from(base64EncodedPfx, "base64");
    const p12Der = forge.util.binary.raw.encode(new Uint8Array(pfxBytes));
    const p12Asn1 = forge.asn1.fromDer(p12Der);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password ?? "");
    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    });
    const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0];

    if (!keyBag?.key) {
      throw new CertificateConfigurationError(
        "MSAL_CERT_PFX does not contain a private key",
      );
    }

    const certificateBags = p12.getBags({
      bagType: forge.pki.oids.certBag,
    });
    const certificateBag = certificateBags[forge.pki.oids.certBag]?.[0];

    if (!certificateBag?.cert) {
      throw new CertificateConfigurationError(
        "MSAL_CERT_PFX does not contain a certificate",
      );
    }

    const privateKeyPem = forge.pki.privateKeyToPem(keyBag.key);
    const certificatePem = forge.pki.certificateToPem(certificateBag.cert);
    const digest = forge.md.sha1.create();

    digest.update(
      forge.asn1
        .toDer(forge.pki.certificateToAsn1(certificateBag.cert))
        .getBytes(),
    );

    return {
      certificatePem,
      privateKeyPem,
      thumbprint: digest.digest().toHex().toUpperCase(),
      combinedPem: `${certificatePem}\n${privateKeyPem}`,
    };
  } catch (error) {
    if (error instanceof CertificateConfigurationError) {
      throw error;
    }

    throw new CertificateConfigurationError(
      "MSAL_CERT_PFX could not be parsed",
    );
  }
}
