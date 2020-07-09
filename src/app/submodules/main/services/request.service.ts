import { Injectable } from '@angular/core';
import { Database } from '3a-common';
import { Orders, Users, Collections } from 'grapp-common-se';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { FormService, SelectOption, CitiesService } from 'ngx-3a';
import { ModalEvent, Modals } from 'src/app/models/navigation';
import { map, switchMap } from 'rxjs/operators';
import { SwitchComponent } from 'src/app/components/fields/switch/switch.field.component';
import { Observable, of } from 'rxjs';
import { ImageService } from 'src/app/services/image.service';
import { FilterParser } from '../models/rbar';
import { CodablesService } from './codables.service';
import * as moment from 'moment';
@Injectable()
export class RequestService {
  cities: string[];

  constructor(
    private citiesSvc: CitiesService,
    private db: Database.DatabaseService,
    private formSvc: FormService,
    private codSvc: CodablesService,
    private imageSvc: ImageService
  ) { }

  private requestTypeOptions(): SelectOption[] {
    return Object.values( Orders.RequestType ).map( type => ( { label: type, value: type } ) );
  }

  private serviceTypeOptions(): SelectOption[] {
    return Object.values( Orders.ServiceType ).map( type => ( { label: type, value: type } ) );
  }

  private doctorSpecialityOptions(): SelectOption[] {
    return Object.values( Orders.DoctorSpeciality ).map( ( speciality: string ) => ( { label: speciality, value: speciality } ) );
  }

  specialityOptions(): SelectOption[] {
    return Object.values( Orders.Speciality ).map( speciality => ( { label: speciality, value: speciality } ) );
  }
  cupsOptions(): SelectOption[] {
    return Object.values( this.codSvc.cupsOptions() ).map( speciality => ( { label: speciality, value: speciality } ) );
  }
  cie10Options(): SelectOption[] {
    return Object.values( this.codSvc.cie10Options() ).map( speciality => ( { label: speciality, value: speciality } ) );
  }
  citiesOptions(): SelectOption[] {
    this.cities = this.citiesSvc.getCities().map( city => city.descripcion );
    return Object.values( this.cities ).map( speciality => ( { label: speciality, value: speciality } ) );
  }

  statusOptionsAnalistCoordinator(): SelectOption[] {
    return [
      {
        label: 'En proceso',
        value: `order.generalStatus-${ Orders.GeneralOrderStatus.INPROCESS }`,
      },
      {
        label: 'Ejecutada',// order.generalStatus  = 1
        value: `order.generalStatus-${ Orders.GeneralOrderStatus.EXECUTED }`,
      },
      {
        label: 'Cancelada',// order.generalStatus  = 1
        value: `order.generalStatus-${ Orders.GeneralOrderStatus.CANCELED }`,
      },
      {
        label: 'No autorizado',
        value: Orders.RequestStatus.CANCELED,
      },
      {
        label: 'Pendiente de análisis',
        value: Orders.RequestStatus.REGISTERED,
      },
      {
        label: 'Finalizada',
        value: Orders.RequestStatus.DONE,
      },

    ];
  }

  statusOptionsDoctor(): SelectOption[] {
    return [
      {
        label: 'Esperando análisis',
        value: Orders.RequestStatus.REGISTERED,
      },
      {
        label: 'Autorizada',
        value: Orders.RequestStatus.APROOVED,
      },
      {
        label: 'No autorizada',
        value: Orders.RequestStatus.CANCELED,
      }
    ];
  }

  statusOptionsExecutor(): SelectOption[] {
    return [
      {
        label: 'En proceso',
        value: Orders.GeneralOrderStatus.INPROCESS,
      },
      {
        label: 'Ejecutada',
        value: Orders.GeneralOrderStatus.EXECUTED,
      },
      {
        label: 'Cancelada',
        value: Orders.GeneralOrderStatus.CANCELED,
      }
    ];
  }

