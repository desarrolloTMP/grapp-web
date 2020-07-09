import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Users, Orders } from 'grapp-common-se';
import { DatatableOptions, FormService, AuthenticationService } from 'ngx-3a';
import { FilterConfig, FilterParser, RBarResponse } from 'src/app/submodules/main/models/rbar';
import { MainService } from 'src/app/submodules/main/services/main.service';
import { Database } from '3a-common';
import { BaseComponent } from 'src/app/components/base/base.component';
import { CSVService } from '../../services/csv.service';
import { CSVParser } from '../../coordinator.models';
import * as moment from 'moment';
import { RequestService } from '../../../../services/request.service';
import { ExcelService } from 'src/app/services/excel.service';
import { _MatSortHeaderMixinBase } from '@angular/material';
import { NotificationsService } from '@services/notifications.service';

@Component( {
  selector: 'app-orders',
  templateUrl: './orders.component.html',
} )
export class OrdersComponent extends BaseComponent implements OnInit {
  @ViewChild( 'dateTemplate' ) dateTemplate: TemplateRef<any>;
  @ViewChild( 'dateExpirationTemplate' ) dateExpirationTemplate: TemplateRef<any>;
  @ViewChild( 'cumplimientoTemplate' ) cumplimientoTemplate: TemplateRef<any>;
  @ViewChild( 'statusTemplate' ) statusTemplate: TemplateRef<any>;

  currentCoordinator: Users.User;
  datatableOptions: DatatableOptions;
  filtersApplied: FilterConfig[] = [];
  filterParsers: string[];
  filter_text: string;
  currentPage = 0;
  exporting = false;

  constructor(
    private mainSvc: MainService,
    private changeDetector: ChangeDetectorRef,
    private csvSvc: CSVService,
    private requestSvc: RequestService,
    private formSvc: FormService,
    private excelSvc: ExcelService,
    private authSvc: AuthenticationService,
    private notificationSvc: NotificationsService,
  ) {
    super();
  }

  ngOnInit(): void {
    this.requestSvc.getRequestsByQueries( [] ).subscribe( cups => {
      if ( cups ) {
        this.loadRequests( cups );
      }
    } );

    this.listenUser();
  }

  listenUser() {
    this.observable( this.authSvc.user ).subscribe( user => {
      if ( user ) {
        this.currentCoordinator = ( user as Users.User );
      }
    } );
  }

  loadRequests( requests ) {
    const query = this.filtersApplied.map( filter => filter.query );
    requests = this.filterQueriesByOrderGeneralStatus( requests, query );

    let data = requests
      .sort( ( $1, $2 ) => {
        const $1Priority = $1.requestType === Orders.RequestType.TUTELA || $1.requestType === Orders.RequestType.HOSP;
        const $2Priority = $2.requestType === Orders.RequestType.TUTELA || $2.requestType === Orders.RequestType.HOSP;
        if ( $1Priority ) {
          if ( $2Priority ) {
            return $1.order.expirationDate
              ? $2.order.expirationDate
                ? $1.order.expirationDate - $2.order.expirationDate
                : 1
              : $1.createdAt - $2.createdAt;
          }
          return -1;
        }
        if ( $2Priority ) {
          return 1;
        }
        return $1.order.expirationDate
          ? $2.order.expirationDate
            ? $1.order.expirationDate - $2.order.expirationDate
            : 1
          : $1.createdAt - $2.createdAt;
      } )
    // .filter(req => req.status !== Orders.RequestStatus.DELETED);

    if ( !(this.currentCoordinator && this.currentCoordinator[ 'nit' ] === '*') ) {
      data = data.filter( req => req.status !== Orders.RequestStatus.DELETED );
    }

    const datatableOptions = this.datatableOptions ? { ...this.datatableOptions } : new DatatableOptions();
    datatableOptions.rows = data;
    datatableOptions.columnMode = 'force';
    datatableOptions.columns = this.datatableOptions
      ? this.datatableOptions.columns
      : [
          {
            prop: 'patient.name',
            name: 'Nombre Paciente'
          },
          {
            prop: 'patient.document',
            name: 'Documento Paciente'
          },
          {
            prop: 'order.cups.codeDescription',
            name: 'CUPS'
          },
          {
            prop: 'speciality',
            name: 'Especialidad'
          },
          {
            prop: 'createdAt',
            name: 'Fecha de ingreso',
            cellTemplate: this.dateTemplate
          },
          {
            prop: 'order.expirationDate',
            name: 'Fecha Máx. Respuesta',
            cellTemplate: this.dateExpirationTemplate
          },
          {
            prop: 'order',
            name: 'Terminadas/Total',
            cellTemplate: this.cumplimientoTemplate
          },
          {
            prop: 'status',
            name: 'Estado',
            cellTemplate: this.statusTemplate
          }
        ];
      datatableOptions.rowClass = (req: Orders.Request) => {
      return this.diffDaysColor(req);
    };
    this.datatableOptions = datatableOptions;
  }

