import {
  Component,
  OnInit,
  Input,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  OnDestroy,
  QueryList,
  ViewChildren
} from '@angular/core';
import { Observable, Subscription, fromEvent, Subject } from 'rxjs';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { map, tap, take, takeUntil } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';

// libs 3a
import { FormlyFieldConfig } from '@ngx-formly/core';
import { User } from '3a-common/dist/authentication';
import { Orders } from 'grapp-common-se';
import { Database } from '3a-common';

// Services
import { AuthorizationService } from '../../../services/authorization.service';
import { CodablesService } from '../../../services/codables.service';
import { PatientService } from '../../../services/patient.service';
import { ImageService } from 'src/app/services/image.service';
import { MainService } from '../../../services/main.service';

// Components
import { ModalBaseComponent } from '../modal.base.component';
import { BasicFormComponent, AuthenticationService } from 'ngx-3a';

@Component( {
  selector: 'app-authorization-modal',
  templateUrl: './authorization.modal.component.html',
  styleUrls: [ './authorization.modal.component.scss' ],
  changeDetection: ChangeDetectionStrategy.OnPush,
} )
export class AuthorizationModalComponent extends ModalBaseComponent implements OnInit, OnDestroy {
  @ViewChild( 'form' ) form: BasicFormComponent;
  @ViewChildren( BasicFormComponent ) forms: QueryList<BasicFormComponent>;

  @Input() set _request( request: Orders.Request ) {
    if ( request ) {
      this.request = JSON.parse( JSON.stringify( request ) );
      this.initFields();
    }
  }

  selectedPatient: any;
  request: Orders.Request;
  user: User;
  _currentImage = 0;
  authorizationFields: FormlyFieldConfig[];
  authorizationCancelationFields: FormlyFieldConfig[];
  _subOrderFields: { [ _: number ]: FormlyFieldConfig[]; } = {};
  _contextMap: { [ _: string ]: { image: string; name: string; data: string; }; } = {};
  _contextMap$: { [ _: string ]: Subscription; } = {};

  // Generics
  private textInput: string;
  formsList: BasicFormComponent[] = [];

  // Flags
  isShowAsDocumment: boolean;

  // UI helpers
  showPatientDetails = true;
  currentCIE10 = '';

  private destroy$ = new Subject<void>();

  constructor(
    el: ElementRef,
    main: MainService,
    private patientSvc: PatientService,
    private sanitizer: DomSanitizer,
    private imageSvc: ImageService,
    private changeDetector: ChangeDetectorRef,
    private authorizationSvc: AuthorizationService,
    private authenticationSvc: AuthenticationService,
    private codableSvc: CodablesService,
    @Inject( PLATFORM_ID ) private platformId: Object,
    @Inject( DOCUMENT ) private document: Document
  ) {
    super( main );

    this.initObsevblesCupsSubForm( el );
  }

  ngOnInit(): void {
    this.authenticationSvc.user.subscribe( user => {
      if ( user ) {
        this.user = user;
      }
    } );
    const query = [ { key: 'document', value: this.request.patient.document, relation: Database.DatabaseQueryRelation.Equal } ];

    this.patientSvc.getPatientsByQueries( query ).subscribe( patient => {
      if ( patient ) {
        this.selectedPatient = patient[ 0 ];
        this.changeDetector.detectChanges();
      }
    } );
  }

  initFields() {

    this.authorizationFields = this.authorizationSvc.requestAuthorizationFields( isAuthorized => {
      console.log( isAuthorized );
      this.request.order.isAuthorized = isAuthorized;
      this.request.order.status = Orders.OrderStatus.APROOVED;
      this.request.order.cups.codeDescription = '';
      this.request.order.cie10.codeDescription = '';
      this.request.order.ammount = null;
      this.request.order.estimatedTime = null;
      this.request.order.observations = '';
      this.request.suborders = [];
      this.refresh();
    } );

    this.authorizationCancelationFields = this.authorizationSvc.requestAuthorizationCancelationFields( isAuthorized => {
      console.log( 'short', isAuthorized );
      this.form._form.removeControl( 'noAuthObservations' );

      this.request.order.isAuthorized = isAuthorized;
      this.request.order.status = undefined;
      this.refresh();
    } );
  }

  disabled( form ) {
    const noAuthObservationsControl = form._form.get( 'noAuthObservations' );
    let isDisabled: boolean;

    this.formsList.forEach( formGroup => {
      isDisabled = isDisabled || formGroup._form.status === 'INVALID';
    } );

    if ( noAuthObservationsControl ) {
      isDisabled = noAuthObservationsControl.status === 'INVALID';
    }

    return isDisabled;
  }

