import { Component, OnInit, ViewChild, Input } from '@angular/core';
import { ModalBaseComponent } from '../modal.base.component';
import { MainService } from '../../../services/main.service';
import { PatientService } from '../../../services/patient.service';
import { BasicFormComponent } from 'ngx-3a';
import { Users } from 'grapp-common-se';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { UsersService } from '../../../services/users.service';

@Component({
  selector: 'app-user-modal',
  templateUrl: './user.modal.component.html',
})
export class UserModalComponent extends ModalBaseComponent implements OnInit {
  @ViewChild('form') basicForm: BasicFormComponent;
  user: Users.User;
  fields: FormlyFieldConfig[];
  selectold: any;

  @Input() set _user(user: Users.User) {
    if (user) {
      this.user = JSON.parse(JSON.stringify(user));
      this.loadUserFields(this.user);
    }
  }

  constructor(private userSvc: UsersService, mainSvc: MainService) {
    super(mainSvc);
  }

  ngOnInit(): void {}

  submit() {
    this.basicForm.send();
  }

  loadUserFields(user: Users.User) {
    if (user && user.userType === Users.UserType.DOCTOR) {
      this.fields = this.userSvc.addDoctorFields(user.id === undefined);
    } else {
      this.fields = this.userSvc.addUserFields(user.id === undefined);
    }
  }

  change() {
    if (this.user.userType !== undefined && this.selectold !== this.user.userType) {
      this.user.userType = Number(this.user.userType);
      this.selectold = this.user.userType;
      this.loadUserFields(this.user);
    }
  }
}
