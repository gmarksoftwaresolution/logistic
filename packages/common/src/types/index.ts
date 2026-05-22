export interface UserProfile {
  id: string;
  fullName?: string;
  phoneNumber: string;
  email?: string;
  role: string;
  isVerified: boolean;
  applicationStatus: string;
}

export interface OTPPayload {
  phoneNumber: string;
  otp: string;
}
