import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ChangeDetectionStrategy,
  Inject,
  PLATFORM_ID,
  ChangeDetectorRef,
  ElementRef,
} from '@angular/core';
import { ModalBaseComponent } from '../modal.base.component';
import { MainService } from '../../../services/main.service';
import { Orders } from 'grapp-common-se';
import * as moment from 'moment';
import { OrdersService } from '../../../services/orders.service';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { ModalComponent } from '../modal.component';
import { OrderModalPayload } from '../../../models/modal';
import { timer, Observable, of } from 'rxjs';
import { RequestService } from '../../../services/request.service';
import { BasicFormComponent, AuthenticationService, MicroServices } from 'ngx-3a';
import { User } from '3a-common/dist/authentication';
import { PatientService } from '../../../services/patient.service';
import { ImageService } from 'src/app/services/image.service';
import { switchMap, map } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';
import { IDType, UserType } from 'grapp-common-se/dist/users';
import { Order, GeneralOrderStatus, AgendaEventStatus } from 'grapp-common-se/dist/orders';
import { Database } from '3a-common';



const ANIMATION_TIME = 200;
@Component( {
  selector: 'app-order-modal',
  templateUrl: './order.modal.component.html',
  styleUrls: [ './order.modal.component.scss' ],
  changeDetection: ChangeDetectionStrategy.OnPush,
} )
export class OrderModalComponent extends ModalComponent implements OnInit {// Outputs
  @Output() canceled = new EventEmitter();
  @Output() confirmed = new EventEmitter();

  // Imputs
  @Input() set _order( modal: OrderModalPayload ) {

    this.req = JSON.parse( JSON.stringify( modal.request ) );

    if ( modal.index === -1 ) {
      this.order = JSON.parse( JSON.stringify( this.req.order ) );
    } else {

      if(JSON.parse( JSON.stringify( this.req.suborders ) )){
        if(Object.keys(this.req.suborders[modal.index]).includes('observations')){

          this.order = JSON.parse(JSON.stringify(this.req.suborders[modal.index]))
        }else{
          this.req.suborders[modal.index].observations = this.req.order.observations;
          //JSON.parse(JSON.stringify(this.req.suborders[modal.index])).observations = this.req.order.observations;
          this.order = JSON.parse(JSON.stringify(this.req.suborders[modal.index]))
        }
        JSON.parse(JSON.stringify(Object.keys(this.req.suborders[modal.index]).includes('observations') ? this.req.suborders[modal.index] :this.req.suborders[modal.index].observations ));
      }else{
        undefined
      }

      // this.order = JSON.parse( JSON.stringify( this.req.suborders ) ) ?
      //   JSON.parse( JSON.stringify( this.req.suborders[ modal.index ] ) ) :
      //   undefined;
    }
    if ( !this.order.comments ) {
      this.order.comments = [];
    }
    this.oldStatus = this.order.generalStatus ? Number( this.order.generalStatus ) : null;

    // Init button add call
    this.checkCallStatus();

  }

  // ViewChilds
  @ViewChild( 'form' ) basicForm: BasicFormComponent;
  @ViewChild( 'myInputFile' ) myInputVariable: ElementRef;
  selectedPatient:any;

  agendaEventStatus = AgendaEventStatus;
  req: Orders.Request;
  order: Orders.Order;
  user: any;

  showPatientDetails = false;
  selectedTab = 0;
  index = -1;

  fields: FormlyFieldConfig[];
  fieldsMessage: FormlyFieldConfig[];
  currentMessage: Orders.OrderComment = {};

  downloadBtn = { enable: true, title: 'Descargar PDF' };
  uploading = false;

  fileData: any;
  oldStatus: any;

  //Flags
  public isAllowedAddCall: boolean;

  constructor(
    private patientSvc: PatientService,
    private orderSvc: OrdersService,
    private requestSvc: RequestService,
    private authenticationSvc: AuthenticationService,
    private imageSvc: ImageService,
    private microServices: MicroServices,
    private sanitizer: DomSanitizer,
    @Inject( PLATFORM_ID ) private platformId: Object,
    private changeDetector: ChangeDetectorRef
  ) {
    super();

    this.isAllowedAddCall = true;
  }

