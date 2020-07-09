import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import {
  AuthenticatorOptions,
  Logger,
  AuthenticationService,
  AuthenticatorResponse,
  AuthenticatorOptionHelper,
  AuthenticatorStatus,
} from 'ngx-3a';
import { Auth, Database } from '3a-common';
import { Router, ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { SIGN_UP_TOKEN, ACTIVATION_TOKEN } from '../../auth.models';
import { SecurityService } from '../../services/security.service';
import { environment } from 'src/environments/environment';
import { Users, Collections } from 'grapp-common-se';
import { timer } from 'rxjs';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  
  status: AuthenticatorStatus = AuthenticatorStatus.LOGIN;
  options: AuthenticatorOptions = {
    skipConfirmation: true,
    disableRegister: true,
    roles: [
      {
        name: 'Asistente',
        icon: 'face',
        fields: [],
      },
      {
        name: 'Gestor',
        icon: 'local_hospital',
        fields: [],
      },
      {
        name: 'Analista',
        icon: 'supervisor_account',
        fields: [],
      },
    ],
  };
  user: Auth.User;
  logger = new Logger('LoginComponent', environment.production);
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object,
    private database: Database.DatabaseService,
    private security: SecurityService,
    private auth: AuthenticationService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const activationToken = params.get('token');
      if (activationToken) {
        if (isPlatformBrowser(this.platformId)) {
          const tokenInfo = this.security.decrypt(localStorage.getItem(SIGN_UP_TOKEN)).split(':');
          if (!tokenInfo || tokenInfo.length !== 3 || tokenInfo[0] !== activationToken) {

            this.logger.error('Token info was not found correclty');
            const email = params.get('email');

            if (!email) {
              return this.logger.error('No email found on URL');
            }
            this.database
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
              .subscribe(matched => {
                if (matched && matched.length) {
                  this.options = { ...this.options, roles: undefined, prefilled: { email, name: matched[0].name, password: '' } };
                  this.status = AuthenticatorStatus.REGISTER;
                  localStorage.setItem(ACTIVATION_TOKEN, activationToken);
                }
              });
          } else {
            this.auth.confirmRegister(activationToken, tokenInfo[2], done => {
              if (done) {
                // this.auth.signIn(tokenInfo[1], tokenInfo[2]);
                this.options = { ...this.options, prefilled: { email: tokenInfo[1], name: '', password: '' } };
                localStorage.removeItem(SIGN_UP_TOKEN);
              } else {
                // Show error
              }
            });
          }
        }
      }
    });
  }

  userRegistered(response: [AuthenticatorResponse, AuthenticatorOptionHelper]) {
    const user = (response[0] as any) as Users.User;
    const helper = response[1];
    switch (helper.selectedRole) {
      case 0:
        user.userType = Users.UserType.ANALYST;
        break;
      case 1:
        user.userType = Users.UserType.DOCTOR;
        break;
      case 2:
        user.userType = Users.UserType.ASSISTANT;
        break;
      case 3:
        user.userType = Users.UserType.EXECUTOR;
        break;
    }
    // user.disabled = true;
    //this.database.save(user, { name: Collections.USERS }).subscribe();
  }

  userAuth(user: Auth.User) {

    if (user && (user as Users.User).userType !== undefined) {
      this.logger.log('User', user);

      switch ((user as Users.User).userType) {
        case Users.UserType.COORDINATOR:
          this.router.navigateByUrl('/app/coordinator');
          break;
        case Users.UserType.ASSISTANT:
          this.router.navigateByUrl('/app/assistant');
          break;
        case Users.UserType.DOCTOR:
          this.router.navigateByUrl('/app/doctor');
          break;
        case Users.UserType.ANALYST:
          this.router.navigateByUrl('/app/analyst');
          break;
        case Users.UserType.EXECUTOR:
          this.router.navigateByUrl('/app/executor');
          break;
        default:
          this.router.navigateByUrl('/app');
          this.auth.signOut(done => {
            if (done) {
              this.router.navigateByUrl('/auth');
            }
          });
          break;
      }
    }
  }

  handleBusy(event: any) {}
}