  updateVisibleColumns( keys: string[] ) {

    const columns = this.datatableOptions.columns.map( dt => {
      dt.visible = keys.indexOf( dt.prop ) > -1;
      return dt;
    } );
    this.datatableOptions = { ...this.datatableOptions, columns: columns };

    this.changeDetector.detectChanges();

  }

  updateResults( model: Object ) {
    let isInitEndDateEqual: boolean;

    let queries: Database.DatabaseQuery[] = Object.keys( model ).map( key => {

      if ( key.startsWith( '$' ) ) {
        return {
          key: key
            .slice( 1 )
            .split( '$' )
            .join( '.' ),
          value: model[ key ],
          relation: Database.DatabaseQueryRelation.Contains,
        };
      } else if ( key === 'initial_date' ) {

        return {
          key: 'createdAt',
          value: ( model[ key ] as moment.Moment ).valueOf(),
          relation: Database.DatabaseQueryRelation.Greater,
        };

      } else if ( key === 'final_date' ) {

        /** evaluate if the start date is equal to the end */
        if ( model[ 'initial_date' ] ) {
          const initialDate = model[ 'initial_date' ] as moment.Moment;
          const finalDate = model[ 'final_date' ] as moment.Moment;
          isInitEndDateEqual = initialDate.isSame( finalDate );
        }

        return {
          key: 'createdAt',
          value: ( model[ key ] as moment.Moment ).valueOf(),
          relation: Database.DatabaseQueryRelation.Lesser,
        };

      } else {

        if ( key === 'status' && isNaN( Number( model[ key ] ) ) ){


          let value: number;
          // model[ key ] / i.e = order-1
          switch ( Number( model[ key ].split('-')[1] ) ) {
            case Orders.GeneralOrderStatus.INPROCESS:
              value = Orders.GeneralOrderStatus.INPROCESS;
              break;
            case Orders.GeneralOrderStatus.EXECUTED:
              value = Orders.GeneralOrderStatus.EXECUTED;
              break;
            default:
              value = Orders.GeneralOrderStatus.CANCELED;
              break;
          }

          key = 'order.generalStatus';

          return {
            key,
            value,
            relation: Database.DatabaseQueryRelation.Equal,
          };
        }

        return {
          key,
          value: key === 'status' ? Number( model[ key ] ) : model[ key ],
          relation: Database.DatabaseQueryRelation.Equal,
        };
      }
    } );


    this.filtersApplied = queries.map( query => ( { label: query.value, query } ) );
    this.currentPage = 0;

    this.displayFilterLabel();

    /**
     * After the filter is matched set the filter with the final date run
     * one day when the initial and final dates are equal
     */
    if ( isInitEndDateEqual ) { queries = this.refactorQueryInitEndDate( queries, model ); }

    this.requestSvc.getRequestsByQueries( queries ).subscribe( requests => {

      if ( requests ) {
        this.loadRequests( requests );
      }

    } );
  }


  /**
   * Request array with status key renamed to order.generalStatus
   *
   * @param requests Request array
   * @param queries DatabaseQuery array
   * @returns Request array
   */
  filterQueriesByOrderGeneralStatus( requests: Orders.Request[], queries: Database.DatabaseQuery[] ): Orders.Request[]{

    const orderGeneralStatusObj = queries.find( el => el.key === 'order.generalStatus' );

    if (
      orderGeneralStatusObj &&
      orderGeneralStatusObj.value !== Orders.GeneralOrderStatus.CANCELED
    ) {
      requests = requests.filter( request => {
        if ( request.status === 1 && this.validateStatus( request ) ) {
          return true;
        } else {
          return false;
        }
      } );
    } else if (
      orderGeneralStatusObj &&
      orderGeneralStatusObj.value === Orders.GeneralOrderStatus.CANCELED
    ) {
      requests = requests.filter( request => request.status !== Orders.RequestStatus.CANCELED );
    }


    return requests;
  }

