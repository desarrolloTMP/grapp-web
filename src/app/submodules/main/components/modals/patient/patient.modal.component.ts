import { Component, OnInit, ViewChild, Input, ChangeDetectorRef } from '@angular/core';
import { ModalBaseComponent } from '../modal.base.component';
import { MainService } from '../../../services/main.service';
import { PatientService } from '../../../services/patient.service';
import { BasicFormComponent } from 'ngx-3a';
import { Users } from 'grapp-common-se';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-patient-modal',
  templateUrl: './patient.modal.component.html',
})
export class PatientModalComponent extends ModalBaseComponent implements OnInit {
  @ViewChild('form') basicForm: BasicFormComponent;
  patient: Users.Patient;
  fields: FormlyFieldConfig[];
  lastDepto: string;
  documentExists = false;

  changed: Subject<Users.Patient> = new Subject();

  @Input() set _patient(patient: Users.Patient) {
    if (patient) {
      this.patient = patient;
      this.fields = this.patientSvc.addPatientFields(
        patient.id === undefined && patient['_id'] === undefined,
        patient.address['department']
      );
    }
  }

  constructor(private patientSvc: PatientService, mainSvc: MainService, private changeDetector: ChangeDetectorRef) {
    super(mainSvc);
  }

  ngOnInit(): void {
    this.changed.pipe(debounceTime(1100)).subscribe(patient => this.patientChanged(patient));
  }

  patientChanged(patient: Users.Patient) {
    if (
      patient.address['department'] &&
      patient.address['department'].match(new RegExp('^[A-Z]+$')) &&
      patient.address['department'] !== this.lastDepto
    ) {
      this.fields = this.patientSvc.addPatientFields(
        patient.id === undefined && patient['_id'] === undefined,
        patient.address['department']
      );
    }
    this.lastDepto = patient.address['department'];
  }

  submit() {
    if (this.patient.id === undefined && this.patient['_id'] === undefined) {
      const searchResponse = this.patientSvc.searchPatient({ document: this.patient.document['original'] });
      this.observable(searchResponse).subscribe(requests => {
        if (requests && requests.length) {
          this.documentExists = true;
        } else {
          this.documentExists = false;
          this.basicForm.send();
        }
      });
    } else {
      this.documentExists = false;
      this.basicForm.send();
    }
  }
}