  statusFilterParser(): FilterParser {
    return ( status: Orders.RequestStatus ) => {
      switch ( status ) {
        case Orders.RequestStatus.APROOVED:
          return 'Autorizada';
        case Orders.RequestStatus.CANCELED:
          return 'No autorizada';
        case Orders.RequestStatus.DONE:
          return 'Ejecutada';
        case Orders.RequestStatus.REGISTERED:
          return 'Esperando análisis';
        case Orders.RequestStatus.SENT:
          return 'Direccionada';
        default:
          return 'N/A';
      }
    };
  }

  addRequestFields(): FormlyFieldConfig[] {
    return [
      this.formSvc.selectInput( 'requestType', 'Tipo de solicitud', this.requestTypeOptions(), true ),
      this.formSvc.relationInput(
        'servicesRequested',
        'Servicios solicitados',
        this.serviceTypeOptions(),
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        false
      ),
      this.formSvc.selectInput( 'speciality', 'Especialidad', this.specialityOptions(), true ),
      this.formSvc.dateInput( 'physicalOrderCreatedAt', 'Fecha de creación orden fisica', true, undefined, moment() ),
      this.formSvc.textInput( 'prescribingDoctor.name', 'Nombre del médico o institución remitente', '', true ),
      this.formSvc.selectInput( 'prescribingDoctor.speciality', 'Especialidad del médico', this.doctorSpecialityOptions(), true ),
      SwitchComponent.fieldWith( 'completeSupports', '¿Soportes completos?', undefined, undefined ),
      this.formSvc.textareaInput( 'observations', 'Comentarios y observaciones', '', true ),
      // {
      //   ...this.formSvc.fileInput('order.file', 'Soportes (Peso max. 30mb)', true, undefined, false),
      //   hideExpression: model => !model.completeSupports,
      // },
    ];
  }

  /**
   * Create a modal event for new requests
   * @param patient The patient owner of the request
   * @param request The request to be added or created
   * @param callback A callback with the saved data
   */
  addRequestEvent(
    patient: Users.Patient,
    requests?: Orders.Request[],
    request?: Orders.Request,
    callback?: ( r: Orders.Request ) => void
  ): ModalEvent {
    return {
      type: Modals.REQUEST,
      payload: {
        requests: requests,
        request: request || {
          name: patient.name,
          patient: patient,
          status: 0,
          prescribingDoctor: {
            name: '',
          },
          order: {
            file: '',
          },
        },
      },
      confirmation: {
        text: 'Guardar',
        callback: $request => {
          return this.saveRequest( $request as Orders.Request ).pipe(
            map( savedRequest => {
              if ( savedRequest ) {
                if ( callback ) {
                  callback( savedRequest );
                }
                return true;
              }
              return false;
            } )
          );
        },
      },
    };
  }

  /**
   * Create a modal event for existing requests
   * @param patient The patient owner of the request
   * @param request The request to be added or created
   * @param callback A callback with the saved data
   */
  analyzeRequestEvent( request: Orders.Request, callback?: ( r: Orders.Request ) => void ): ModalEvent {
    return {
      type: Modals.ANALYST_REQUEST,
      payload: request,
      confirmation: {
        text: 'Guardar',
        callback: $request =>
          this.saveRequest( $request as Orders.Request ).pipe(
            map( savedRequest => {
              if ( savedRequest ) {
                if ( callback ) {
                  if ( typeof savedRequest.status === 'string' ) {
                    savedRequest.status = Number( savedRequest.status );
                  }
                  callback( savedRequest );
                }
                return true;
              }
              return false;
            } )
          ),
      },
    };
  }

  saveRequest( request: Orders.Request ): Observable<Orders.Request> {
    return this.prepareFileForSave( request )
      .pipe(
        switchMap( ( $request ) => {
          return this.db.save( $request, { name: Collections.REQUESTS } );
        } )
      );
  }

  private prepareFileForSave( request: Orders.Request ): Observable<Orders.Request> {

    if ( request.order.file === undefined ) {
      request.order.file = [];
    }

    if ( request.imported ) {
      return of( request );

    } else {

      request.physicalOrderCreatedAt = request.physicalOrderCreatedAt.valueOf();

      if ( this.verifyOrderFiles( request.order.file ) && request.order.file.length > 0 ) {

        return this.imageSvc.uploadMultiplesFiles( request.order.file ).pipe(

          map( savedFile => {

            request.order.file = savedFile;
            return request;

          } )
        );

      } else {
        return of( request );
      }
    }


  }