  ngOnInit(): void {
    let query = [{key: 'document',value: this.req.patient.document,relation: Database.DatabaseQueryRelation.Equal}]

    this.patientSvc.getPatientsByQueries(query).subscribe(patient => {
      if (patient) {
        this.selectedPatient = patient[0]
        this.changeDetector.detectChanges()
      }
    });
    this.authenticationSvc.user.subscribe( user => {
      if ( user ) {
        this.user = user;
      }
    } );
    this.stateFields();
    this.commentFields();
  }

  /**
   * Generics Methods
   */

  /** check if there are successful calls to disable the add calls button */
  private checkCallStatus() {
    if ( this.order.agenda ) {
      this.isAllowedAddCall = !this.order.agenda.some( call => call.state === AgendaEventStatus.SUCCESSFUL );
    }
  }

  /// this void returns a string with the diffecence betwen
  /// today and the expiration date ofthe order
  diffDays( date ): number {
    if ( date ) {
      const diffDays = moment( moment( date ).toDate() ).diff( Date.now(), 'days' );
      return diffDays;
    }
  }

  isState( state: Orders.OrderStatus ) {
    if ( this.order && Number( this.order.status ) === state ) {
      return true;
    } else {
      return false;
    }
  }

  isGeneralState( state: Orders.GeneralOrderStatus ) {
    if ( this.order && Number( this.order.generalStatus ) === state ) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Form fields for a specific sub order
   * @param index The sub order index for creating the fields
   */
  stateFields() {
    this.fields = this.orderSvc.addStatusFields( this.order.generalStatus );
  }

  validateStatusChanged( event: any ) {
    event.generalStatus = Number( event.generalStatus );
    if ( this.oldStatus !== event.generalStatus ) {
      this.oldStatus = event.generalStatus;
      this.stateFields();
    }
  }

  commentFields() {
    this.fieldsMessage = this.orderSvc.addCommentsFields( this.order );
  }

  callModal( index?: number ) {
    this.store.indexCallSelected = index;

    if (
      !this.isGeneralState( GeneralOrderStatus.CANCELED )
    ) {

      if ( index !== undefined ) {// Edit

        if ( this.order.agenda[ index ].state === AgendaEventStatus.SUCCESSFUL) {
          this.openModal( this.order.agenda[ index ] );
        }

      } else {// Add call

        this.openModal();
      }
    }

  }

  openModal( agendaRequest?: Orders.AgendaEvent ) {
    //console.log('okok x3', this.req.imported , this.order.status, Orders.OrderStatus.APROOVED);
    if ( agendaRequest ) {
      //this.req.imported || 
      if ( this.order.status === Orders.OrderStatus.APROOVED || this.order.status === Orders.OrderStatus.SCHEDULED) {

        //console.log('debe abrir x2')
        this.visible = true;

        this.event = this.orderSvc.addOrderCallsEvent(
          agendaRequest,
          this.saveCallRegister
        );

        timer( ANIMATION_TIME ).subscribe( () => ( this.visible = true ) );
      }

    } else {
      this.visible = true;

      this.event = this.orderSvc.addOrderCallsEvent(
        { state: Orders.AgendaEventStatus.SUCCESSFUL, answeredBy: { name: '', relation: '' } },
        this.saveCallRegister
      );

      timer( ANIMATION_TIME ).subscribe( () => ( this.visible = true ) );
    }
  }

  private saveCallRegister = ( agendaRequest: Orders.AgendaEvent ) => {

    if ( agendaRequest.appointmentDate !== undefined ) {
      agendaRequest.appointmentDate = agendaRequest.appointmentDate.valueOf();
      this.order.status = Orders.OrderStatus.SCHEDULED;
      this.order.appointmentAddress = agendaRequest.appointmentAddress;
      this.order.appointmentDate = agendaRequest.appointmentDate;
      this.order.appointmentTime = agendaRequest.appointmentTime;
    }

    if ( this.order.agenda ) {

      if ( this.order.agenda.length && !this.order.appointmentDate ) {
        const d = Math.abs( moment().diff( moment( this.order.agenda[ this.order.agenda.length - 1 ].date ), 'd' ) );
        if ( this.order.agenda.length > 1 ) {
          if ( d >= 7 ) {
            this.updateTraceability( agendaRequest );
            this.order.agenda.push( agendaRequest );
          }
        } else if ( this.order.agenda.length > 0 ) {
          if ( d >= 1 ) {
            this.updateTraceability( agendaRequest );
            this.order.agenda.push( agendaRequest );
          }
        }
      } else {
        this.updateTraceability( agendaRequest );

        if (this.store.indexCallSelected !== undefined) {
          this.order.agenda[ this.store.indexCallSelected ] = agendaRequest;
          this.store.indexCallSelected = undefined;
        } else {
          this.order.agenda.push( agendaRequest );
        }

      }
    } else {

      this.order.agenda = [];
      this.updateTraceability( agendaRequest );
      this.order.agenda.push( agendaRequest );
    }

    this.changeDetector.detectChanges();
    this.checkCallStatus();
    this.visible = false;
    timer( ANIMATION_TIME ).subscribe( () => ( this.event = undefined ) );

  };

  updateTraceability( agenda: Orders.AgendaEvent ) {
    const message: Orders.OrderComment = {};

    message.date = moment().valueOf();
    message.sender = this.user;
    message.content = this.createMessageTraceability( agenda );
    message.destinatary = {
      name: 'Todos los ejecutores',
      idType: IDType.CC,
      userType: UserType.EXECUTOR,
      document: '*',
      address: { city: '*', country: '*', full: '*' },
    };
    message.observations = agenda.observations;

    if ( this.order.comments ) {
      this.order.comments.unshift( message );
    } else {
      this.order.comments = [];
      this.order.comments.push( message );
    }
    this.changeDetector.detectChanges();
  }

  /**
   * Build the message for the traceability card between registering and editing a call when it already exists.
   *
   * @param agenda New agenda object with which traceability is to be registered
   * @returns message with the word was registered or edited
   */
  private createMessageTraceability( agenda: Orders.AgendaEvent ) {
    if ( this.store.indexCallSelected && agenda.state === AgendaEventStatus.SUCCESSFUL ) {
      return 'El usuario ' + ( this.user.name ? this.user.name : '' ) + ' editó una llamada ' + agenda.state;
    } else {
      return 'El usuario ' + ( this.user.name ? this.user.name : '' ) + ' registró una llamada ' + agenda.state;
    }
  }

  openExecutors( order: Orders.Order ) {
    this.visible = true;
    this.event = this.requestSvc.addExecutorEvent( order, $order => {
      this.order = $order;
      this.visible = false;
      this.commentFields();
      this.changeDetector.detectChanges();
      this.event = undefined;
    } );
  }


  /**
   * ACCIONS
   */

  onCancelAppointment( event: Event, i ) {
    event.stopPropagation();
    this.store.openCallModalCanceled = true;
    this.store.indexCallSelected = i;

    this.openModal( this.order.agenda[ i ] );
  }

  cancel() {
    this.canceled.emit();
  }

  confirm( payload?: any ) {
    this.confirmed.emit( payload );
  }


  canCall( order: Orders.Order ) {
    if ( order.agenda && order.agenda.length > 1 ) {
      moment( order.agenda[ order.agenda.length - 1 ].date );
    }
  }

  verifyMessage( message: Orders.OrderComment ): Boolean {
    if ( message[ 'destinataryID' ] === 'all' ) {
      message.destinatary = {
        name: 'Todos los ejecutores',
        idType: IDType.CC,
        userType: UserType.EXECUTOR,
        document: '*',
        address: { city: '*', country: '*', full: '*' },
      };
    } else {
      message.destinatary = this.order.executors.find( e => e.id === message[ 'destinataryID' ] );
    }
    message.date = new Date().getTime();
    message.sender = this.user;
    this.currentMessage = {};
    if ( this.fileData ) {
      this.imageSvc.uploadFile( this.fileData ).subscribe( savedFile => {
        message.file = savedFile;
        if ( this.order.comments ) {
          this.order.comments.push( message );
        } else {
          this.order.comments = [];
          this.order.comments.push( message );
        }
        this.resetFile();
        this.changeDetector.detectChanges();
        return false;
      } );
    } else {
      if ( this.order.comments ) {
        this.order.comments.push( message );
      } else {
        this.order.comments = [];
        this.order.comments.push( message );
      }
      this.changeDetector.detectChanges();
      return false;
    }
  }

  fileChangeEvent( files: File[] ) {
    if ( files && files[ 0 ] ) {
      this.fileData = files[ 0 ];
      this.changeDetector.detectChanges();
    }
  }

  resetFile() {
    this.fileData = undefined;
    this.myInputVariable.nativeElement.value = '';
  }

  requestFile( id: any ): Observable<{ image: string; }> {
    return this.imageSvc.downloadFile( id ).pipe(
      map( file => ( {
        image: `url(data:${ file.path.indexOf( 'pdf' ) > -1 ? 'application/pdf' : 'image/png' };base64,${ file.data })`,
        data: `data:${ file.path.indexOf( 'pdf' ) > -1 ? 'application/pdf' : 'image/png' };base64,${ file.data }`,
        name: file.name,
      } ) )
    );
  }

  sanitize( style: string ) {
    return this.sanitizer.bypassSecurityTrustUrl( style );
  }

  /**
   * Open a file in a new window
   * @param data The base64 data of the file
   */
  openFile( data: string ) {
    if ( isPlatformBrowser( this.platformId ) ) {
      const win = window.open();
      win.document.write(
        '<iframe src="' +
        data +
        '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>'
      );
    }
  }

  getInitials( name: string ) {
    return name
      .split( ' ' )
      .map( elm => {
        return elm.substring( 0, 1 );
      } )
      .reduce( ( p, c, index ) => {
        if ( index < 2 ) {
          return p + c;
        } else {
          return p;
        }
      } );
  }

  downloadPDF() {
    this.downloadBtn.enable = false;
    this.downloadBtn.title = 'Descargando...';
    
    const jsonObj: any = {
      order: {
        expirationDate: this.order.expirationDate ? moment( this.order.expirationDate ).format( 'DD/MMMM/YYYY' ) : 'N/A',
        cups: this.order.cups.codeDescription ? this.order.cups.codeDescription : 'N/A',
        createdAt: this.order.createdAt ? moment( this.order.createdAt ).format( 'DD/MMMM/YYYY' ) : 'N/A',
        observations: this.order.observations || this.req.order.observations || 'N/A',
        ammount: this.order.ammount ? this.order.ammount : 'N/A',
        cie10: this.order.cie10.codeDescription ? this.order.cie10.codeDescription : 'N/A',
      },
      req: {
        requestNumber: this.req.requestNumber || moment( this.req.createdAt ).format( 'YYYYMMDD' ),
        patient: {
          name: this.req.patient.name ? this.req.patient.name : 'N/A',
          document: this.req.patient.document ? this.req.patient.document : 'N/A',
          phone: this.req.patient.phone ? '(+57) ' + this.req.patient.phone : 'N/A',
          account: this.req.patient.account ? '#' + this.req.patient.account : 'N/A',
          address:
            this.req.patient.address.full && this.req.patient.address.city
              ? this.req.patient.address.full + ', ' + this.req.patient.address.city
              : 'N/A',
          active: this.req.patient.active ? 'Activo' : 'Inactivo',
          createdAt: this.req.patient.createdAt ? moment( this.req.patient.createdAt ).format( 'DD/MMMM/YYYY' ) : 'N/A',
          email: this.req.patient.email ? this.req.patient.email : 'N/A',
        },
      },
      doctor: {
        doctor: this.req.verifierDoctor.name ? this.req.verifierDoctor.name : 'N/A',
        speciality: this.req.verifierDoctor.speciality ? this.req.verifierDoctor.speciality : 'N/A',
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
          FileSaver.saveAs( blob, `${ this.req.patient.document }-${ moment( this.req.createdAt ).format( 'DD/MM/YYYY' ) }.pdf` );
        }
        this.downloadBtn.enable = true;
        this.downloadBtn.title = 'Descargar PDF';
      } );
  }
}
