import {
  Component,
  OnInit,
  Input,
  ViewChild,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { Orders, Clinics } from 'grapp-common-se';
import { RequestService } from '../../../services/request.service';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { ModalBaseComponent } from '../modal.base.component';
import { MainService } from '../../../services/main.service';
import { BasicFormComponent } from 'ngx-3a';
import { CodablesService } from '../../../services/codables.service';

@Component({
  selector: 'app-cups-modal',
  templateUrl: './cups.modal.component.html',
  // styleUrls: ['./order.modal.component.scss']
})
export class CUPSModalComponent extends ModalBaseComponent implements OnInit {
  @ViewChild('form') basicForm: BasicFormComponent;
  cups: Clinics.CUPS;
  fields: FormlyFieldConfig[];

  @Input() set _cups(cups: Clinics.CUPS) {
    if (cups) {
      this.cups = JSON.parse(JSON.stringify(cups));
      this.fields = this.codesSvc.addCUPSFields();
    }
  }

  constructor(private codesSvc: CodablesService, mainSvc: MainService) {
    super(mainSvc);
  }

  ngOnInit(): void {}

  submit() {
    this.basicForm.send();
  }
}
