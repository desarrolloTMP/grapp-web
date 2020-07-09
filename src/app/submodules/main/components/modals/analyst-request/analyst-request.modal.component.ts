import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import * as moment from 'moment';
import { timer } from 'rxjs';

// 3a Libraries
import { MicroServices, AuthenticationService } from 'ngx-3a';
import { Orders, Users } from 'grapp-common-se';

// Modals
import { ModalComponent } from '../modal.component';

// Services
import {
  OrdersService,
  RequestService,
  NotificationsService
} from '@services';
import { GeneralOrderStatus, RequestStatus, Order } from 'grapp-common-se/dist/orders';


// Constants
const ANIMATION_TIME = 200;

@Component( {
  selector: 'app-analyst-request-modal',
  templateUrl: './analyst-request.modal.component.html',
  styleUrls: [ './analyst-request.modal.component.scss' ],
} )
export class AnalystRequestModalComponent extends ModalComponent implements OnInit {
  @Input() set _request( request: Orders.Request ) {
    this.request = { ...request };
    this.isCompletedFlag = this.isCompleted( request );
  }

  @Output() canceled = new EventEmitter();
  @Output() confirmed = new EventEmitter();

  [ x: string ]: any;
  request: Orders.Request;
  executors: any;
  maxWidthInput = false;
  currentUser: Users.User;
  generalOrderStatus = GeneralOrderStatus;

  // flags
  loadingAction: boolean;
  isCompletedFlag: boolean;

  constructor(
    private requestSvc: RequestService,
    private microServices: MicroServices,
    private ordersSvc: OrdersService,
    private authSvc: AuthenticationService,
    private notificationSvc: NotificationsService,
  ) {
    super();

  }

  ngOnInit(): void {
    super.ngOnInit();
    this.listenUser();
  };

  listenUser() {
    this.observable( this.authSvc.user ).subscribe( user => {
      if ( user ) {
        this.currentUser = ( user as Users.User );
      }
    } );
  }

