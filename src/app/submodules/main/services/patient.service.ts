import { Injectable } from '@angular/core';
import { Database } from '3a-common';
import { PatientQuery } from '../models/patient';
import { Users, Collections } from 'grapp-common-se';
import { Observable } from 'rxjs';
import { FormService, SelectOption, CitiesService } from 'ngx-3a';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { ModalEvent, Modals } from 'src/app/models/navigation';
import { map, tap, take } from 'rxjs/operators';
import { MainService } from './main.service';
import { FormControl } from '@angular/forms';
@Injectable()
export class PatientService {
  cities: string[];
  departments: string[];
  _value: any;

  constructor(
    private db: Database.DatabaseService,
    private formSvc: FormService,
    private mainSvc: MainService,
    private citiesSvc: CitiesService
  ) {}

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
   * Search for a specific patient
   */
  searchPatient(query: PatientQuery): Observable<Users.Patient[]> {
    return this.db.find<Users.Patient>(
      [
        {
          key: 'document',
          relation: Database.DatabaseQueryRelation.Contains,
          value: query.document,
        },
      ],
      { name: Collections.PATIENTS }
    );
  }

  /**
   * Search for a specific patient
   */
  getPatientsByQueries(queries: Database.DatabaseQuery[] = [], page: number = 0): Observable<Users.Patient[]> {
    return this.db.find<Users.Patient>(queries, { name: Collections.PATIENTS, lastIndex: 100 * page });
  }

  /**
   * Gets the fields needed to configure filter menu for patients data
   */
  getPatientsFilterFields() {
    return [
      this.formSvc.textInput('$name', 'Nombre', '', false),
      this.formSvc.textInput('$document', 'Documento', '', false),
      this.formSvc.emailInput('Correo', '', false),
      this.formSvc.selectInput(
        'active',
        'Estado MIAS',
        [
          {
            label: 'Activo',
            value: 'Activo',
          },
          {
            label: 'Inactivo',
            value: 'Inactivo',
          },
        ],
        false
      ),
    ];
  }

  /**
   * Returns the fields required to create or edit a Patient
   */
  addPatientFields(isNew: boolean = true, department = 'ANTIOQUIA'): FormlyFieldConfig[] {
    this.departments = this.citiesSvc.getDepartments().map(dep => dep.nombreDepartamento);
    this.cities = this.citiesSvc.getCitiesByDepartmentName(department).map(city => city.descripcion);

    return isNew
      ? [
          this.formSvc.textInput('name', 'Nombre completo', '', true),
          this.formSvc.emailInput('Correo electrónico', '', false),
          this.formSvc.selectInput('idType', 'Tipo de Documento', this.idTypeOptions(), true),
          {
            key: 'document',
            validators: {
              fieldMatch: {
                expression: (control: FormControl) => {
                  const value = control.value;
                  if (value.original && value.confirmation) {
                    return value.original === value.confirmation;
                  }
                },
                message: 'Los documentos no coinciden',
              },
            },
            fieldGroup: [
              this.formSvc.textInput('original', '# Documento', '', true, undefined, undefined, undefined, true),
              this.formSvc.textInput('confirmation', 'Confirmar Documento', '', true, undefined, undefined, undefined, true),
            ],
          },
          this.formSvc.textInput('phone', 'Teléfono', '', true),
          this.formSvc.textInput('address.full', 'Dirección de residencia', '', true),
          this.formSvc.textInput('address.department', 'Departamento de residencia', '', true, undefined, this.departments),
          this.formSvc.textInput('address.city', 'Municipio de residencia', '', true, undefined, this.cities),
          this.formSvc.textInput('address.country', 'País', '', false),
        ]
      : [
          this.formSvc.textInput('name', 'Nombre completo', '', true),
          this.formSvc.emailInput('Correo electrónico', '', false),
          this.formSvc.textInput('phone', 'Teléfono', '', true),
          this.formSvc.textInput('address.full', 'Dirección de residencia', '', true),
          // this.formSvc.textInput('address.department', 'Departamento de residencia', '', true, undefined, this.departments),
          // this.formSvc.textInput('address.city', 'Municipio de residencia', '', true, undefined, this.cities),
          // this.formSvc.textInput('address.country', 'País', '', false),
        ];
  }

  /**
   * Creates a new or editing event for patient model
   * @param patient A currently existing patient to create an edit event
   */
  addPatientEvent(patient?: Users.Patient, callback?: (p: Users.Patient) => void): ModalEvent {
    return {
      type: Modals.PATIENT,
      payload: patient || {
        active: false,
        userType: Users.UserType.PATIENT,
        idType: Users.IDType.CC,
        address: {
          country: 'Colombia',
        },
      },
      confirmation: {
        text: 'Guardar',
        callback: $patient =>
          this.savePatient($patient as Users.Patient).pipe(
            map(savedPatient => {
              if (savedPatient) {
                if (callback) {
                  callback(savedPatient);
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
   * Saves a patient in the database
   * @param patient The patient to be saved
   */
  savePatient(patient: Users.Patient): Observable<Users.Patient> {
    if (patient.document['original']) {
      patient.document = patient.document['original'];
    }
    return this.db.save(patient, { name: Collections.PATIENTS });
  }
}
