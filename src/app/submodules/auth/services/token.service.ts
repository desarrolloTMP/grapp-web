import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { TokenService, AuthenticationService, Logger } from 'ngx-3a';
import { isPlatformBrowser } from '@angular/common';
import { USER_LOGGED_TOKEN } from '../auth.models';
import { SecurityService } from './security.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class SESSOTokenService implements TokenService {
  constructor(@Inject(PLATFORM_ID) private platformId: Object, private security: SecurityService) {}

  getUserToken(token: string = 'public'): Promise<string> {
    if (isPlatformBrowser(this.platformId)) {
      let userToken: string;
      try {
        userToken = this.security.decrypt(localStorage.getItem(USER_LOGGED_TOKEN));
      } catch {
        new Logger('TokenService', environment.production).log('No token found');
      }
      if (userToken || token) {
        return Promise.resolve(userToken || token);
      }
    }
    return Promise.reject('No token found');
  }
}