  /**
   * Function called when the initial and final dates are the same,
   * modify the final date by adding a day and return the query again.
   *
   * @param queries Object with the model attributes formatted to an array of DatabaseQuery
   * @param model Model with the attributes sent from the filter sidebar
   * @returns Query filter
   */
  private refactorQueryInitEndDate( queries: Database.DatabaseQuery[], model: object ): Database.DatabaseQuery[] {
    let endDateIndex: number;

    endDateIndex = queries.findIndex( el => el.relation === Database.DatabaseQueryRelation.Lesser );
    queries[ endDateIndex ].value = ( model[ 'final_date' ] as moment.Moment ).add( 1, 'days' ).valueOf();

    return queries;
  }

  displayFilterLabel() {

    this.filterParsers = this.filtersApplied.map( filter => {

      if ( filter.query.key === 'createdAt' ) {

        return new Date( filter.label ).toDateString();
      } else {
        if ( filter.query.key === 'status' ) {

          return this.getLabelStatusOptions( filter.query.value );
        }

        if( filter.query.key === 'order.generalStatus' ){

          return this.getLabelStatusOptions(  `order.generalStatus-${filter.query.value}` );
        }

        return filter.label;
      }

    } );
  }

  getLabelStatusOptions( value: string ): string {
    const statusOptions = this.requestSvc.statusOptionsAnalistCoordinator();

    return statusOptions.find( statusOption => statusOption.value === value ).label as string;
  }

  removeFilter( index: number ) {

    this.filtersApplied.splice( index, 1 );
    this.filterParsers.splice( index, 1 );
    this.currentPage = 0;

    const query = this.filtersApplied.map( filter => filter.query );

    this.requestSvc.getRequestsByQueries( query ).subscribe( requests => {
      if ( requests ) {
        this.loadRequests( requests );
      }
    } );
  }

  loadMoreData(recursive: boolean = false, recursionDone?: (items: any[]) => void, firstCall = true) {
    const query = this.filtersApplied.map(filter => filter.query);
    const page = ++this.currentPage;

    if ( query && query[ 0 ] && query[ 0 ].key === 'patient.document' ) {

      this.requestSvc.getRequestsByQueries(query).subscribe(requests => {
        if (requests) {
          // requests = this.filterQueriesByOrderGeneralStatus( requests, query );
          recursionDone([...requests]);
        }
      } );

    } else {

      this.requestSvc.getRequestsByQueries(query, page).subscribe(requests => {

        if (requests && requests.length) {
          const current = this.datatableOptions.rows as Orders.Request[];

          if ( recursive ) {
            // requests = this.filterQueriesByOrderGeneralStatus( requests, query );
            if ( firstCall ) {
              requests = [ ...current, ...requests ];
            }

            this.loadMoreData(
              recursive,
              partial => {
                recursionDone( [ ...requests, ...partial ] );
              },
              false
            );

          } else {
            this.loadRequests( [ ...current, ...requests ] );
          }
        } else if ( recursive ) {

          if ( firstCall ) {
            recursionDone( this.datatableOptions.rows as any[] );
          } else {
            recursionDone( [] );
          }
        }
      } );
    }
  }
  /**
   * Open an import modal
   */
  openImport() {
    const parser: CSVParser = {
      title: 'Importar CUPS',
      collection: 'Cups',
      identityField: 'code',
      mapper: [
        { targetKey: 'name', originalKey: 'CUPS', parser: cie => cie.split( ' ' )[ 1 ] },
        { targetKey: 'code', originalKey: 'CUPS', parser: cie => cie.split( ' ' )[ 0 ] },
        { targetKey: 'codeDescription', originalKey: 'CUPS' },
      ],
    };
    this.mainSvc.toogleModal.next( this.csvSvc.csvImportEvent( parser, undefined ) );
  }

