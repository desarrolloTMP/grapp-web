import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { Users, Orders } from 'grapp-common-se';
import { DatatableOptions, FormService } from 'ngx-3a';
import { Database } from '3a-common';
import { RequestService } from '../../services/request.service';
import { MainService } from '../../services/main.service';
import { RBarResponse, FilterParser, FilterConfig } from '../../models/rbar';
import { BaseComponent } from 'src/app/components/base/base.component';
import * as moment from 'moment';

@Component({
  selector: 'app-analyst',
  templateUrl: './analyst.component.html',
})
export class AnalystComponent extends BaseComponent implements OnInit {
  @ViewChild('dateTemplate') dateTemplate: TemplateRef<any>;
  @ViewChild('dateExpirationTemplate') dateExpirationTemplate: TemplateRef<any>;
  @ViewChild('cumplimientoTemplate') cumplimientoTemplate: TemplateRef<any>;
  @ViewChild( 'estadoTemplate' ) estadoTemplate: TemplateRef<any>;

  datatableOptions: DatatableOptions;
  filtersApplied: FilterConfig[] = [];
  filterParsers: string[];
  filter_text: string;
  currentPage = 0;
  initial_date = {};
  final_date = '';

  constructor(private requestSvc: RequestService, private mainSvc: MainService, private formSvc: FormService) {
    super();
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.searchRequests();
  }

  searchRequests() {
    const searchResponse = this.requestSvc.getRequestsByQueries([]);
    this.observable(searchResponse).subscribe(requests => {
      if (requests) {
        this.loadRequests(requests);
      }
    });
    this.filtersApplied = [];
  }

  loadRequests(requests: Orders.Request[]) {
    const query = this.filtersApplied.map( filter => filter.query );
    requests = this.filterQueriesByOrderGeneralStatus( requests, query );

    const datatableOptions = this.datatableOptions ? { ...this.datatableOptions } : new DatatableOptions();
    datatableOptions.rows = requests
      .sort(($1, $2) => {
        const $1Priority = $1.requestType === Orders.RequestType.TUTELA || $1.requestType === Orders.RequestType.HOSP;
        const $2Priority = $2.requestType === Orders.RequestType.TUTELA || $2.requestType === Orders.RequestType.HOSP;
        if ($1Priority) {
          if ($2Priority) {
            return $1.order.expirationDate
              ? $2.order.expirationDate
                ? $1.order.expirationDate - $2.order.expirationDate
                : 1
              : $1.createdAt - $2.createdAt;
          }
          return -1;
        }
        if ($2Priority) {
          return 1;
        }
        return $1.order.expirationDate
          ? $2.order.expirationDate
            ? $1.order.expirationDate - $2.order.expirationDate
            : 1
          : $1.createdAt - $2.createdAt;
      })
      .filter(req => (
        req.status !== Orders.RequestStatus.DELETED
       ) );

    datatableOptions.columnMode = 'force';
    datatableOptions.columns = this.datatableOptions
      ? this.datatableOptions.columns
      : [
          {
            prop: 'patient.name',
            name: 'Nombre Paciente',
          },
          {
            prop: 'patient.document',
            name: 'Documento Paciente',
          },
          {
            prop: 'createdAt',
            name: 'Fecha de ingreso',
            cellTemplate: this.dateTemplate,
          },
          {
            prop: 'order.expirationDate',
            name: 'Fecha Máx. Respuesta',
            cellTemplate: this.dateExpirationTemplate,
          },
          {
            prop: 'order',
            name: 'Terminadas/Total',
            cellTemplate: this.cumplimientoTemplate,
          },
          {
            prop: 'status',
            name: 'Estado',
            cellTemplate: this.estadoTemplate
          }
        ];

    datatableOptions.rowClass = (data: Orders.Request) => {
      return this.diffDaysColor(data);
    };
    this.datatableOptions = datatableOptions;
  }

  updateVisibleColumns(keys: string[]) {
    const columns = this.datatableOptions.columns.map(dt => {
      dt.visible = keys.indexOf(dt.prop) > -1;
      return dt;
    });
    this.datatableOptions = { ...this.datatableOptions, columns: columns };
  }