  /**
   * Bypass security
   * @param style Base64 string img
   */
  sanitize( style: string, preview?: boolean ) {

    if ( style && style.includes( 'application/pdf' ) ) {
      return this.sanitizer.bypassSecurityTrustStyle( 'url(/assets/document.png)' );
    } else if ( style.includes( 'image/tif' ) || style.includes( 'image/tiff' ) ) {
      return this.sanitizer.bypassSecurityTrustStyle( 'url(/assets/document-tiff.png)' );
    }

    return this.sanitizer.bypassSecurityTrustStyle( style );
  }

  /**
   * Bypass security
   * @param style Base64 string img
   */
  sanitizePreview( style: string ) {

    if ( style && style.includes( 'application/pdf' ) ) {

      this.isShowAsDocumment = true;
      return this.sanitizer.bypassSecurityTrustStyle( 'url(/assets/document.png)' );

    } else if ( style.includes( 'image/tif' ) || style.includes( 'image/tiff' ) ) {

      this.isShowAsDocumment = true;
      return this.sanitizer.bypassSecurityTrustStyle( 'url(/assets/document-tiff.png)' );
    }

    this.isShowAsDocumment = false;
    return this.sanitizer.bypassSecurityTrustStyle( style );
  }

  setClassPreviewImage() {
    this.isShowAsDocumment = true;
  }

  /**
   * Get base64 data file by id
   * @param id File Id
   */
  requestOrderContext( id: any ): { image: string; name: string; data: string; } {

    if ( !this._contextMap[ id ] ) {
      if ( !this._contextMap$[ id ] ) {
        this._contextMap$[ id ] = this.imageSvc
          .downloadFile( id )
          .pipe(
            map( file => {

              if ( file && file[ 'resourceID' ] === '' ) {
                file = { _id: '', data: '', name: 'Archivo no encontrado', path: '' };
              } else if ( file && file[ 'resourceID' ] !== '' ) {
                this.showPatientDetails = this.showPatientDetails && false;
              }

              return {

                image: file
                  ? `url(data:${ file.path.indexOf( 'pdf' ) > -1
                    ? 'application/pdf'
                    : `image/${ file.name.split( '.' )[ 1 ] }` };base64,${ file.data })`
                  : null,
                data: file
                  ? `data:${ file.path.indexOf( 'pdf' ) > -1
                    ? 'application/pdf'
                    : `image/${ file.name.split( '.' )[ 1 ] }` };base64,${ file.data }`
                  : null,
                name: file ? file.name : null,
              };
            } )
          )
          .subscribe( context => {
            this._contextMap[ id ] = context;
            this.changeDetector.detectChanges();
          } );
      }

      return this._contextMap[ id ];
    }

    return this._contextMap[ id ];
  }

  simplifyID( id: string ) {
    return id.replace( /([A-Z])*([a-z])*/g, '' );
  }

  refresh() {
    this.changeDetector.detectChanges();
  }

  /**
   * Adds a sub order to the current request
   */
  addSubOrder() {
    if ( !this.request.suborders ) {
      this.request.suborders = [];
    }
    this.request.suborders.push( {
      id: `${ this.request.suborders.length + 1 }`,
      createdAt: new Date().getTime(),
      cups: {
        codeDescription: '',
      },
      estimatedTime: 30,
      name: `Orden auxiliar ${ this.request.suborders.length + 1 }`,
      isPrerequisite: true,
      status: Orders.OrderStatus.APROOVED,
      comments: [],
      authorizationDate: new Date().getTime(),
      generalStatus: Orders.GeneralOrderStatus.INPROCESS,
    } );


    this.changeDetector.detectChanges();
    this.formsList = this.forms.toArray();

  }


  currentImage( index ) {
    this._currentImage = index;
  }

  /**
   * Form fields for a specific sub order
   * @param index The sub order index for creating the fields
   */
  subOrderFields( index: number ): FormlyFieldConfig[] {
    if ( !this._subOrderFields[ index ] ) {
      this._subOrderFields[ index ] = this.authorizationSvc.addSubOrderFields();
    }
    return this._subOrderFields[ index ];
  }

  /**
   * Remove a sub-order from the request
   * @param index The index of the sub-order to be removed
   */
  removeSubOrder( index: number ) {
    this.request.suborders.splice( index, 1 );
  }

