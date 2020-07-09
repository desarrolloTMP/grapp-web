import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { ExecutorService } from './services/executor.service';
import { Users, Orders } from 'grapp-common-se';
import { DatatableOptions, FormService, Logger, DatatableRow } from 'ngx-3a';
import { Database } from '3a-common';
import { RequestService } from '../../services/request.service';
import { MainService } from '../../services/main.service';
import { RBarResponse, FilterConfig } from '../../models/rbar';
import { BaseComponent } from 'src/app/components/base/base.component';
import * as moment from 'moment';
import { OrdersService } from '../../services/orders.service';
import { NotificationsService } from '../../services/notifications.service';
import { environment } from 'src/environments/environment';

@Component( {
  selector: 'app-executor',
  templateUrl: './executor.component.html',
} )
export class ExecutorComponent extends BaseComponent implements OnInit {
  currentExecutor: Users.User;
  datatableOptions: DatatableOptions;
  filtersApplied: FilterConfig[] = [];
  filterParsers: string[];
  filter_text: string;
  currentPage = 0;
  allData: any[];
  @ViewChild( 'dateTemplate' ) dateTemplate: TemplateRef<any>;
  @ViewChild( 'dateExpirationTemplate' ) dateExpirationTemplate: TemplateRef<any>;
  @ViewChild( 'statusTemplate' ) statusTemplate: TemplateRef<any>;


  baseQueries: Database.DatabaseQuery[] = [ {
    key: 'status',
    value: Orders.RequestStatus.APROOVED,
    relation: Database.DatabaseQueryRelation.Equal,
  } ];

  logger = new Logger( 'Executor', environment.production );

  constructor(
    private executorService: ExecutorService,
    private requestSvc: RequestService,
    private mainSvc: MainService,
    private formSvc: FormService,
    private ordersSvc: OrdersService,
    private notificationSvc: NotificationsService,
  ) {
    super();
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.executorService.executor.subscribe( executor => {
      this.currentExecutor = executor;
      if ( executor ) {
        this.searchRequests();
      }
    } );
  }

  searchRequests() {
    this.allData = [];
    this.currentPage = 0;

    // Get orders where the executor matches
    this.observable( this.requestSvc.getRequestsByQueries( [ ...this.baseQueries,
    {
      key: 'order.executors.id',
      value: this.currentExecutor.id,
      relation: Database.DatabaseQueryRelation.Equal
    }
    ] ) ).subscribe( requests => {

      // Get orders with suborders where the executor matches
      this.observable( this.requestSvc.getRequestsByQueries( [
        ...this.baseQueries,
      {
        key: 'suborders.executors.id',
        value: this.currentExecutor.id,
        relation: Database.DatabaseQueryRelation.Equal,
      } ] ) ).subscribe( suborders => {

        if ( suborders ) {
          requests = [
            ...requests,
            // filter requests that are already found in requests
            ...suborders.filter( subOrder => !requests.some( request => request.id === subOrder.id ) )
          ];
        }

        this.loadRequests( requests, this.allData.length > 0 );
      } );
    } );
    this.filtersApplied = [];
  }

  loadMoreData() {
    const queries = this.filtersApplied.map( filter => filter.query );

    this.observable( this.requestSvc.getRequestsByQueries( [
      ...this.baseQueries,
      ...queries,
      {
        key: 'order.executors.id',
        value: this.currentExecutor.id,
        relation: Database.DatabaseQueryRelation.Equal
      },
    ], ++this.currentPage ) ).subscribe( requests => {

      this.observable( this.requestSvc.getRequestsByQueries( [
        ...this.baseQueries,
        {
          key: 'suborders.executors.id',
          value: this.currentExecutor.id,
          relation: Database.DatabaseQueryRelation.Equal,
        }
      ], this.currentPage ) ).subscribe( suborders => {
        if ( suborders ) {
          requests = [
            ...requests,
            ...suborders.filter( subOrder => !requests.some( request => request.id === subOrder.id ) )
          ];
        }

        if ( requests.length ) {
          this.loadRequests( requests, this.allData.length > 0 );
        }
      } );
    } );
  }

