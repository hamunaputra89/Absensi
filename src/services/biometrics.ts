/**
 * WebAuthn & Biometric Fingerprint Service
 * Supports hardware fingerprint scanners (Touch ID, Android Biometrics, Windows Hello)
 * with robust browser support & simulated capacitive sensor fallback.
 */

export interface BiometricAvailability {
  isSupported: boolean;
  hasPlatformAuthenticator: boolean;
  type: 'hardware' | 'simulated';
}

/**
 * Checks if device hardware supports WebAuthn platform authenticators (Fingerprint / Touch ID)
 */
export async function checkBiometricSupport(): Promise<BiometricAvailability> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return {
      isSupported: false,
      hasPlatformAuthenticator: false,
      type: 'simulated'
    };
  }

  try {
    const hasPlatform = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return {
      isSupported: true,
      hasPlatformAuthenticator: hasPlatform,
      type: hasPlatform ? 'hardware' : 'simulated'
    };
  } catch (err) {
    console.warn('Biometric check failed, falling back to capacitive scanner:', err);
    return {
      isSupported: true,
      hasPlatformAuthenticator: false,
      type: 'simulated'
    };
  }
}

/**
 * Trigger WebAuthn fingerprint verification or fallback
 */
export async function verifyFingerprintBiometric(
  userId: string,
  userName: string
): Promise<{ success: boolean; credentialId?: string; error?: string }> {
  // If WebAuthn is supported and not restricted by iframe permissions
  if (typeof window !== 'undefined' && window.PublicKeyCredential) {
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      // We attempt real platform authenticator verification
      const options: CredentialCreationOptions = {
        publicKey: {
          challenge,
          rp: {
            name: 'AbsensiKu Presensi Biometrik',
            id: window.location.hostname || 'localhost'
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userName,
            displayName: userName
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            residentKey: 'preferred'
          },
          timeout: 45000,
          attestation: 'none'
        }
      };

      const credential = await navigator.credentials.create(options) as any;
      if (credential && credential.id) {
        return {
          success: true,
          credentialId: credential.id
        };
      }
    } catch (err: any) {
      // In iframes or environments without physical fingerprint sensors,
      // DOMException "NotAllowedError" or "NotSupportedError" can occur.
      // We log and return a graceful flag so the UI can use the high-fidelity
      // capacitive biometric scanner pad.
      console.info('Hardware biometric prompt not accepted or not available in iframe, using scanner pad:', err.message);
      return {
        success: false,
        error: err.name === 'NotAllowedError' ? 'Dibatalkan oleh pengguna' : err.message
      };
    }
  }

  return {
    success: false,
    error: 'Sensor biometrik fisik tidak tersedia'
  };
}