  openDetail( request: Orders.Request, index: number = -1 ) {
    this.event = this.ordersSvc.executeOrderEvent( request, index, $order => {
      let prevGeneralStatusOrder;

      $order.generalStatus = Number( $order.generalStatus );

      if ( index === -1 ) {
        prevGeneralStatusOrder = Number(request.order.generalStatus);
        request.order = $order;

        if (
          request.status === RequestStatus.DONE
          && (
            $order.generalStatus === NaN
            || $order.generalStatus === Orders.GeneralOrderStatus.INPROCESS
          )
        ) {
          request.status = RequestStatus.APROOVED;
        }

      } else {
        if ( request.suborders[ index ] ) {
          prevGeneralStatusOrder = Number(request.suborders[ index ].generalStatus);
          request.suborders[ index ] = $order;
        }
      }

      this.requestSvc.saveRequest( request ).subscribe( savedRequest => this.request = savedRequest );
      this.visible = false;
      timer( ANIMATION_TIME ).subscribe( () => ( this.event = undefined ) );

      this.isCompletedFlag = this.isCompleted( request );
      console.log( 'this.isCompletedFlag', this.isCompletedFlag );
    } );

    timer( ANIMATION_TIME ).subscribe( () => ( this.visible = true ) );
  }

/**
 *  Validates if the order changes from a different state from executed to executed
 */
  isOrderChangeToExecuted( prevGeneralStatusOrder: number, currentOrder: Orders.Order ) {

    if (
      prevGeneralStatusOrder !== Orders.GeneralOrderStatus.EXECUTED &&
      currentOrder.generalStatus === Orders.GeneralOrderStatus.EXECUTED
    ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Send mail executed orders
   */
  sendEmail( request: Orders.Request, order: Orders.Order) {

    this.notificationSvc
      .send(
        'Orden ejecutada',
        `
          ${this.currentUser.name }
          ha ejecutado exitosamente la orden
          ${ order.id } de la solicitud
          ${ request.id }.
          `,
        'ejmartinez@clinicadelnorte.org'
      )
      .subscribe( response => {
        if ( response.success ) {
          this.logger.log( 'Message sent' );
        } else {
          this.logger.error( response.message );
        }
      } );

  }

  /**
   * Handler delete request
   */
  openConfimationDelete( request: Orders.Request ) {
    this.loadingAction = true;

    this.event = this.requestSvc.deleteRequestEvent( request, $request => {

      this.visible = false;
      timer( ANIMATION_TIME ).subscribe( () => ( this.event = undefined ) );

      this.confirm( $request );
      this.loadingAction = false;
    } );

    timer( ANIMATION_TIME ).subscribe( () => ( this.visible = true ) );
  }

  /**
   * Handler restore request
   */
  undoDeletion( request: Orders.Request ) {
    const $request = {...request};

    $request.status = RequestStatus.APROOVED;

    this.confirm( $request );
  }



  buttonStyle( index: number = -1 ) {
    let preferredExecutors = 0;
    if ( index === -1 && this.request.order ) {
      if ( this.request.order.cups && this.request.order.cups.excecutor ) {
        for ( let i = 0; i < this.request.order.executors.length; i++ ) {
          if ( !this.request.order.cups.excecutor.includes( this.request.order.executors[ i ].id ) ) {
            preferredExecutors++;
          }
        }
      } else {
        if ( this.request.order.executors && this.request.order.executors.length > 0 ) {
          preferredExecutors++;
        }
      }
    } else if ( this.request.suborders[ index ] ) {
      if (
        this.request.suborders[ index ].cups
        && this.request.suborders[ index ].cups.excecutor
        && this.request.suborders[ index ].executors
      ) {
        for ( let i = 0; i < this.request.suborders[ index ].executors.length; i++ ) {
          if ( !this.request.suborders[ index ].cups.excecutor.includes( this.request.suborders[ index ].executors[ i ].id ) ) {
            preferredExecutors++;
          }
        }
      } else {
        if ( this.request.suborders[ index ].executors && this.request.suborders[ index ].executors.length > 0 ) {
          preferredExecutors++;
        }
      }
    }
    return preferredExecutors > 0 ? { 'background-color': '#f5416f', color: 'white' } : { 'background-color': 'white', color: '#535e73' };
  }

  simplifyID( id: string ) {
    return id.replace( /([A-Z])*([a-z])*/g, '' );
  }

  openExecutors( order: Orders.Order, index: number ) {
    this.event = this.requestSvc.addExecutorEvent( order, $order => {
      if ( index === -1 ) {
        this.request.order = $order;
      } else {
        this.request.suborders[ index ] = $order;
      }
      this.visible = false;
      timer( ANIMATION_TIME ).subscribe( () => ( this.event = undefined ) );
    } );
    timer( ANIMATION_TIME ).subscribe( () => ( this.visible = true ) );
  }

  cancel() {
    this.canceled.emit();
  }

  selectAsMain( index: number ) {
    const newOrder = this.request.suborders[ index ];
    this.request.suborders[ index ] = this.request.order;
    this.request.order = newOrder;
  }

  toogleAuthorization( request: Orders.Request ) {
    if ( request.order.isAuthorized ) {

      request.order.isAuthorized = false;

      if ( request.suborders && request.suborders.length ) {
        for ( let i = 0; i < request.suborders.length; i++ ) {
          request.suborders[ i ].isAuthorized = false;
        }
      }

    } else {

      request.order.isAuthorized = true;
      request.order.authorizationDate = moment().valueOf();

      if ( request.suborders && request.suborders.length ) {
        for ( let i = 0; i < request.suborders.length; i++ ) {
          request.suborders[ i ].isAuthorized = true;
          request.suborders[ i ].authorizationDate = moment().valueOf();
        }
      }

    }
  }

  orderDaysAvailableSinceCreation( request: Orders.Request, index: number ) {
    if ( index === -1 ) {
      this.maxWidthInput = request.order.expirationDate ? false : true;
      return request.order.expirationDate ? Math.abs( moment( request.createdAt ).diff( moment( request.order.expirationDate ), 'd' ) ) : '';
    } else {
      this.maxWidthInput = request.suborders[ index ].expirationDate ? false : true;
      return request.suborders[ index ].expirationDate
        ? Math.abs( moment( request.createdAt ).diff( moment( request.suborders[ index ].expirationDate ), 'd' ) )
        : '';
    }
  }

  /// this void returns a string with the diffecence betwen
  /// today and the expiration date ofthe order
  diffDays( request: Orders.Request, index: number ) {

    if ( this.orderDaysAvailableSinceCreation( request, index ) !== '' ) {
      if ( index === -1 ) {
        if ( request.order.expirationDate ) {
          const diffDays = moment( request.order.expirationDate ).diff( moment(), 'days' );
          return ' / ' + diffDays + ' días restantes';
        } else {
          const diffDays = moment( request.createdAt )
            .add( 5, 'days' )
            .diff( moment(), 'days' );
          return ' / ' + diffDays + ' días restantes';
        }
      } else {
        if ( request.suborders[ index ].expirationDate ) {
          const diffDays = moment( request.suborders[ index ].expirationDate ).diff( moment(), 'days' );
          return ' / ' + diffDays + ' días restantes';
        } else {
          const diffDays = moment( request.suborders[ index ].createdAt )
            .add( 5, 'days' )
            .diff( moment(), 'days' );
          return ' / ' + diffDays + ' días restantes';
        }
      }
    }
  }

  applyDaysAvailableChange( request: Orders.Request, days: string, index: number ) {
    if ( days ) {
      if ( index === -1 ) {
        request.order.expirationDate = moment( request.createdAt )
          .add( Number( days ), 'd' )
          .valueOf();
      } else {
        request.suborders[ index ].expirationDate = moment( request.createdAt )
          .add( Number( days ), 'd' )
          .valueOf();
      }
    }
  }

  markFocusedOrder( request: Orders.Request, index: number ) {
    if ( index === -1 ) {
      request.order[ 'markFocus' ] = !request.order.expirationDate;
    } else {
      request.suborders[ index ][ 'markFocus' ] = !request.suborders[ index ].expirationDate;
    }
  }

  completeRequest( request: Orders.Request, completar: boolean ) {

    if ( completar ) {
      request.status = Orders.RequestStatus.DONE;
    } else {
      request.status = RequestStatus.APROOVED;
    }
  }

  confirm( payload?: Orders.Request ) {
    this.loadingAction = true;
    this.confirmed.emit( payload );
  }

  isCompleted( request: Orders.Request ): boolean {

    if (
      request.order
      && (
        request.order.generalStatus === Orders.GeneralOrderStatus.EXECUTED
        || request.order.generalStatus === Orders.GeneralOrderStatus.CANCELED
      )
    ) {
      if ( request.suborders && request.suborders.length > 0 ) {

        const completed = request.suborders.map( subOrder => {

          const isAvalibleToFinish =
            subOrder.generalStatus === Orders.GeneralOrderStatus.EXECUTED
            || subOrder.generalStatus === Orders.GeneralOrderStatus.CANCELED;

          return isAvalibleToFinish;
        } )
          .reduce( ( acc, value ) => acc && value );

        if ( !completed ) {
          request.status = RequestStatus.APROOVED;
        }
        return completed;

      } else {
        return true;
      }
    } else {
      if ( request.order ) {
      }
      return false;
    }
  }

  orderStatus( order: Orders.Order ) {
    switch ( order.generalStatus ) {
      case Orders.GeneralOrderStatus.EXECUTED:
        return 'Ejecutada';
      case Orders.GeneralOrderStatus.INPROCESS:
        return 'En proceso';
      case Orders.GeneralOrderStatus.CANCELED:
        return 'Cancelada';
      default:
        return 'Sin asignar';
    }
  }

  downloadPDF( order: Orders.Order , orden: Orders.Order ) {
    const jsonObj: any = {
      order: {
        expirationDate: order.expirationDate ? moment( order.expirationDate ).format( 'DD/MMMM/YYYY' ) : 'N/A',
        cups: order.cups.codeDescription ? order.cups.codeDescription : 'N/A',
        createdAt: order.createdAt ? moment( order.createdAt ).format( 'DD/MMMM/YYYY' ) : 'N/A',
        observations: order.observations || this.request.order.observations || 'N/A',
        ammount: order.ammount ? order.ammount : 'N/A',
        cie10: order.cie10 ? order.cie10.codeDescription : orden.cie10.codeDescription,
      },
      req: {
        requestNumber: this.request.requestNumber || moment( this.request.createdAt ).format( 'YYYYMMDD' ),
        patient: {
          name: this.request.patient.name ? this.request.patient.name : 'N/A',
          document: this.request.patient.document ? this.request.patient.document : 'N/A',
          phone: this.request.patient.phone ? '(+57) ' + this.request.patient.phone : 'N/A',
          account: this.request.patient.account ? '#' + this.request.patient.account : 'N/A',
          address:
            this.request.patient.address.full && this.request.patient.address.city
              ? this.request.patient.address.full + ', ' + this.request.patient.address.city
              : 'N/A',
          active: this.request.patient.active ? 'Activo' : 'Inactivo',
          createdAt: this.request.patient.createdAt ? moment( this.request.patient.createdAt ).format( 'DD/MMMM/YYYY' ) : 'N/A',
          email: this.request.patient.email ? this.request.patient.email : 'N/A',
        },
      },
      doctor: {
        doctor: this.request.verifierDoctor.name ? this.request.verifierDoctor.name : 'N/A',
        speciality: this.request.verifierDoctor.speciality ? this.request.verifierDoctor.speciality : 'N/A',
      },
    };

    this.microServices
      .post<any, ArrayBuffer>(
        'report/download',
        {
          attachment: { filename: 'ORDER.pug', path: 'temp/order.pug' },
          params: jsonObj,
        },
        undefined,
        undefined,
        { headers: {}, responseType: 'arraybuffer' }
      )
      .subscribe( result => {

        if ( result ) {
          const FileSaver = require( 'file-saver' );
          const blob = new Blob( [ result ], { type: 'application/pdf' } );
          FileSaver.saveAs( blob, `${ this.request.patient.document }-${ moment( this.request.createdAt ).format( 'DD/MM/YYYY' ) }.pdf` );
        }
      } );
  }

  handlerCandeledDeleteRequest( event: any ) {
    this.loadingAction = false;
    this.handleAction( event.cancelation );
  }
}
