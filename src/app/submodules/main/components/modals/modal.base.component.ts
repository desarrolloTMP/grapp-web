import { Input, Output, EventEmitter, OnInit } from '@angular/core';
import { BaseComponent } from 'src/app/components/base/base.component';
import { MainService } from '../../services/main.service';

export class ModalBaseComponent extends BaseComponent implements OnInit {
  // @Input() event: ModalEvent;

  @Output() canceled = new EventEmitter();
  @Output() confirmed = new EventEmitter();

  constructor(protected mainSvc?: MainService) {
    super();
  }

  ngOnInit() {
    super.ngOnInit();
  }

  cancel() {
    this.canceled.emit();
  }

  confirm( payload?: any ) {
    this.confirmed.emit(payload);
  }
}