  loadRequests( requests: Orders.Request[], acc = false ) {
    
    const queries = this.filtersApplied.map( filter => filter.query );
    const queryOrderStatus = queries.find( query => query.key === 'order.generalStatus' );

    const tempReq = [];

    // Separates orders and suborders from requests where the executor matches
    for ( let i = 0; i < requests.length; i++ ) {
      const request = requests[ i ];

      if ( request.order.executors && request.order.executors.find( e => e.id === this.currentExecutor.id ) ) {

        if ( queryOrderStatus ) {
          if ( queryOrderStatus.value === request.order.generalStatus ) {
            tempReq.push( { request: requests[ i ], order: request.order, patient: request.patient, index: -1 } );
          }
        } else {
          tempReq.push( { request: requests[ i ], order: request.order, patient: request.patient, index: -1 } );
        }
      }

      if ( request.suborders ) {

        for ( let j = 0; j < request.suborders.length; j++ ) {
          const suborder = request.suborders[ j ];
          if ( suborder.executors && suborder.executors.find( e => e.id === this.currentExecutor.id ) ) {

            if ( queryOrderStatus ) {
              if ( queryOrderStatus.value === suborder.generalStatus ) {
                tempReq.push( { request: requests[ i ], order: request.suborders[ j ], patient: request.patient, index: j } );
              }
            } else {
              tempReq.push( { request: requests[ i ], order: request.suborders[ j ], patient: request.patient, index: j } );
            }
          }
        }
      }
    }

    // Validates if the data load should be combined, functionality related to scroll
    if ( acc ) {
      this.allData = [ ...this.allData, ...tempReq];
    } else {
      this.allData = tempReq;
    }

    const datatableOptions = this.datatableOptions ? { ...this.datatableOptions } : new DatatableOptions();

    datatableOptions.rows = this.allData.sort( ( $1, $2 ) => {
      if ( $1.order.appointmentDate ) {
        if ( $2.order.appointmentDate ) {
          return $1.order.appointmentDate - $2.order.appointmentDate;
        } else {
          return 1;
        }
      } else if ( $2.order.appointmentDate ) {
        return -1;
      } else {
        return $1.order.expirationDate ? ( $2.order.expirationDate ? $1.order.expirationDate - $2.order.expirationDate : 1 ) : -1;
      }
    } )
      .filter( req => req.status !== Orders.RequestStatus.DELETED );

    datatableOptions.rows.forEach( row => {
      row.order.stateColumn = this.getStatus( row );
    } );

    datatableOptions.scrollButtonsEnabled = true;
    datatableOptions.columnMode = 'force';
    datatableOptions.scrollbarH = true;
    datatableOptions.columns = this.datatableOptions
      ? this.datatableOptions.columns
      : [
        {
          prop: 'patient.name',
          name: 'Nombre Paciente',
        },
        {
          prop: 'order.cups.codeDescription',
          name: 'CUPS',
        },
        {
          prop: 'order.createdAt',
          name: 'Fecha de ingreso',
          cellTemplate: this.dateTemplate,
        },
        {
          prop: 'order.expirationDate',
          name: 'Fecha Máx. Respuesta',
          cellTemplate: this.dateExpirationTemplate,
        },
        {
          prop: 'order.generalStatus',
          name: 'Estado',
          cellTemplate: this.statusTemplate
        }
      ];

    datatableOptions.rowClass = ( data: Orders.Request ) => {
      return this.diffDaysColor( data[ 'order' ] as Orders.Order );
    };
    this.datatableOptions = datatableOptions;
  }

  updateVisibleColumns( keys: string[] ) {
    const columns = this.datatableOptions.columns.map( dt => {
      dt.visible = keys.indexOf( dt.prop ) > -1;
      return dt;
    } );
    this.datatableOptions = { ...this.datatableOptions, columns: columns };
  }
  parseDate(date){
    return moment(date).format('LL')
  }

  getStatus( dataRow: DatatableRow ) {

    switch ( dataRow.order.generalStatus ) {
      case Orders.GeneralOrderStatus.INPROCESS:
        return 'EN PROCESO';
      case Orders.GeneralOrderStatus.EXECUTED:
        return 'EJECUTADA';
      default:
        return 'CANCELADA';
    }
  }

