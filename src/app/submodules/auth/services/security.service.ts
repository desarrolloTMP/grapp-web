import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from 'src/environments/environment';
import { Logger } from 'ngx-3a';

@Injectable()
export class SecurityService {
  logger: Logger = new Logger('SESSOScurity', environment.production);
  encrypt(text: string): string {
    try {
      return CryptoJS.AES.encrypt(text, environment.sesso.aesKey).toString();
    } catch (error) {
      this.logger.error('Encryption error', error);
      return '';
    }
  }
  decrypt(text: string): string {
    try {
      return CryptoJS.AES.decrypt(text, environment.sesso.aesKey).toString(CryptoJS.enc.Utf8);
    } catch (error) {
      this.logger.error('Decryption error', error);
      return '';
    }
  }
}
