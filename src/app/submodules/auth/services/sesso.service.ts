import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { AuthenticationService, AuthenticatorError, AuthenticatorRecoveryCallback, Logger } from 'ngx-3a';
import { Auth, Database } from '3a-common';
import { BehaviorSubject, Observable, of, timer, from } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import * as CryptoJS from 'crypto-js';


import {
  SESSO_SESSION_TOKEN,
  SignInResponse,
  USER_LOGGED_TOKEN,
  SignUpRequest,
  SignUpResponse,
  SIGN_UP_TOKEN,
  ACTIVATION_TOKEN,
} from '../auth.models';
import { environment } from 'src/environments/environment';
import { Users, Collections } from 'grapp-common-se';
import { SecurityService } from './security.service';
import { USER_EMPTY_PASSWORD } from '../../main/models/users';
@Injectable()
export class SESSOService implements AuthenticationService {
  
  logger: Logger = new Logger('SESSOService', environment.production);
  user: BehaviorSubject<Auth.User> = new BehaviorSubject<Auth.User>(null);

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object,
    private db: Database.DatabaseService,
    private security: SecurityService
  ) {
    this.initUserInfo();
  }

  private initUserInfo() {
    if (isPlatformBrowser(this.platformId)) {
      const userToken = localStorage.getItem(USER_LOGGED_TOKEN);
      if (userToken) {
        this.loadUser(this.security.decrypt(userToken));
      }
    }
  }

  private invalidateSessionToken() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(SESSO_SESSION_TOKEN);
    }
  }

  private getSessionToken(): Observable<string> {
    if (isPlatformBrowser(this.platformId)) {
      const sessionToken = localStorage.getItem(SESSO_SESSION_TOKEN);
      if (sessionToken) {
        return of(sessionToken);
      }
    }
    return this.http
      .post<SignInResponse>(`${environment.sesso.apiUrl}/signin`, {
        user: environment.sesso.userId,
        password: environment.sesso.apiKey,
        idApp: environment.sesso.appId,
      })
      .pipe(
        map(response => {
          if (response && response.sessionToken) {
            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem(SESSO_SESSION_TOKEN, response.sessionToken);
            }
            return response.sessionToken;
          }
          return 'public';
        })
      );
  }

  private loadUser(userID: string) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(USER_LOGGED_TOKEN, this.security.encrypt(userID));
    }
    this.db.get<Users.User>(userID).subscribe(user => {
      if (user) {
        this.user.next(user);
      } else {
        this.signOut();
      }
    });
  }

  signUp(email: string, name: string, password: string, callback?: (userID: string, error?: AuthenticatorError) => void): void {

    if (isPlatformBrowser(this.platformId)) {
      const currentActivationToken = localStorage.getItem(ACTIVATION_TOKEN);
      if (password !== USER_EMPTY_PASSWORD && currentActivationToken) {
        this.confirmRegister(currentActivationToken, password, done => {
          if (done) {
            localStorage.clear();
            this.signIn(email, password, callback);
          } else {
            localStorage.removeItem(ACTIVATION_TOKEN);
            this.signUp(email, name, password, callback);
          }
        });
        return;
      }
    }

    this.getSessionToken()
      .pipe(
        switchMap(sessionToken => {
          const signUpRequest: SignUpRequest = {
            email: email,
            idApp: environment.sesso.appId,
            names: name,
            username: email,
            returnUrl: isPlatformBrowser(this.platformId)
              ? `${environment.appURL}/auth/complete/${password === USER_EMPTY_PASSWORD ? encodeURIComponent(email) + '/' : ''}`
              : undefined,
            returnUrlLogin: environment.appURL,
          };
          return this.http.post<SignUpResponse>(`${environment.sesso.apiUrl}/signup/${sessionToken}`, signUpRequest);
        }),
        catchError(() => {
          this.invalidateSessionToken();

          return this.getSessionToken().pipe(
            switchMap(sessionToken => {

              const token =  CryptoJS.AES.encrypt(
                environment.sesso.appId,
                environment.sesso.aesKey
              ).toString();

              const signUpRequest: SignUpRequest = {
                email: email,
                names: name,
                username: email,
                idApp: environment.sesso.appId,
                returnUrl: isPlatformBrowser(this.platformId)
                  ? `${environment.appURL}/auth/complete/${password === USER_EMPTY_PASSWORD ? encodeURIComponent(email) + '/' : ''}`
                  : undefined,
                returnUrlLogin: environment.appURL,
                token
              };

              return this.http.post<SignUpResponse>(`${environment.sesso.apiUrl}/signup`, signUpRequest);
            })
          );
        })
      )
      .subscribe(
        signUpResponse => {
          if (signUpResponse && signUpResponse.userID) {
            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem(SIGN_UP_TOKEN, this.security.encrypt(`${signUpResponse.activateAccountToken}:${email}:${password}`));
            }
            callback(signUpResponse.userID);
          } else {
            callback(undefined, AuthenticatorError.NOT_CONFIRMED);
          }
        },
        error => {
          if (error.status === 400 && error.error === 'EL usuario ya existe') {
            callback(undefined, AuthenticatorError.USER_EXISTS);
          } else {
            this.logger.log('Error in authentication', error);
            callback(undefined, AuthenticatorError.PARAMETER_NOT_VALID);
          }
        }

      );
  }

  signIn(email: string, password: string, callback?: (userID: string, error?: AuthenticatorError) => void): void {
    this.http
      .post<SignInResponse>(`${environment.sesso.apiUrl}/signin`, {
        user: email,
        password: this.security.encrypt(password),
        idApp: environment.sesso.appId,
      })
      .subscribe(
        response => {
          if (response && response.userID) {
            this.loadUser(response.userID);
            callback(response.userID);
          } else {
            callback(undefined, AuthenticatorError.NOT_FOUND);
          }
        },
        () => callback(undefined, AuthenticatorError.NOT_AUTHORIZED)
      );
  }

  signOut(callback?: (success: boolean) => void): void {
    this.user.next({ name: '' });
    this.invalidateSessionToken();
    if (isPlatformBrowser(this.platformId)) {
      const currentActivationToken = localStorage.getItem(ACTIVATION_TOKEN);
      localStorage.clear();
      sessionStorage.clear();
      if (currentActivationToken) {
        localStorage.setItem(ACTIVATION_TOKEN, currentActivationToken);
      }
      if (callback) {
        callback(true);
      }
    } else {
      if (callback) {
        callback(true);
      }
    }
  }

  changePassword(oldPassword: string, newPassword: string, callback: (success: boolean) => void): void {
    throw new Error('Method not implemented.');
  }
  recoverPassword(email: string, firstCallback: (success: boolean, error?: AuthenticatorError) => void): AuthenticatorRecoveryCallback {
    this.http
      .post<SignInResponse>(`${environment.sesso.apiUrl}/forgot`, {
        user: email,
        idApp: environment.sesso.appId,
        returnUrl:environment.appURL,
      })
      .subscribe(
        response => {
          if (response) {
            firstCallback(true);
          } else {
            firstCallback(false, AuthenticatorError.NOT_FOUND);
          }
        },
        () => firstCallback(false, AuthenticatorError.NOT_AUTHORIZED)
      );
    return (code, newPassword, callback) => {
      callback(true);
    };
    // throw new Error('Method not implemented.');
  }
  checkUserEmail(email: string, callback: (exists: boolean, user?: Auth.User) => void): void {
    if (isPlatformBrowser(this.platformId)) {
      const currentActivationToken = localStorage.getItem(ACTIVATION_TOKEN);
      if (currentActivationToken) {
        return callback(false);
      }
    }
    this.db
      .find<Users.User>(
        [
          {
            key: 'email',
            relation: Database.DatabaseQueryRelation.Equal,
            value: email,
          },
        ],
        { name: Collections.USERS }
      )
      .subscribe(users => {
        if (users && users.length) {
          callback(true, users[0]);
        } else {
          callback(false);
        }
      });
  }
  checkUserNit(nit: string, callback: (exists: boolean, user?: Auth.User) => void): void {
    throw new Error('Method not implemented.');
  }

  confirmRegister?(activationToken: string, password: string, callback: (done: boolean) => void): void {
    const confirmationRequest = {
      token: activationToken,
      password: this.security.encrypt(password),
      confirm: this.security.encrypt(password),
    };
    this.http.post(`${environment.sesso.apiUrl}/activateLocal`, confirmationRequest).subscribe(
      () => {
        callback(true);
      },
      error => {
        if (error.status === 200) {
          callback(true);
        } else {
          this.logger.error('Could not confirm user', error);
          callback(false);
        }
      }
    );
  }
  getUncompletedUser?(token: string, callback: (exists: boolean, user?: Auth.User) => void): void {
    throw new Error('Method not implemented.');
  }
  completeUserRegistration?(token: string, user?: Auth.User, replacementUserID?: string): Observable<import('3a-common').APIResponse> {
    throw new Error('Method not implemented.');
  }
  resendUserInvitation?(user: Auth.User, callback: (_: boolean) => void): void {
    throw new Error('Method not implemented.');
  }
  resendConfirmationEmail?(email: string): Observable<string> {
    throw new Error('Method not implemented.');
  }
}
