export const BANK_VALIDATION_RULES: Record<string, { minLength: number; maxLength: number; name: string }> = {
  SBIN: { minLength: 11, maxLength: 11, name: 'SBI' },
  HDFC: { minLength: 14, maxLength: 14, name: 'HDFC' },
  ICIC: { minLength: 12, maxLength: 12, name: 'ICICI' },
  UTIB: { minLength: 15, maxLength: 16, name: 'Axis Bank' },
  BARB: { minLength: 14, maxLength: 14, name: 'Bank of Baroda' },
  PNBK: { minLength: 16, maxLength: 16, name: 'Punjab National Bank' },
  CNRB: { minLength: 13, maxLength: 13, name: 'Canara Bank' },
  BKID: { minLength: 15, maxLength: 15, name: 'Bank of India' },
  KKBK: { minLength: 14, maxLength: 14, name: 'Kotak Mahindra' },
  IDIB: { minLength: 9, maxLength: 17, name: 'Indian Bank' },
};

export const getBankRule = (ifscCode: string) => {
  if (!ifscCode || ifscCode.length < 4) {
    return { minLength: 9, maxLength: 18, name: 'Bank' };
  }
  
  const prefix = ifscCode.substring(0, 4).toUpperCase();
  return BANK_VALIDATION_RULES[prefix] || { minLength: 9, maxLength: 18, name: 'Bank' };
};
