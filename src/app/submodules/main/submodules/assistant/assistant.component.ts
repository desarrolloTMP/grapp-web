import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { BaseComponent } from 'src/app/components/base/base.component';
import { Users, Orders } from 'grapp-common-se';
import { PatientService } from '../../services/patient.service';
import { PatientQuery } from '../../models/patient';
import { take, map } from 'rxjs/operators';
import { RequestService } from '../../services/request.service';
import { MainService } from '../../services/main.service';
import { Observable, Subscription } from 'rxjs';
import { ImageService } from 'src/app/services/image.service';
import { DomSanitizer } from '@angular/platform-browser';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-assistant',
  templateUrl: './assistant.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistantComponent extends BaseComponent implements OnInit {
  queryOptions: PatientQuery = {
    document: '',
  };

  selectedPatient: Users.Patient;
  selectedPatientRequests: Orders.Request[];

  _contextMap: { [_: string]: { image: string; name: string; data: string } } = {};
  _contextMap$: { [_: string]: Subscription } = {};

  constructor(
    private patientSvc: PatientService,
    private requestSvc: RequestService,
    private mainSvc: MainService,
    private imageSvc: ImageService,
    private changeDetector: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    super();
  }

  ngOnInit(): void {
    super.ngOnInit();
  }

  openRequest( request: Orders.Request ) {

    this.mainSvc.toogleModal.next(

      this.requestSvc.addRequestEvent(this.selectedPatient, this.selectedPatientRequests, request, saveRequest => {
        this.loadPatientRequests( this.selectedPatient );
        this.changeDetector.detectChanges();
      })
    );
  }

  requestOrderContext(id: any): { image: string; name: string; data: string } {

    if (!this._contextMap[id]) {
      if (!this._contextMap$[id]) {
        this._contextMap$[id] = this.imageSvc
          .downloadFile(id)
          .pipe(
            map(file => ({
              image:  file
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
            }))
          )
          .subscribe( context => {
            this._contextMap[id] = context;
            this.changeDetector.detectChanges();
          });
      }

      return this._contextMap[ id ];
    }

    return this._contextMap[id];
  }


  sanitizeStyle( style: string ) {

    if ( style && style.includes('application/pdf')) {

      return this.sanitizer.bypassSecurityTrustStyle('url(/assets/document.png)');

    } else if ( style.includes( 'image/tif' ) || style.includes( 'image/tiff' ) ) {

      return this.sanitizer.bypassSecurityTrustStyle( 'url(/assets/document-tiff.png)' );

    }
    return this.sanitizer.bypassSecurityTrustStyle( style );

  }

  searchPatient(options: PatientQuery) {
    const document = {document: options.document.trim()}
    this.patientSvc
      .searchPatient(document)
      .pipe(take(1))
      .subscribe(patients => {
        if (patients && patients.length) {
          const patient = [];
          patients.forEach(a =>{
            a.document !== document.document ? null : patient.push(a);
          });
          this.selectedPatient = patient[0];
          this.changeDetector.detectChanges();
          this.loadPatientRequests(this.selectedPatient);
        } else {
          this.selectedPatient = undefined;
        }
      });
  }

  loadPatientRequests(patient: Users.Patient) {
    this.observable(this.requestSvc.getRequestsByPatient(patient)).subscribe(requests => {
      this.selectedPatientRequests = requests.sort(($1, $2) => $2.createdAt - $1.createdAt);
      this.changeDetector.detectChanges();
    });
  }

  /**
   * Call main service to create a new request for the given patient
   */
  createRequest() {
    this.mainSvc.toogleModal.next(
      this.requestSvc.addRequestEvent(this.selectedPatient, this.selectedPatientRequests, undefined, request => {
        this.selectedPatientRequests.unshift(request);
        this.changeDetector.detectChanges();
      })
    );
  }

  /**
   * Call main service to create or edit a new patient
   * @param patient (Optional) If patient is undefined, it will create a new patient, otherwise it will edit the received patient
   */
  createOrEditPatient(patient?: Users.Patient) {
    this.mainSvc.toogleModal.next(
      this.patientSvc.addPatientEvent(patient, savedPatient => {
        this.selectedPatient = savedPatient;
        this.changeDetector.detectChanges();
        this.loadPatientRequests(savedPatient);
      })
    );
  }

  /**
   * Open a file in a new window
   * @param data The base64 data of the file
   */
  openOrder( data: string, event?: Event, context?: any ) {
    event.stopPropagation();

    if ( isPlatformBrowser( this.platformId ) ) {
      const win = window.open();
      win.document.write(

        context.name.split( '.' )[ 1 ] !== 'pdf'
          ? this.templateIframePreviewFile( data )
          : this.templateIframePreviewFile(this.base64DataToBlob(data))
      );
    }
  }

  private templateIframePreviewFile( data: string ) {
    return `<iframe src=" ${ data } "
            frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;"
            allowfullscreen></iframe>`;
  }

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

  clearQuery() {
    this.queryOptions.document = '';
    this.selectedPatient = undefined;
    this.selectedPatientRequests = undefined;
    this.changeDetector.detectChanges();
  }
}
