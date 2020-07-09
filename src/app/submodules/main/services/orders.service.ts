import { Injectable } from '@angular/core';
import { FormService, SelectOption } from 'ngx-3a';
import { Database } from '3a-common';
import { Orders } from 'grapp-common-se';
import { ModalEvent, Modals } from 'src/app/models/navigation';
import { FormlyFieldConfig } from '@ngx-formly/core';
import * as moment from 'moment';

// Moks
import { HoraCitaMock } from '../mocks/hora-cita.mock';

enum OrderCancelationReason {
  REJECTED = 'El paciente rechazó la cita',
  DIED = 'El paciente falleció',
  CALLS = 'No fue posible contactar al paciente',
  OTHER = 'Otro',
}

@Injectable()
export class OrdersService {
  constructor( private db: Database.DatabaseService, private formSvc: FormService ) { }

  private orderCancelationOptions(): SelectOption[] {
    return Object.values( OrderCancelationReason ).map( type => ( { label: type, value: type } ) );
  }

  /**
   * Create a modal event for existing order to be executed
   * @param order The order to be executed
   * @param callback A callback with the saved data
   */
  executeOrderEvent( request: Orders.Request, orderIndex: number, callback: ( r: Orders.Order ) => void ): ModalEvent {
    return {
      type: Modals.ORDER,
      payload: { request: request, index: orderIndex },
      confirmation: {
        text: 'Guardar',
        callback: ( $order: Orders.Order ) => {
          callback( $order );
          return true;
        },
      },
    };
  }

  /**
   * The fields needed to create or set general  order's state
   */
  addStatusFields( status: Orders.GeneralOrderStatus ): FormlyFieldConfig[] {
    return [
      this.formSvc.selectInput(
        'generalStatus',
        'Estado',
        [
          { label: 'En Proceso', value: Orders.GeneralOrderStatus.INPROCESS },
          { label: 'Ejecutada', value: Orders.GeneralOrderStatus.EXECUTED },
          { label: 'Cancelada', value: Orders.GeneralOrderStatus.CANCELED },
        ],
        true,
        'select2-1'
      ),
      ...( Number( status ) === Orders.GeneralOrderStatus.CANCELED
        ? [
          this.formSvc.selectInput( 'cancelationReason', 'Motivo de cancelación', this.orderCancelationOptions(), true ),
          this.formSvc.textareaInput( 'cancelationDescription', 'Observaciones de cancelación', '', true ),
        ]
        : [] ),
    ];
  }

  /**
   * The fields needed to create or set general  order's state
   */
  addCommentsFields( order: Orders.Order ): FormlyFieldConfig[] {
    if ( order && order.executors ) {
      const op = order.executors.map( exec => {
        return { label: exec.name, value: exec.id };
      } );
      op.push( { label: 'Todos los ejecutores', value: 'all' } );
      return [
        this.formSvc.selectInput( 'destinataryID', 'Ejecutor', op, true, 'select2-1' ),
        this.formSvc.textInput( 'content', '', 'Escribe aquí...', true, 'input-cus' ),
      ];
    } else {
      const op = [ { label: 'Todos los ejecutores', value: 'all' } ];
      return [
        this.formSvc.selectInput( 'destinataryID', 'Ejecutor', op, true, 'select2-1' ),
        this.formSvc.textInput( 'content', '', 'Escribe aquí...', true, 'input-cus' ),
      ];
    }
  }

  /**
   * Create and return a modal event for calls modal
   */
  addOrderCallsEvent( agendaRequest: Orders.AgendaEvent, callback?: ( agendaRequest: Orders.AgendaEvent ) => void ): ModalEvent {
    return {
      type: Modals.CALL,
      payload: agendaRequest,
      confirmation: {
        text: '',
        callback: ( $agendaRequest: Orders.AgendaEvent ) => {
          if ( callback ) {
            callback( $agendaRequest );
          }
          return true;
        },
      },
    };
  }

  requestTypeOptions(): SelectOption[] {
    return [
      {
        label: 'Exitosa',
        value: Orders.AgendaEventStatus.SUCCESSFUL,
      },
      {
        label: 'Cancelada',
        value: Orders.AgendaEventStatus.CANCELED,
      },
      {
        label: 'Fallida',
        value: Orders.AgendaEventStatus.FAILED,
      },
    ];
  }

  addCallFields(): FormlyFieldConfig[] {
    return [
      this.formSvc.selectInput( 'state', 'Tipo de solicitud', this.requestTypeOptions(), true ),
      this.formSvc.dateInput( 'appointmentDate', 'Fecha de cita', true, moment() ),
      this.formSvc.selectInput(
        'appointmentTime',
        'Hora de la cita',
        HoraCitaMock,
        true
      ),
      this.formSvc.textInput( 'appointmentAddress', 'Dirección cita', '', true ),
      this.formSvc.textInput( 'answeredBy.name', 'Nombre de quien contesta', '', false ),
      this.formSvc.textInput( 'answeredBy.relation', 'Parentezco con el paciente', '', false ),
      this.formSvc.textInput( 'observations', 'Observaciones/Preparación', '', false ),
    ];
  }

  addInitialCallFields(): FormlyFieldConfig[] {
    return [
      this.formSvc.selectInput( 'state', 'Tipo de solicitud', this.requestTypeOptions(), true ),
      this.formSvc.textInput( 'observations', 'Justificación', '', true ),
    ];
  }

  addDeleteOrderFields(): FormlyFieldConfig[] {
    return [
      this.formSvc.textareaInput( 'justification', 'Justificación', '', true ),
    ];
  }
}
