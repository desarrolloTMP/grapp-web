import { Component, ViewChild, ElementRef } from '@angular/core';
import { BasicInput } from 'ngx-3a';

@Component({
  selector: 'app-switch-field',
  templateUrl: './switch.field.component.html',
  // styleUrls: ['../../forms.css', '../../tables.css']
  // styleUrls: ['../../../../../../styles/app.scss', '../../../../../../styles/tables.scss', '../../forms.css'],
})
export class SwitchComponent extends BasicInput {
  // @ViewChild('confirmationRadio', { read: ElementRef }) confirmationRadio: ElementRef;
  // @ViewChild('cancelationRadio', { read: ElementRef }) cancelationRadio: ElementRef;
  public static fieldWith(key: string, label: string, confirmationText?: string, cancelationText?: string, valueChanged?: (any) => void) {
    return {
      key: key,
      type: 'switch',
      templateOptions: {
        label,
        confirmationText,
        cancelationText,
        valueChanged,
      },
    };
  }

  confirm() {
    if (this.to['valueChanged']) {
      this.to['valueChanged'](true);
    }
    this.formControl.setValue(true);
  }

  cancel() {
    if (this.to['valueChanged']) {
      this.to['valueChanged'](false);
    }
    this.formControl.setValue(false);
  }
}