  verifyOrderFiles( orderFiles ) {
    let flag = true;

    if ( Array.isArray( orderFiles ) ) {

      orderFiles.forEach( element => {
        if ( typeof element === 'string' || element === null ) {

          flag = false;
          return false;
        }
      } );

      return flag;
    } else {

      return flag;
    }
  }

  /**
   * Get all the requests associated with a given patient
   * @param patient The patient to llok for
   * @param status (Optional) Send if a specific status is desireded, defaults to 'Registered'
   */
  getRequestsByPatient( patient: Users.Patient, status?: Orders.RequestStatus ): Observable<Orders.Request[]> {
    return this.db.find<Orders.Request>(
      [
        {
          key: 'patient.document',
          relation: Database.DatabaseQueryRelation.Equal,
          value: patient.document,
        },
        {
          key: 'status',
          relation: Database.DatabaseQueryRelation.Equal,
          value: status || Orders.RequestStatus.REGISTERED,
        },
      ],
      { name: Collections.REQUESTS }
    );
  }

  /**
   * Gets a set of requests based on a predifined query
   * @param queries Specified custom queries
   */
  getRequestsByQueries( queries: Database.DatabaseQuery[], page = 0 ): Observable<Orders.Request[]> {
    return this.db.find<Orders.Request>( queries, { name: Collections.REQUESTS, lastIndex: 100 * page } );
  }

  /**
   * Get all the requests associated with a given patient
   * @param doctor The doctor to look for
   * @param status (Optional) Send if a specific status is desireded, defaults to 'Registered'
   */
  getRequestsByDoctor( doctor: Users.Doctor, status?: Orders.RequestStatus ): [ Observable<Orders.Request[]>, Database.DatabaseQuery[] ] {
    const queries: Database.DatabaseQuery[] = [
      {
        key: 'status',
        relation: Database.DatabaseQueryRelation.Equal,
        value: status || Orders.RequestStatus.REGISTERED,
      },
    ];
    if ( doctor.specialty ) {
      queries.unshift( {
        key: 'speciality',
        relation: Database.DatabaseQueryRelation.Equal,
        value: doctor.specialty,
      } );
    }
    return [ this.db.find<Orders.Request>( queries, { name: Collections.REQUESTS } ), queries ];
  }

  /**
   * Create and return a modal event for executors modal
   */
  addExecutorEvent( order: Orders.Order, callback?: ( order: Orders.Order ) => void ): ModalEvent {
    return {
      type: Modals.EXECUTORS,
      payload: order,
      confirmation: {
        text: '',
        callback: ( $order: Orders.Order ) => {
          if ( callback ) {
            callback( $order );
          }
          return true;
        },
      },
    };
  }

  /**
 * create an request deletion confirmation modal
 * @param order The request to be eliminada
 * @param callback A callback with the saved data
 */
  deleteRequestEvent( request: Orders.Request, callback: ( r: Orders.Request ) => void ): ModalEvent {
    return {
      type: Modals.DELETE_ORDER,
      payload: { request: request },
      confirmation: {
        text: 'Confirmar',
        callback: ( $request: Orders.Request ) => {
          callback( $request );
          return true;
        },
      },
    };
  }

  /**
   * Gets the fields needed to configure filter menu for request data
   */
  getRequestFilterFields() {
    return [
      this.formSvc.textInput( '$name', 'Paciente', '', true ),
      this.formSvc.selectInput( 'speciality', 'Especialidad', this.specialityOptions(), true ),
      this.formSvc.selectInput( 'cups', 'Servicio', this.cupsOptions(), true ),
      this.formSvc.selectInput( 'cie10', 'Diagnostico', this.cie10Options(), true ),
      this.formSvc.selectInput( 'requestType', 'Tipos', this.requestTypeOptions(), true ),
      this.formSvc.selectInput( 'status', 'Estado', this.statusOptionsAnalistCoordinator(), true ),
      this.formSvc.selectInput( 'city', 'Municipio de residencia', this.citiesOptions(), true ),
      this.formSvc.dateInput( 'createdAt', 'Fecha creación', false ),
    ];
  }
}
