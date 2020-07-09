import { Component, ChangeDetectionStrategy, OnInit, Input, ViewChild } from '@angular/core';
import { ModalBaseComponent } from '../modal.base.component';
import { MainService } from '../../../services/main.service';
import { CSVParser } from '../../../submodules/coordinator/coordinator.models';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormService, BasicFormComponent } from 'ngx-3a';
import { BehaviorSubject } from 'rxjs';
import { ImageService } from '../../../../../services/image.service';

@Component({
  selector: 'app-csv-modal',
  templateUrl: './csv.modal.component.html',
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CSVModalComponent extends ModalBaseComponent implements OnInit {
  parser: CSVParser;

  /**
   * A helper model to store the selected CSV Fields
   */
  model: {
    files?: FileList;
  } = {};
  /**
   * Fields for reading CSV File
   */
  fields: FormlyFieldConfig[];

  @ViewChild('form') basicForm: BasicFormComponent;

  @Input()
  set _parser(parser: CSVParser) {
    this.parser = parser;
  }
  constructor( main: MainService, private formSvc: FormService,private csvSvc: ImageService) {
    super(main);
  }

  ngOnInit() {
    super.ngOnInit();
    this.fields = [this.formSvc.fileInput('files', 'Subir archivo', false)];
  }

  submit() {
    this.csvSvc.disableAllPatients().subscribe(data => {
      if(data){
        this.basicForm.send();
      }
    });
  }

  confirm(event) {
    this.parser.progress = new BehaviorSubject(0.0001);
    this.parser.itemsProccessed = new BehaviorSubject(0);
    super.confirm(event);
  }
}
