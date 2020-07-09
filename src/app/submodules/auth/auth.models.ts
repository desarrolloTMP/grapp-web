import { Users } from 'grapp-common-se';

export const SESSO_SESSION_TOKEN = 'sesso';
export const USER_LOGGED_TOKEN = 'ulogg';
export const SIGN_UP_TOKEN = 'sgtk';
export const ACTIVATION_TOKEN = 'ssoakttk';
export type Base64 = string;
export interface SignInResponse {
  sessionToken: string;
  sessionTokenExpires: string;
  userID: string;
  roles?: any;
}

export interface SignUpRequest {
  email: string;
  username: string;
  idApp: string;
  names?: string;
  lastName?: string;
  typeID?: Users.IDType;
  signature?: Base64;
  photo?: Base64;
  /**
   * 3 Level object for role storage
   */
  roles?: any;
  /**
   * URL for activating the account
   */
  returnUrl?: string;
  /**
   * URL to redirect user on authentication successs
   */
  returnUrlLogin?: string;
  token?: string;
  idUser?:string;
}

export interface SignUpResponse {
  activateAccountToken: string;
  userID: string;
}