  openRequest( request: Orders.Request ) {

    this.mainSvc.toogleModal.next(
      this.requestSvc.analyzeRequestEvent( request, savedRequest => {


        const requests = this.datatableOptions.rows as Orders.Request[];
        const requestIndex = requests.findIndex( r => r._id === savedRequest._id );

        if (
          savedRequest.status === Orders.RequestStatus.DELETED
        ) {
          console.log( 'savedRequest', savedRequest );
          console.log('this.currentCoordinator', this.currentCoordinator);

          this.sendEmail( savedRequest )
          requests.splice( requestIndex, 1 );
        } else {

          requests.splice( requestIndex, 1, savedRequest );
        }

        this.datatableOptions = { ...this.datatableOptions, rows: requests };
      } )
    );
  }


  /**
 * Send email executed orders
 */
  sendEmail( request: Orders.Request ) {

    this.notificationSvc
      .send(
        'Solicitud eliminada',
        `
          ${this.currentCoordinator.name }
          ha eliminado exitosamente la solicitud siguiente:  ---
          Id de la solicitud: [ ${ request._id } ]  ---
          Nombre paciente: [ ${ request.name } ]  ---
          Documento paciente: [ ${ request.patient.document } ]  ---
          Tipo: [ ${ request.requestType } ]  ---
          Sercicios solicitado: [ ${ request.servicesRequested } ]  ---
          Especialidad: [ ${request.speciality } ]  ---
          Justificación de eliminación: [ ${request.order.deleteObservations.observation} ]
          `,
        'ejmartinez@clinicadelnorte.org'
      )
      .subscribe( response => {
        if ( response.success ) {
          console.log( 'Message sent' );
        } else {
          console.error( response.message );
        }
      } );

  }

  /// this void returns a string with the diffecence betwen
  /// today and the expiration date ofthe order
  diffDays( request: Orders.Request ) {
    if ( request.order.expirationDate ) {
      const diffDays = moment( request.order.expirationDate ).diff( moment(), 'days' );
      return diffDays + ' días restantes / ';
    } else {
      const diffDays = moment( request.createdAt )
        .add( 5, 'days' )
        .diff( moment(), 'days' );
      return diffDays + ' días restantes / ';
    }
  }

  diffDaysSubOrders( subOrder ) {
    if ( subOrder.expirationDate ) {
      const diffDays = moment( subOrder.expirationDate ).diff( moment(), 'days' );
      return diffDays + ' días restantes / ';
    } else {
      // const diffDays = moment(subOrder.authorizationDate)
      //   .add(5, 'days')
      //   .diff(moment(), 'days');
      // return diffDays + ' días restantes / ';
      return 'Sin asignar';
    }
  }

  responseDate( request: Orders.Request ): number {
    return (
      request.order.expirationDate ||
      moment( request.createdAt )
        .add( 5, 'days' )
        .valueOf()
    );
  }

  /// this void returns a class for the row
  diffDaysColor( request: Orders.Request ) {
    let _class = '';
    if ( request.order.expirationDate ) {
      const totalDays = Math.abs( moment( request.order.authorizationDate ).diff( moment( request.order.expirationDate ), 'days' ) );
      const diffDays = Math.abs( moment( request.order.authorizationDate ).diff( moment(), 'days' ) );
      const ratio = diffDays / totalDays;
      if ( ratio < 0.5 ) {
        _class = '';
      } else if ( ratio < 0.8 ) {
        _class = '-orange';
      } else {
        _class = '-red';
      }
    } else {
      _class = '-orange';
      // const diffDays = Math.max(5 - moment(moment()).diff(request.createdAt, 'days'), 0);
      // if (diffDays < 3) {
      // } else if (diffDays < 5) {
      //   _class = '-orange';
      // } else {
      //   _class = '';
      // }
    }
    return _class;
  }

