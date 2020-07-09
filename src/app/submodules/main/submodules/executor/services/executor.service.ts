import { Injectable } from '@angular/core';
import { AuthenticationService } from 'ngx-3a';
import { Users } from 'grapp-common-se';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class ExecutorService {
  public executor: BehaviorSubject<Users.User> = new BehaviorSubject(null);
  constructor(private auth: AuthenticationService) {
    this.initExecutorListener();
  }

  /**
   * Initilize the subscription to current user
   */
  initExecutorListener() {
    this.auth.user.subscribe(user => {
      if (user) {
        this.executor.next(user as Users.User);
      }
    });
  }
}
