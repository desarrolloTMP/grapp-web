import { Injectable } from '@angular/core';
import { Database } from '3a-common';
import { Observable, of, from } from 'rxjs';
import { Users, Collections, Orders } from 'grapp-common-se';
import { FormService, SelectOption, AuthenticationService, Logger, AuthenticatorError } from 'ngx-3a';
import { ModalEvent, Modals } from 'src/app/models/navigation';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { map } from 'rxjs/operators';
import { FilterParser } from '../models/rbar';
import { USER_EMPTY_PASSWORD, USER_TOKEN } from '../models/users';
import { SwitchComponent } from 'src/app/components/fields/switch/switch.field.component';
import { environment } from 'src/environments/environment';

@Injectable()
export class UsersService {
  logger: Logger = new Logger('UsersService', environment.production);
  constructor(private db: Database.DatabaseService, private formSvc: FormService, private authSvc: AuthenticationService) {}

  private idTypeOptions(): SelectOption[] {
    return [
      {
        value: Users.IDType.CC,
        label: 'Cédula de Ciudadanía',
      },
      {
        value: Users.IDType.TI,
        label: 'Tarjeta de Identidad',
      },
      {
        value: Users.IDType.RN,
        label: 'Registro de Nacimiento',
      },
      {
        value: Users.IDType.CC_EXT,
        label: 'Cédula de Extranjería',
      },
      {
        value: Users.IDType.NIT,
        label: 'NIT',
      },
      {
        value: Users.IDType.PS,
        label: 'Pasaporte',
      },
    ];
  }

  /**
   * The select options available for user type
   */
  userTypeOptions(): SelectOption[] {
    return [
      {
        label: 'Analista de programas especiales',
        value: Users.UserType.ANALYST,
      },
      {
        label: 'Asistente',
        value: Users.UserType.ASSISTANT,
      },
      {
        label: 'Coordinador',
        value: Users.UserType.COORDINATOR,
      },
      {
        label: 'Gestor',
        value: Users.UserType.DOCTOR,
      },
      {
        label: 'Ejecutor',
        value: Users.UserType.EXECUTOR,
      },
    ];
  }

  /**
   * Avaiable options for doctor specialty
   */
  private doctorSpecialityOptions(): SelectOption[] {
    return Object.values(Orders.DoctorSpeciality).map((speciality: string) => ({ label: speciality, value: speciality }));
  }

  /**
   * Filter parser for userType
   */
  userTypeFilterParser(): FilterParser {
    return (type: Users.UserType) => {
      switch (Number(type)) {
        case Users.UserType.DOCTOR:
          return 'Gestor';
        case Users.UserType.COORDINATOR:
          return 'Coordinador';
        case Users.UserType.ASSISTANT:
          return 'Asistente';
        case Users.UserType.ANALYST:
          return 'Analista de programas especiales';
        case Users.UserType.EXECUTOR:
          return 'Ejecutor';
        default:
          return 'N/A';
      }
    };
  }

  /**
   * Gets a set of users based on a predifined query
   * @param queries Specified custom queries
   */
  getUsersByQueries(queries: Database.DatabaseQuery[]): Observable<Users.User[]> {
    return this.db.find<Users.User>(queries, { name: Collections.USERS });
  }

  /**
   * Gets the fields needed to configure filter menu for users data
   */
  getUsersFilterFields() {
    return [
      this.formSvc.textInput('$name', 'Nombre', '', false),
      this.formSvc.textInput('$document', 'Documento', '', false),
      this.formSvc.selectInput('userType', 'Tipo de usuario', this.userTypeOptions(), false),
      this.formSvc.emailInput('Correo', '', false),
      this.formSvc.selectInput(
        'disabled',
        'Estado',
        [
          {
            label: 'Habilitado',
            value: 'Habilitado',
          },
          {
            label: 'Deshabilitado',
            value: 'Deshabilitado',
          },
        ],
        false
      ),
    ];
  }

  /**
   * Add or edit a user model event
   * @param user An existing user to use as base for editing
   * @param callback The callback for handling updates in the UI
   */
  addUserEvent(user?: Users.User, callback?: (_: Users.User) => void): ModalEvent {

    return {

      type: Modals.USER,
      payload: user || {
        idType: Users.IDType.CC,
        createdAt: new Date().getTime(),
        permissions: [
          {
            resourceID: '3a:grapp:resources::*',
            access: {
              write: true,
              read: true,
            },
          },
        ],
      },

      confirmation: {
        text: 'Guardar',
        callback: $user =>

          this.saveUser($user as Users.User).pipe(
            map(savedRequest => {

              if (savedRequest) {
                if (callback) {

                  callback(savedRequest);
                }
                return true;
              }
              return false;
            })
          ),
      },
    };
  }

  /**
   * The fields needed to add or edit a user
   */
  addUserFields(isNew: boolean = true): FormlyFieldConfig[] {
    return isNew
      ? [
          this.formSvc.textInput('name', 'Nombre completo', '', true),
          this.formSvc.emailInput('Correo', '', true),
          this.formSvc.selectInput('idType', 'Tipo de documento', this.idTypeOptions(), true),
          this.formSvc.numberInput('document', 'Documento', true),
          this.formSvc.selectInput('userType', 'Tipo de usuario', this.userTypeOptions(), true),
        ]
      : [
          this.formSvc.textInput('name', 'Nombre completo', '', true),
          this.formSvc.selectInput('userType', 'Tipo de usuario', this.userTypeOptions(), true),
          this.formSvc.numberInput('document', 'Documento', true),
          SwitchComponent.fieldWith('disabled', 'Deshabilitado'),
        ];
  }

  /**
   * The fields needed to add or edit a doctor
   */
  addDoctorFields(isNew: boolean = true): FormlyFieldConfig[] {
    return [...this.addUserFields(isNew), this.formSvc.selectInput('specialty', 'Especialidad', this.doctorSpecialityOptions(), true)];
  }

  saveUser(user: Users.User): Observable<Users.User> {

    if (typeof user.userType === 'string') {
      user.userType = Number(user.userType);
    }

    if (typeof user.document === 'number') {
      user.document = String(user.document);
    }

    if (user.id) {
      return this.db.save(user, { name: Collections.USERS });
    } else {
      return from(

        new Promise<Users.User>((resolve, reject) => {
          this.authSvc.signUp(user.email, user.name, USER_EMPTY_PASSWORD, (userID, error) => {

            if (error !== undefined) {

              this.logger.error(error.toString());
              reject(error);
            } else {
              
              user.id = userID;
              this.db.save(user, { name: Collections.USERS }).subscribe(savedUser => resolve(savedUser));
            }
          });
        })
      );
    }
  }
}