  /// this void returns a class for the progress-bar
  diffDaysBar( request: Orders.Request ) {
    let _class = 'progress-bar';
    if ( request.order.authorizationDate ) {
      const totalDays = Math.abs( moment( request.order.authorizationDate ).diff( moment( request.order.expirationDate ), 'days' ) );
      const diffDays = Math.abs( moment( request.order.authorizationDate ).diff( moment(), 'days' ) );
      const ratio = diffDays / totalDays;
      if ( ratio < 0.5 ) {
        _class = 'progress-bar';
      } else if ( ratio < 0.8 ) {
        _class = 'progress-bar -orange';
      } else {
        _class = 'progress-bar -red';
      }
    } else {
      const diffDays = Math.max( 5 - moment( moment() ).diff( request.createdAt, 'days' ), 0 );
      if ( diffDays < 3 ) {
        _class = 'progress-bar -red ';
      } else if ( diffDays < 5 ) {
        _class = 'progress-bar -orange';
      } else {
        _class = 'progress-bar';
      }
    }
    return _class;
  }

  diffDaysPercentage( request: Orders.Request ) {
    if ( request.order.expirationDate ) {
      const totalDays = Math.abs( moment( request.order.authorizationDate ).diff( moment( request.order.expirationDate ), 'days' ) );
      const diffDays = Math.abs( moment( request.order.authorizationDate ).diff( moment(), 'days' ) );
      return ( diffDays / totalDays ) * 100;
    } else {
      const diffDays = Math.max( 5 - moment( moment() ).diff( request.createdAt, 'days' ), 0 );
      return ( diffDays / 5 ) * 100;
    }
  }

  openRBarFromTableData() {

    const filterOptions = [
      this.formSvc.selectInput( 'speciality', 'Especialidad', this.requestSvc.specialityOptions(), false ),
      this.formSvc.selectInput( 'status', 'Estado de solicitud', this.requestSvc.statusOptionsAnalistCoordinator(), false ),
      this.formSvc.textInput( '$name', 'Nombre paciente', '', false ),
      this.formSvc.textInput( '$patient$document', 'Documento paciente', '', false ),
      this.formSvc.dateInput( 'initial_date', 'Fecha inicial', false ),
      this.formSvc.dateInput( 'final_date', 'Fecha final', false ),
    ];

    const filterModel = this.filtersApplied
      .map( filter => {
        if ( filter.query.relation === Database.DatabaseQueryRelation.Contains ) {

          return { [ `$${ filter.query.key.split( '.' ).join( '$' ) }` ]: filter.query.value };

        } else {

          if ( filter.query.key === 'createdAt' ) {
            if ( filter.query.relation === Database.DatabaseQueryRelation.Greater as number ) {
              filterOptions[ 5 ] = this.formSvc.dateInput( 'final_date', 'Fecha final', false, moment( filter.query.value ) );
              return { initial_date: moment( filter.query.value ) };
            } else {
              return { final_date: moment( filter.query.value ) };
            }
          }

          if ( filter.query.key === 'order.generalStatus'  ) {

            filter.query.value = `${ filter.query.key }-${ filter.query.value}`
            filter.query.key = 'status'
          }

          return { [ filter.query.key ]: filter.query.value };
        }
      } )
      .reduce( ( $1, $2 ) => ( { ...$1, ...$2 } ), {} );

    this.mainSvc.toogleRBar.next( {
      datatableColumns: this.datatableOptions.columns,

      filterOptions,
      filterModel,
      confirmation: {
        text: '',
        callback: ( response: RBarResponse ) => {

          this.updateVisibleColumns( response.columns );
          this.updateResults( response.filterResults );

          return true;
        },
      },
    } );
  }

  getStatus( request: Orders.Request ) {

    // console.log('estatus template', request);
    // let a = request.status == 1 && this.validateStatus( request ) ?
    //           request.order.generalStatus == 0 ? 'EN PROCESO' :
    //             request.order.generalStatus == 1 ? 'EJECUTADA' : 'CANCELADA'
    //         : request.status === 4
    //           ? 'NO AUTORIZADO'
    //           : request.status === 0
    //             ? 'PENDIENTE ANÁLISIS'
    //             : request.status === 3
    //               ? 'FINALIZADA'
    //               : 'CANCELADA';

    if ( request.status === 1 && this.validateStatus( request ) ){

      switch ( request.order.generalStatus ) {
        case Orders.GeneralOrderStatus.INPROCESS:
          return 'EN PROCESO';
        case Orders.GeneralOrderStatus.EXECUTED:
          return 'EJECUTADA';
        default:
          return 'CANCELADA';
      }
    }  else {
      switch ( request.status ) {
        case Orders.RequestStatus.CANCELED:
          return 'NO AUTORIZADO';
        case Orders.RequestStatus.REGISTERED:
          return 'PENDIENTE ANÁLISIS';
        case Orders.RequestStatus.DONE:
          return 'FINALIZADA';
        case Orders.RequestStatus.DELETED:
          return 'ELIMINADA';
        default:
          return 'CANCELADA';
      }
    }


  }