  updateResults( model: Object ) {
    
    const queries: Database.DatabaseQuery[] = Object.keys( model ).map( key => {

      if ( key.startsWith( '$' ) ) {

        if ( key.indexOf( 'order' ) !== -1 ) {

          return {
            key: key
              .slice( 1 )
              .split( '$' )
              .join( '.' ),
            value: Number( model[ key ] ),
            relation: Database.DatabaseQueryRelation.Equal,
          };
        }

        return {
          key: key
            .slice( 1 )
            .split( '$' )
            .join( '.' ),
          value: model[ key ],
          relation: Database.DatabaseQueryRelation.Contains,
        };

      } else {

        return {
          key,
          value: model[ key ],
          relation: Database.DatabaseQueryRelation.Equal,
        };
      }
    } );

    this.filtersApplied = queries.map( query => ( { label: query.value, query } ) );
    this.currentPage = 0;

    this.displayFilterLabel();

    this.observable( this.requestSvc.getRequestsByQueries( [
      ...this.baseQueries,
      ...this.filtersApplied.map( filter => filter.query ),
      {
        key: 'order.executors.id',
        value: this.currentExecutor.id,
        relation: Database.DatabaseQueryRelation.Equal
      }
    ] ) ).subscribe( requests => {

      this.observable( this.requestSvc.getRequestsByQueries( [
        ...this.baseQueries,
        ...this.filtersApplied.map( filter => filter.query ),
        {
          key: 'suborders.executors.id',
          value: this.currentExecutor.id,
          relation: Database.DatabaseQueryRelation.Equal,
        } ] ) ).subscribe( suborders => {

          if ( suborders ) {
            requests = [
              ...requests,
              ...suborders.filter( subOrder => !requests.some( request => request.id === subOrder.id ) )
            ];
          }
          this.loadRequests( requests );
        } );
    } );
  }

