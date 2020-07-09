import { Component, OnInit, Input, ViewChild, ElementRef, Renderer2 } from '@angular/core';
import { FormlyFieldConfig } from '@ngx-formly/core';

// libs 3a
import { Orders, Users, Files } from 'grapp-common-se';
import { BasicFormComponent, AuthenticationService } from 'ngx-3a';

// Components
import { ModalBaseComponent } from '../modal.base.component';

// Configs
import { FileRestrictions } from 'src/app/configs/restrictionFiles.config';

// Services
import { RequestService } from '../../../services/request.service';
import { ImageService } from 'src/app/services/image.service';


@Component( {
  selector: 'app-request-modal',
  templateUrl: './request.modal.component.html',
  styleUrls: [ './request.modal.component.scss' ]
} )
export class RequestModalComponent extends ModalBaseComponent implements OnInit {
  @ViewChild( 'form' ) basicForm: BasicFormComponent;
  @ViewChild( 'fileInput' ) fileInput: ElementRef;

  @Input() set _request( obj: { requests: Orders.Request[], request: Orders.Request; } ) {
    if ( obj ) {
      this.requests = JSON.parse( JSON.stringify( obj.requests ) );
      this.request = JSON.parse( JSON.stringify( obj.request ) );

      this.updatePhysicalOrderCreatedAt();
      this.initFildsForm();
      this.downloadFilesRequest();
    }
  }

  @Input() set _alert( alert: string[] ) {
    if ( alert && alert.length > 0 ) {

      this.alert = alert[0];
      this.loadingDownloadFiles = false;
    }
  }

  request: Orders.Request;
  requests: Orders.Request[];
  fields: FormlyFieldConfig[];
  alert: string;
  user: Users.User;

  files: (File | Files.InnerFile)[];

  // Flags
  enabledManageFiles: boolean;
  loadingDownloadFiles: boolean;

  constructor(
    public userSvc: AuthenticationService,
    private requestSvc: RequestService,
    private imageSvc: ImageService,
    private renderer: Renderer2,
  ) {
    super();
    this.loadingDownloadFiles = false;
    this.enabledManageFiles = true;
    this.files = [];

    // Suscriptions
    userSvc.user.subscribe( user => {
      if ( !user || !user.id ) {
        return;
      }
      this.user = user as Users.User;
    } );
  }

  ngOnInit(): void { }

  //#region EVENTS methods

    /**
     * Method to execute when selecting files in the file input
     *
     * @param event Event from file input when selecting files
     */
    fileChangeEvent( event ) {

      this.alert = null;
      let newFiles: File[] = Object.values( event.target.files ) as File[];

      newFiles = this.validateDuplicateFile( newFiles );
      newFiles = this.validateAllowedSize( newFiles );
      newFiles = this.validateAllowedExtensions( newFiles );

      this.files = this.files.concat( newFiles );
      this.clearInputFile();
    }
    //#region Validation methods for the selected files

    /**
     * If any name of the selected files is already in the file names of the application, do not add it.
     *
     * @param newFiles Array with the selected files in the input
     */
    private validateDuplicateFile( newFiles: File[] ): File[] {
      return newFiles.filter( newFile => !this.files.some( file => {

        if ( file.name === newFile.name ) {

          this.alert = (
            `Alguno de los archivos ya se encuentran seleccionados.`
          );

          return true;
        } else {
          return false;
        }

      } ) );
    }


    /**
     * If the size of any of the selected files exceeds the allowed limit, it is not added.
     *
     * @param newFiles Array with the selected files in the input
     */
    private validateAllowedSize( newFiles: File[] ): File[] {

      newFiles.forEach( ( newFile, index ) => {
        if ( newFile.size > FileRestrictions.maxFileSize ) {
          newFiles.splice( index, 1 );

          this.alert = (
            `El tamaño del archivo ${ newFile.name } supera el limite de tamaño de ${ Math.round( FileRestrictions.maxFileSize / 1000 ) } KB.`
          );
        }
      } );

      return newFiles;
    }

    /**
     * If the extension of any of the selected files is not allowed, it is not added.
     *
     * @param newFiles Array with the selected files in the input
     */
    private validateAllowedExtensions( newFiles: File[] ): File[] {

      newFiles.forEach( ( newFile, index ) => {

        if ( !FileRestrictions.allowedExtensions.includes( newFile.name.split( '.' )[ 1 ].toLowerCase() ) ) {
          newFiles.splice( index, 1 );

          this.alert = (
            `Alguno de los archivos seleccionados tiene una extensión incorrecta,
            las extensiones permitidas son:  ${ FileRestrictions.allowedExtensions.join( ', ' ) }.` );
        }

      } );

      return newFiles;
    }
  //#endregion

  //#endregion

  //#region GENERALS methods


    //#region Initialization methods for the request object when the input _request changes
      private updatePhysicalOrderCreatedAt() {
        if ( this.request.physicalOrderCreatedAt ) {
          this.request.physicalOrderCreatedAt = new Date( this.request.physicalOrderCreatedAt ) as Date;
        }
      }

