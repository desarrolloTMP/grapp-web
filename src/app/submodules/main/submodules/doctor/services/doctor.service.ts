import { Injectable } from '@angular/core';
import { AuthenticationService } from 'ngx-3a';
import { Users } from 'grapp-common-se';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class DoctorService {
  public doctor: BehaviorSubject<Users.Doctor> = new BehaviorSubject(null);
  constructor(private auth: AuthenticationService) {
    this.initDoctorListener();
  }

  /**
   * Initilize the subscription to current user
   */
  initDoctorListener() {
    this.auth.user.subscribe(user => {
      if (user) {
        this.doctor.next(user as Users.Doctor);
      }
    });
  }
}