  /**
   * Open a file in a new window
   * @param data The base64 data of the file
   */
  openOrder( data: string, event?: Event, context?: any ) {
    const formatFile = context.name.split( '.' )[ 1 ];

    if ( isPlatformBrowser( this.platformId ) ) {
      const win = window.open();
      win.document.write(

        formatFile !== 'pdf' && formatFile !== 'tif' && formatFile !== 'tiff'
          ? this.templateIframePreviewFile( data )
          : this.templateIframePreviewFile( this.base64DataToBlob( data ) )
      );
    }
  }

  /**
   * Build the iframe template according to the type of image or pdf file
   * @param data Base64 data img or pdf url
   */
  private templateIframePreviewFile( data: string ) {
    return `<iframe src=" ${ data } "
            frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;"
            allowfullscreen></iframe>`;
  }

  /**
   * Transform data in base64 to blob
   * @param str Base64 data
   */
  private base64DataToBlob( str: string ) {
    // extract content type and base64 payload from original string
    const pos = str.indexOf( ';base64,' );
    const type = str.substring( 5, pos );
    const b64 = str.substr( pos + 8 );

    // decode base64
    const imageContent = atob( b64 );

    // create an ArrayBuffer and a view (as unsigned 8-bit)
    const buffer = new ArrayBuffer( imageContent.length );
    const view = new Uint8Array( buffer );

    // fill the view, using the decoded base64
    for ( let n = 0; n < imageContent.length; n++ ) {
      view[ n ] = imageContent.charCodeAt( n );
    }

    // convert ArrayBuffer to Blob
    const blob = new Blob( [ buffer ], { type: type } );

    // Get URL Blob
    const objectURL = URL.createObjectURL( blob );

    return objectURL;
  }

  verifyFormChange( event ) {

    // Observe CIE10 changes
    if ( event.cie10.codeDescription !== this.currentCIE10 ) {

      this.currentCIE10 = event.cie10.codeDescription;
      this.codableSvc.isCIE10OrphanDesease( this.currentCIE10 ).subscribe( b => {

        event.isOrphan = b;
        if ( b ) {

          this.codableSvc.getEHRWithCIE10( this.currentCIE10 ).subscribe( name => {
            this.request.order[ 'orphanDiseaseName' ] = name;
          } );
        }
      } );
    }

    this.formsList = this.forms.toArray();
    console.log( this.formsList );
  }

  validateSubmit( request: Orders.Request ) {

    if ( !request.order.isAuthorized ) {
      request.order.cups = { codeDescription: '' };
      request.order.cie10 = { codeDescription: '' };
    }

    this.confirm( request );
  }

  /**
   * Compares if the inputs that are clicked are those of cups or cie10,
   * then creates an observable for the keyboard and blur events in the input,
   * and when exiting the input it is verified if the text was selected
   * from the list of cups o cie10 if not equal to ''
   * @param el modal ref
   */
  initObsevblesCupsSubForm( el: ElementRef ) {
    let blurInput$: Observable<MouseEvent>;
    let keyInput$: Observable<KeyboardEvent>;

    const element = el.nativeElement;
    const clickModal$ = fromEvent<MouseEvent>( element, 'click' );

    clickModal$.pipe(
      tap( event => {
        if ( (
          event.target as HTMLElement ).id.indexOf( 'cups' ) !== -1
          || ( event.target as HTMLElement ).id.indexOf( 'cie10' ) !== -1
        ) {
          let inputControl: FormlyFieldConfig;

          blurInput$ = fromEvent<MouseEvent>( event.target, 'blur' );
          blurInput$.pipe(
            tap( eventBlur => {

              const idInput = ( eventBlur.target as HTMLInputElement ).id;
              this.formsList.forEach( formDinamic => {

                if ( !inputControl ) {
                  inputControl = formDinamic._fields.find( control => control.id === idInput );
                }
              } );

              if (
                this.textInput
                && inputControl
                && (
                  inputControl.model.cups.codeDescription === this.textInput
                  || inputControl.model.cie10.codeDescription === this.textInput
                )
              ) {
                inputControl.formControl.setValue( '' );
              }

              this.textInput = undefined;
            } ),
            take( 1 )
          ).subscribe();

          keyInput$ = fromEvent<KeyboardEvent>( event.target, 'keyup' );
          keyInput$.pipe(
            tap( eventKey => {

              this.textInput = ( eventKey.target as HTMLInputElement ).value;
            } ),
            takeUntil( blurInput$ )
          ).subscribe();
        }
      } ),
      takeUntil( this.destroy$ )
    ).subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
  }
}