  updateResults(model: Object) {

    let isInitEndDateEqual: boolean;
    let queries: Database.DatabaseQuery[] = Object.keys(model).map(key => {
      if (key.startsWith('$')) {
        return {
          key: key
            .slice(1)
            .split('$')
            .join('.'),
          value: model[key],
          relation: Database.DatabaseQueryRelation.Contains,
        };
      } else if ( key === 'initial_date' ) {

        return {
          key: 'createdAt',
          value: (model[key] as moment.Moment).valueOf(),
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
          value: (model[key] as moment.Moment).valueOf(),
          relation: Database.DatabaseQueryRelation.Lesser,
        };

      } else {

        if ( key === 'status' && isNaN( Number( model[ key ] ) ) ) {


          let value: number;
          // model[ key ] / i.e = order-1
          switch ( Number( model[ key ].split( '-' )[ 1 ] ) ) {
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
          value: key === 'status' ? Number(model[key]) : model[key],
          relation: Database.DatabaseQueryRelation.Equal,
        };
      }
    });

    this.filtersApplied = queries.map(query => ({ label: query.value, query }));
    this.currentPage = 0;

    this.displayFilterLabel();

    /**
     * After the filter is matched set the filter with the final date run
     * one day when the initial and final dates are equal
     */
    if ( isInitEndDateEqual ) { queries = this.refactorQueryInitEndDate( queries, model ); }

    this.requestSvc.getRequestsByQueries(queries).subscribe(requests => {
      if (requests) {
        this.loadRequests(requests);
      }
    });
  }

  /**
  * Request array with status key renamed to order.generalStatus
  *
  * @param requests Request array
  * @param queries DatabaseQuery array
  * @returns Request array
  */
  filterQueriesByOrderGeneralStatus( requests: Orders.Request[], queries: Database.DatabaseQuery[] ): Orders.Request[] {

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

        if ( filter.query.key === 'order.generalStatus' ) {

          return this.getLabelStatusOptions( `order.generalStatus-${ filter.query.value }` );
        }

        return filter.label;
      }

    } );
  }

  statusTemplate( request: Orders.Request ) {

    if ( request.status == 1 && this.validateStatus( request ) ) {

      switch ( request.order.generalStatus ) {
        case Orders.GeneralOrderStatus.INPROCESS:
          return 'EN PROCESO';
        case Orders.GeneralOrderStatus.EXECUTED:
          return 'EJECUTADA';
        default:
          return 'CANCELADA';
      }

    } else {

      switch ( request.status ) {
        case Orders.RequestStatus.CANCELED:
          return 'NO AUTORIZADO';
        case Orders.RequestStatus.REGISTERED:
          return 'PENDIENTE ANÁLISIS';
        case Orders.RequestStatus.DONE:
          return 'FINALIZADA';
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

          if ( filter.query.key === 'order.generalStatus' ) {

            filter.query.value = `${ filter.query.key }-${ filter.query.value }`
            filter.query.key = 'status'
          }

          return { [ filter.query.key ]: filter.query.value };
        }
      } )
      .reduce( ( $1, $2 ) => ( { ...$1, ...$2 } ), {} );


    this.mainSvc.toogleRBar.next({
      datatableColumns: this.datatableOptions.columns,

      filterOptions,
      filterModel,
      confirmation: {
        text: '',
        callback: (response: RBarResponse) => {
          this.updateVisibleColumns(response.columns);
          this.updateResults(response.filterResults);
          return true;
        },
      },
    });
  }

  removeFilter(index: number) {
    this.filtersApplied.splice(index, 1);
    this.filterParsers.splice( index, 1 );
    this.currentPage = 0;

    const query = this.filtersApplied.map( filter => filter.query );

    this.requestSvc.getRequestsByQueries( query ).subscribe(requests => {
      if (requests) {
        this.loadRequests(requests);
      }
    });
  }

  loadMoreData() {
    const query = this.filtersApplied.map( filter => filter.query );

    this.requestSvc.getRequestsByQueries( query, ++this.currentPage).subscribe(requests => {
      if (requests) {
        const current = this.datatableOptions.rows as Orders.Request[];
        this.loadRequests([...current, ...requests]);
      }
    });
  }

  openRequest(request: Orders.Request) {
    this.mainSvc.toogleModal.next(
      this.requestSvc.analyzeRequestEvent(request, savedRequest => {
        const requests = this.datatableOptions.rows as Orders.Request[];
        const requestIndex = requests.findIndex(r => r.id === savedRequest.id);
        if (savedRequest.order.authorizationDate && savedRequest.status === Orders.RequestStatus.DONE) {
          requests.splice(requestIndex, 1);
        } else {
          requests.splice(requestIndex, 1, savedRequest);
        }
        this.datatableOptions = { ...this.datatableOptions, rows: requests };
      })
    );
  }



  getLabelStatusOptions( value: string ): string {
    const statusOptions = this.requestSvc.statusOptionsAnalistCoordinator();

    return statusOptions.find( statusOption => statusOption.value === value ).label as string;
  }

  /// this void returns a string with the diffecence betwen
  /// today and the expiration date ofthe order
  diffDays(request: Orders.Request) {
    if (request.order.expirationDate) {
      const diffDays = moment(request.order.expirationDate).diff(moment(), 'days');
      return diffDays + ' días restantes / ';
    } else {
      const diffDays = moment(request.createdAt)
        .add(5, 'days')
        .diff(moment(), 'days');
      return diffDays + ' días restantes / ';
    }
  }

  responseDate(request: Orders.Request): number {
    return (
      request.order.expirationDate ||
      moment(request.createdAt)
        .add(5, 'days')
        .valueOf()
    );
  }

  /// this void returns a class for the row
  diffDaysColor(request: Orders.Request) {
    let _class = '';
    if (request.order.expirationDate) {
      const totalDays = Math.abs(moment(request.order.authorizationDate).diff(moment(request.order.expirationDate), 'days'));
      const diffDays = Math.abs(moment(request.order.authorizationDate).diff(moment(), 'days'));
      const ratio = diffDays / totalDays;
      if (ratio < 0.5) {
        _class = '';
      } else if (ratio < 0.8) {
        _class = '-orange';
      } else {
        _class = '-red';
      }
    } else {
      _class = '-orange';
    }
    return _class;
  }

  /// this void returns a class for the progress-bar
  diffDaysBar(request: Orders.Request) {
    let _class = 'progress-bar';
    if (request.order.authorizationDate) {
      const totalDays = Math.abs(moment(request.order.authorizationDate).diff(moment(request.order.expirationDate), 'days'));
      const diffDays = Math.abs(moment(request.order.authorizationDate).diff(moment(), 'days'));
      const ratio = diffDays / totalDays;
      if (ratio < 0.5) {
        _class = 'progress-bar';
      } else if (ratio < 0.8) {
        _class = 'progress-bar -orange';
      } else {
        _class = 'progress-bar -red';
      }
    } else {
      const diffDays = Math.max(5 - moment(moment()).diff(request.createdAt, 'days'), 0);
      if (diffDays < 3) {
        _class = 'progress-bar -red ';
      } else if (diffDays < 5) {
        _class = 'progress-bar -orange';
      } else {
        _class = 'progress-bar';
      }
    }
    return _class;
  }

  diffDaysPercentage(request: Orders.Request) {
    if (request.order.expirationDate) {
      const totalDays = Math.abs(moment(request.order.authorizationDate).diff(moment(request.order.expirationDate), 'days'));
      const diffDays = Math.abs(moment(request.order.authorizationDate).diff(moment(), 'days'));
      return (diffDays / totalDays) * 100;
    } else {
      const diffDays = Math.max(5 - moment(moment()).diff(request.createdAt, 'days'), 0);
      return (diffDays / 5) * 100;
    }
  }

  getCumplimientoOrders(order: Orders.Request) {
    let doneOrders = 0,
      allOrdets = 1;
    if (order.order.generalStatus >= 1) {
      doneOrders++;
    }
    if (order.suborders) {
      allOrdets = allOrdets + order.suborders.length;
      for (let i = 0; i < order.suborders.length; i++) {
        if (order.suborders[i].generalStatus >= 1) {
          doneOrders++;
        }
      }
    }
    return doneOrders + '/' + allOrdets;
  }
}
