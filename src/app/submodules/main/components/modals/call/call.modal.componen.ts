import { Component, OnInit, Input, ViewChild } from '@angular/core';
import { Orders } from 'grapp-common-se';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { ModalBaseComponent } from '../modal.base.component';
import { BasicFormComponent } from 'ngx-3a';
import { OrdersService } from '../../../services/orders.service';
import * as moment from 'moment';
import { AgendaEventStatus } from 'grapp-common-se/dist/orders/order';

@Component( {
  selector: 'app-call-modal',
  templateUrl: './call.modal.component.html',
  // styleUrls: ['./order.modal.component.scss']
} )
export class CallModalComponent extends ModalBaseComponent implements OnInit {
  @ViewChild( 'form' ) basicForm: BasicFormComponent;

  // Inputs
  @Input() openCancelView: boolean;
  @Input() set _agendaEvent( agendaEvent: Orders.AgendaEvent ) {
    if ( agendaEvent ) {
      this.agendaEvent = { ...agendaEvent };
      this.agendaEvent.appointmentDate = moment( this.agendaEvent.appointmentDate ) as moment.Moment;

      this.copyObservation = this.agendaEvent.observations;
      this.currentStateCall = this.agendaEvent.state;
    }

    this.initComponentData();
  }

  agendaEvent: Orders.AgendaEvent;
  fields: FormlyFieldConfig[];
  successFields: FormlyFieldConfig[];

  copyObservation: string;
  currentStateCall: string;
  prevStateCall: string;

  // enum
  agendaEventStatus = AgendaEventStatus;

  constructor( private ordersSvc: OrdersService ) {
    super();

  }

  ngOnInit(): void {}

  initComponentData() {
    this.fields = this.ordersSvc.addInitialCallFields();
    this.successFields = this.ordersSvc.addCallFields();
    this.initModeView();
  }

  initModeView() {
    if ( this.openCancelView ) {
      this.agendaEvent.state = this.currentStateCall = AgendaEventStatus.CANCELED;
      this.agendaEvent.observations = '';
    }
  }


  handlerChangeModal( event: Orders.AgendaEvent ) {

    console.log( event );

    this.prevStateCall = this.currentStateCall;
    this.currentStateCall = event.state;

    if ( this.agendaEvent.date ) {// Edit

      if (
        this.currentStateCall !== AgendaEventStatus.SUCCESSFUL &&
        this.prevStateCall !== this.currentStateCall
      ) { // Swich to canceled or failed

        this.agendaEvent.observations = '';

      } else if (
        this.currentStateCall === AgendaEventStatus.SUCCESSFUL &&
        this.prevStateCall !== this.currentStateCall
      ) { // Successful selected

        this.agendaEvent.observations = this.copyObservation;
      }

    }
  }

  submit() {
    this.agendaEvent.date = new Date().getTime();
    this.basicForm.send();
  }
}