  validateStatus( _ ): any {
    if ( Object.keys( _.order ).includes( 'isAuthorized' ) ) {
      return _.order.isAuthorized;
    } else {
      return true;
    }
  }

  getCumplimientoOrders( order: Orders.Request ) {
    let doneOrders = 0,
      allOrdets = 1;
    if ( order.order.generalStatus >= 1 ) {
      doneOrders++;
    }
    if ( order.suborders ) {
      allOrdets = allOrdets + order.suborders.length;
      for ( let i = 0; i < order.suborders.length; i++ ) {
        if ( order.suborders[ i ].generalStatus >= 1 ) {
          doneOrders++;
        }
      }
    }
    return doneOrders + '/' + allOrdets;
  }

  exportExcel() {
    this.exporting = true;
    const currentRealPage = this.currentPage;
    this.loadMoreData( true, fullItems => {
      let order = [];

      for ( const _ of fullItems ) {
        order.push( {
          'ORIGEN': _.imported ? 'GHIPS' : 'GRAPP',
          'FECHA DE INGRESO': _.createdAt ? moment( _.createdAt ).locale( 'es' ).format( 'L' ) : 'N/A',
          'TIPO DE SOLICITUD': _.requestType,
          'NOMBRE PACIENTE': _.patient.name,
          'DOCUMENTO PACIENTE': _.patient.document,
          CUPS: _.order.cups ? _.order.cups.codeDescription.length > 0 && _.order.isAuthorized ? _.order.cups.codeDescription : _.status === 0 ? 'PENDIENTE' : 'N/A' : 'PENDIENTE',
          CIE10: _.order.cie10 ? _.order.cie10.codeDescription.length > 0 && _.order.isAuthorized ? _.order.cie10.codeDescription : _.status === 0 ? 'PENDIENTE' : 'N/A' : 'PENDIENTE',
          ESPECIALIDAD: _.speciality ? _.speciality : _.specialty ? _.specialty : 'N/A',
          'NOMBRE DEL GESTOR': _.verifierDoctor ? _.verifierDoctor.name : 'N/A',
          'JUSTIFICACIÓN':_.order.observations ? _.order.observations : 'N/A',
          'JUSTIFICACIÓN NO AUTORIZA':_.order.noAuthObservations ? _.order.noAuthObservations : 'N/A',
          'FECHA ANÁLISIS GESTOR': _.order.createdAt ? moment( _.order.createdAt ).locale( 'es' ).format( 'L' ) : 'N/A',
          'FECHA MÁX. RESPUESTA': _.order.expirationDate
            ? this.diffDays( _ ) +
            moment( this.responseDate( _ ) )
              .locale( 'es' )
              .format( 'L' )
            : 'Sin asignar',
          'NOMBRE DEL EJECUTOR': _.order.executors && _.order.executors[ 0 ] && _.order.executors[ 0 ].name ? _.order.executors[ 0 ].name : 'Sin asignar',
          'FECHA ASIGNACIÓN CITA': _.order.agenda && _.order.agenda[ 0 ] && _.order.agenda[ 0 ].date ? moment( _.order.agenda[ 0 ].date )
            .locale( 'es' )
            .format( 'L' ) : 'N/A',
          'FECHA CITA': _.order.agenda && _.order.agenda[ 0 ] && _.order.agenda[ 0 ].appointmentDate ? moment( _.order.agenda[ 0 ].appointmentDate )
            .locale( 'es' )
            .format( 'L' ) : 'N/A',
          'FECHA EJECUCIÓN': _.order.agenda && _.order.agenda[ 0 ] && _.order.agenda[ 0 ].date ? moment( _.order.agenda[ 0 ].date ).locale( 'es' )
            .format( 'L' ) : 'N/A',
          'ESTADO': _.status == 1 && this.validateStatus( _ ) ? _.order.generalStatus == 0 ? 'EN PROCESO' : _.order.generalStatus == 1 ? 'EJECUTADA' : 'CANCELADA' : _.status === 4 ? 'NO AUTORIZADO' : _.status === 0 ? 'PENDIENTE ANÁLISIS' : _.status === 3 ? 'FINALIZADA' : 'CANCELADA',
          //'TERMINADAS/TOTAL': this.getCumplimientoOrders(_),
        } );
        if ( _.suborders && _.suborders.length > 0 ) {
          for ( const b of _.suborders ) {
            order.push( {
              'ORIGEN': _.imported ? 'GHIPS' : 'GRAPP',
              'FECHA DE INGRESO': _.createdAt ? moment( _.createdAt )
                .locale( 'es' )
                .format( 'L' ) : 'N/A',
              'TIPO DE SOLICITUD': _.requestType,
              'NOMBRE PACIENTE': _.patient.name,
              'DOCUMENTO PACIENTE': _.patient.document,
              //_.order.cups ? _.order.cups.codeDescription.length > 0 && _.order.isAuthorized ? _.order.cups.codeDescription : 'N/A' : 'PENDIENTE',
              CUPS: b.cups && b.cups.codeDescription ? b.cups.codeDescription : 'N/A',
              CIE10: _.order.cie10 ? _.order.cie10.codeDescription.length > 0 && _.order.isAuthorized ? _.order.cie10.codeDescription : _.status === 0 ? 'PENDIENTE' : 'N/A' : 'PENDIENTE',
              ESPECIALIDAD: _.speciality ? _.speciality : _.specialty ? _.specialty : 'N/A',
              'NOMBRE DEL GESTOR': _.verifierDoctor ? _.verifierDoctor.name : 'N/A',
              'JUSTIFICACIÓN':_.order.observations ? _.order.observations : 'N/A',
              'JUSTIFICACIÓN NO AUTORIZA':_.order.noAuthObservations ? _.order.noAuthObservations : 'N/A',
              'FECHA ANÁLISIS GESTOR': b.createdAt ? moment( b.createdAt ).locale( 'es' ).format( 'L' ) : 'N/A',
              'FECHA MÁX. RESPUESTA': b.expirationDate
                ? this.diffDaysSubOrders( b )
                // + moment(this.responseDate(b))
                //   .locale('es')
                //   .format('L')
                : 'Sin asignar',
              'NOMBRE DEL EJECUTOR': b.executors && b.executors[ 0 ] ? b.executors[ 0 ].name : 'Sin asignar',
              'FECHA ASIGNACIÓN CITA': _.order.agenda && _.order.agenda[ 0 ] && _.order.agenda[ 0 ].date ? moment( _.order.agenda[ 0 ].date )
                .locale( 'es' )
                .format( 'L' ) : 'N/A',
              'FECHA CITA': _.order.agenda && _.order.agenda[ 0 ] && _.order.agenda[ 0 ].appointmentDate ? moment( _.order.agenda[ 0 ].appointmentDate )
                .locale( 'es' )
                .format( 'L' ) : 'N/A',
              'FECHA EJECUCIÓN': _.order.agenda && _.order.agenda[ 0 ] && _.order.agenda[ 0 ].date ? moment( _.order.agenda[ 0 ].date ).locale( 'es' )
                .format( 'L' ) : 'N/A',
              'ESTADO': _.status == 1 && this.validateStatus( _ ) ? b.generalStatus == 0 ? 'EN PROCESO' : b.generalStatus == 1 ? 'EJECUTADA' : 'CANCELADA' : _.status === 4 ? 'NO AUTORIZADO' : _.status === 0 ? 'PENDIENTE ANÁLISIS' : _.status === 3 ? 'FINALIZADA' : 'CANCELADA',
              //'TERMINADAS/TOTAL': this.getCumplimientoOrders(_),
            } );
          }
        }
      }

      this.excelSvc.exportAsExcelFile(order, 'Solicitudes');
      this.exporting = false;
      this.currentPage = currentRealPage;
    }, true);
  }
}
