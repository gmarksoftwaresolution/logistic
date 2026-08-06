export enum UserType {
  SHG = 'SHG',
  INDIVIDUAL = 'INDIVIDUAL',
}

export class ShgUtil {
  static formatUniqueId(roleOrType: string, sequence: number): string {
    const isShg = roleOrType === 'SHG';
    const prefix = isShg ? 'LOG-SHG' : 'LOG-NONSHG';
    const paddedSeq = sequence.toString().padStart(4, '0');
    return `${prefix}-${paddedSeq}`;
  }
}