  openRBarFromTableData() {
    this.mainSvc.toogleRBar.next( {
      datatableColumns: this.datatableOptions.columns,
      filterOptions: [
        this.formSvc.selectInput( 'speciality', 'Especialidad', this.requestSvc.specialityOptions(), false ),
        this.formSvc.textInput( '$name', 'Nombre paciente', '', false ),
        this.formSvc.textInput( '$patient$document', 'Documento paciente ex', '', false ),
        this.formSvc.selectInput(
          '$order$generalStatus', 'Estado de solicitud',
          this.requestSvc.statusOptionsExecutor(),
          false
        )
      ],
      filterModel: this.filtersApplied
        .map( filter => {
          if ( filter.query.relation === Database.DatabaseQueryRelation.Contains ) {
            return { [ `$${ filter.query.key.split( '.' ).join( '$' ) }` ]: filter.query.value };
          } else {

            if ( filter.query.key === 'order.generalStatus' ) {
              return { [ `$${ filter.query.key.split( '.' ).join( '$' ) }` ]: filter.query.value };
            }

            return { [ filter.query.key ]: filter.query.value };
          }
        } )
        .reduce( ( $1, $2 ) => ( { ...$1, ...$2 } ), {} ),
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

  removeFilter( index: number ) {

    this.filtersApplied.splice( index, 1 );
    this.filterParsers.splice( index, 1 );
    this.currentPage = 0;

    this.observable( this.requestSvc.getRequestsByQueries( [
      ...this.baseQueries,
      ...this.filtersApplied.map( filter => filter.query ),
    {
      key: 'order.executors.id',
      value: this.currentExecutor.id,
      relation: Database.DatabaseQueryRelation.Equal
    }
    ] ) ).subscribe( requests => {

      this.observable( this.requestSvc.getRequestsByQueries( [
        ...this.baseQueries,
      {
        key: 'suborders.executors.id',
        value: this.currentExecutor.id,
        relation: Database.DatabaseQueryRelation.Equal,
      } ] ) ).subscribe( suborders => {

        if ( suborders ) {
          requests = [
            ...requests,
            ...suborders.filter( subOrder => !requests.some( request => request.id === subOrder.id ) )
          ];
        }
        if ( requests.length ) {
          this.loadRequests( requests );
        }

      } );
    } );
  }

  displayFilterLabel() {

    this.filterParsers = this.filtersApplied.map( filter => {

      if ( filter.query.key === 'order.generalStatus' ) {

        return this.getLabelStatusOptions( filter.query.value );
      }

      return filter.label;
    } );

  }

  getLabelStatusOptions( value: string ): string {
    const statusOptions = this.requestSvc.statusOptionsExecutor();

    return statusOptions.find( statusOption => statusOption.value === value ).label as string;
  }

  openOrder( request: any ) {
    this.mainSvc.toogleModal.next(
      this.ordersSvc.executeOrderEvent( request.request, request[ 'index' ], $order => {
        request.order = $order;
        if ( request[ 'index' ] === -1 ) {
          request.request.order = $order;
        } else {
          if ( request.request.suborders[ request[ 'index' ] ] ) {
            request.request.suborders[ request[ 'index' ] ] = $order;
          }
        }
        $order.generalStatus = Number( $order.generalStatus );
        if (
          request.order.generalStatus === Orders.GeneralOrderStatus.INPROCESS &&
          $order.generalStatus === Orders.GeneralOrderStatus.EXECUTED
        ) {
          this.notificationSvc
            .send(
              'Orden ejecutada',
              `
          ${this.currentExecutor.name } ha ejecutado exitosamente la orden ${ $order.id } de la solicitud ${ request.request.id }.
          `,
              'soto@tresastronautas.com'
            )
            .subscribe( response => {
              if ( response.success ) {
                this.logger.log( 'Message sent' );
              } else {
                this.logger.error( response.message );
              }
            } );
        }
        const requests = this.datatableOptions.rows as Orders.Request[];
        const requestIndex = requests.findIndex( r => r.id === request.id );
        requests.splice( requestIndex, 1, request );
        this.datatableOptions = { ...this.datatableOptions, rows: requests };
        this.requestSvc.saveRequest( request.request ).subscribe();
      } )
    );
  }

  /// this void returns a string with the diffecence betwen
  /// today and the expiration date ofthe order
  diffDays( order: Orders.Order ) {
    if ( order.expirationDate ) {
      const diffDays = moment( order.expirationDate ).diff( moment(), 'days' );
      return diffDays + ' días restantes / ';
    } else {
      const diffDays = moment( order.createdAt )
        .add( 5, 'days' )
        .diff( moment(), 'days' );
      return diffDays + ' días restantes / ';
    }
  }

  responseDate( order: Orders.Order ): number {
    return order.expirationDate;
  }

  date( order ): number {
    return order.authorizationDate;
  }

  /// this void returns a class for the row
  diffDaysColor( order: Orders.Order ) {
    let _class = '';
    if ( order.expirationDate ) {
      const totalDays = Math.abs( moment( order.authorizationDate ).diff( moment( order.expirationDate ), 'days' ) );
      const diffDays = Math.abs( moment( order.authorizationDate ).diff( moment(), 'days' ) );
      const ratio = diffDays / totalDays;
      if ( ratio < 0.5 ) {
        _class = '';
      } else if ( ratio < 0.8 ) {
        _class = '-orange';
      } else {
        _class = '-red';
      }
    } else if ( !order.appointmentDate ) {
      _class = '-orange';
    }
    return _class;
  }

  /// this void returns a class for the progress-bar
  diffDaysBar( order: Orders.Order ) {
    let _class = 'progress-bar';
    if ( order.authorizationDate ) {
      const totalDays = Math.abs( moment( order.authorizationDate ).diff( moment( order.expirationDate ), 'days' ) );
      const diffDays = Math.abs( moment( order.authorizationDate ).diff( moment(), 'days' ) );
      const ratio = diffDays / totalDays;
      if ( ratio < 0.5 ) {
        _class = 'progress-bar';
      } else if ( ratio < 0.8 ) {
        _class = 'progress-bar -orange';
      } else {
        _class = 'progress-bar -red';
      }
    } else {
      const diffDays = Math.max( 5 - moment( moment() ).diff( order.createdAt, 'days' ), 0 );
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

  diffDaysPercentage( order: Orders.Order ) {
    if ( order.expirationDate ) {
      const totalDays = Math.abs( moment( order.authorizationDate ).diff( moment( order.expirationDate ), 'days' ) );
      const diffDays = Math.abs( moment( order.authorizationDate ).diff( moment(), 'days' ) );
      return ( diffDays / totalDays ) * 100;
    } else {
      const diffDays = Math.max( 5 - moment( moment() ).diff( order.createdAt, 'days' ), 0 );
      return ( diffDays / 5 ) * 100;
    }
  }
}