      private initFildsForm() {
        this.fields = this.requestSvc.addRequestFields( );
      }

      private downloadFilesRequest() {
        if ( !(this.request.order.file.length > 0)) {
          return;
        }
        const arrPromise: Promise<Files.InnerFile>[] = [];

        (this.request.order.file as string[]).forEach( file => {
          arrPromise.push( this.getFileById( file ) );
        } );

        this.loadingDownloadFiles = true;
        Promise.all( arrPromise ).then( _ => {
          this.loadingDownloadFiles = false;
        } );

      }
    //#endregion

    /**
     * Clean the input file after selecting files
     */
    private clearInputFile() {
      this.renderer.setProperty( this.fileInput.nativeElement, 'value', '' );
    }

    verifyData( request ) { // Submit the form, validate the form data before sending

      if ( request.type ) {// Validar si se filtrar un event generico salir
        return;
      }

      if(!request.requestType || request.requestType === null || request.requestType  ==='null'){

      }

      console.log('request', request)
      let fields = ['requestType','servicesRequested','speciality','physicalOrderCreatedAt','prescribingDoctor','observations']
      let  flag = []
      for(const val of fields){
        if(request[val] === null || request[val] ==="null" || (val == 'servicesRequested' ? request[val] && request[val].length>0 ? false : true :false)){
          let name = 
            val == 'requestType' ? 'Tipo de solicitud' :
            val == 'servicesRequested'  ?  'Servicios solicitados' : 
            val == 'speciality' ? 'Especialidad' :
            val == 'physicalOrderCreatedAt' ? 'Fecha orden fisica':
            val == 'prescribingDoctor' ? 'Nombre del medico':
            val == 'observations' ? 'Observaciones': undefined
          flag.push(name)
        }
      }

      request.createdBy = {
        id: this.user.id,
        document: this.user.document,
        email: this.user.email,
        idType: this.user.idType,
        name: this.user.name
      };

      const ts = {
        time: false,
        reqType: false,
        serType: false,
        speciality: false
      };

      this.requests.filter(el => el.id !== request.id).forEach( el => {


        // Tipo de solicitud
        if ( el.requestType === request.requestType ) {
          ts.reqType = true;
        }

        // Servicios solicitados
        if ( request.servicesRequested && this.servicesSearch( request.servicesRequested, el.servicesRequested ) ) {
          ts.serType = true;
        }

        // Especialidad
        if ( el.speciality === request.speciality ) {
          ts.speciality = true;
        }

        // Fecha de creación orden fisica
        if ( request.physicalOrderCreatedAt && el.physicalOrderCreatedAt === request.physicalOrderCreatedAt.valueOf() ) {
          ts.time = true;
        }
      } );

      if ( ts.time && ts.reqType && ts.speciality && ts.serType ) {

        if ( !this.request.id){
          this.alert = 'Existe una solicitud con la misma información de la que estas creando.';
          
        }else {
          this.alert = 'Existe una solicitud con la misma información de la que estas editando.';
        }

        this.loadingDownloadFiles = false;
      } else if(flag.length>0){
        this.loadingDownloadFiles = false;
        this.alert = `${flag[0]} es obligatorio`
      }else {

        if ( request.completeSupports ) {

          if ( typeof ( request.order.file ) === 'string' ) {

            this.alert = 'Soportes obligatorios';
            this.loadingDownloadFiles = false;

          } else {

            this.confirm( request );
          }
        } else {

          if ( request.order && typeof ( request.order.file ) === 'object' ) {

            this.alert = undefined;
            this.confirm( request );
          } else {

            request.completeSupports = false;
            request.order = { file: [] };
            this.confirm( request );
          }
        }
      }
    }

    servicesSearch( serviceA: Orders.ServiceType[], servicesB: Orders.ServiceType[] ) {

      let flag = true;

      serviceA.forEach( element => {
        if ( !flag ) {
          return false;
        }
        let flag2 = false;
        servicesB.forEach( el => {
          if ( element === el ) {
            flag2 = true;
          }
        } );
        flag = flag2;
      } );


      if ( flag && serviceA.length !== servicesB.length ) {
        return false;
      }

      return flag;

    }
  //#endregion

  //#region ACTIONS methods

    /**
     * Delete the file from the attached files
     *
     * @param index Position of the file in the files array
     */
    onDeleteFile( index: number ) {
      this.files.splice( index, 1 );
    }

    /**
     * Delete all files
     */
    onClickTrashFiles() {
      this.files = [];
    }

    onSubmit() { // submit submitted to the form for this to submit the real submit.
      this.loadingDownloadFiles = true;
      this.request.order.file = this.files;
      this.basicForm.send(true);
  }

  //#endregion

  //#region SERVICES methds

    async getFileById( id: string ): Promise<Files.InnerFile>  {

      return new Promise<Files.InnerFile>( ( resolve, reject ) => {

        this.imageSvc.downloadFile( id ).subscribe( file => {
          this.files.push( file );
          resolve( file );
        }, reject );
      } );

    }

  //#endregion
}
