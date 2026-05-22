import * as bcrypt from 'bcrypt';

export class EncryptionUtil {
  static async hash(data: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(data, salt);
  }

  static async compare(data: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(data, hashed);
  }

  static maskAadhaar(aadhaar: string): string {
    if (!aadhaar || aadhaar.length < 12) return 'XXXX XXXX XXXX';
    return `XXXX XXXX ${aadhaar.slice(-4)}`;
  }

  static maskMobile(mobile: string): string {
    if (!mobile || mobile.length < 10) return 'XXXXXX XXXX';
    return `XXXXXX${mobile.slice(-4)}`;
  }
}
