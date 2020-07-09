import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { DoctorService } from './services/doctor.service';
import { Users, Orders } from 'grapp-common-se';
import { DatatableOptions, FormService } from 'ngx-3a';
import { Database } from '3a-common';
import { RequestService } from '../../services/request.service';
import { MainService } from '../../services/main.service';
import { RBarResponse, FilterParser, FilterConfig } from '../../models/rbar';
import { BaseComponent } from 'src/app/components/base/base.component';
import { AuthorizationService } from '../../services/authorization.service';
import * as moment from 'moment';
import { RequestType } from 'grapp-common-se/dist/orders';

@Component({
  selector: 'app-doctor',
  templateUrl: './doctor.component.html',
  styleUrls: ['./doctor.component.scss']
})
export class DoctorComponent extends BaseComponent implements OnInit {
  currentDoctor: Users.Doctor;
  datatableOptions: DatatableOptions;
  filtersApplied: FilterConfig[] = [];
  filterParsers: { [_: string]: FilterParser } = {};
  filter_text: string;
  currentPage = 0;
  template:any
  @ViewChild('dateTemplate') dateTemplate: TemplateRef<any>;

  constructor(
    private doctorService: DoctorService,
    private requestSvc: RequestService,
    private mainSvc: MainService,
    private formSvc: FormService,
    private authorizationSvc: AuthorizationService
  ) {
    super();
  }

  ngOnInit(): void {
    super.ngOnInit();
    this.filterParsers['status'] = this.requestSvc.statusFilterParser();
    this.doctorService.doctor.subscribe(doctor => {
      this.currentDoctor = doctor;
      if (doctor) {
        this.searchRequests();
      }
    });
  }

  searchRequests() {
    const searchResponse = this.requestSvc.getRequestsByDoctor(
      this.currentDoctor
    );
    
    this.observable(searchResponse[0]).subscribe(requests => {
      if (requests) {
        this.loadRequests(requests);
      }
    });

    this.filtersApplied = searchResponse[1].map(query => ({
      label: query.value,
      query
    }));
  }

  loadMoreData() {
    this.requestSvc
      .getRequestsByQueries(
        [
          {
            key: 'imported',
            value: true,
            relation: Database.DatabaseQueryRelation.NotEqual
          },
          ...this.filtersApplied.map(filter => filter.query)
        ],
        ++this.currentPage
      )
      .subscribe(requests => {
        if (requests) {
          const current = this.datatableOptions.rows as Orders.Request[];
          this.loadRequests([...current, ...requests]);
        }
      });
  }

  loadRequests(requests: Orders.Request[]) {
    const datatableOptions = this.datatableOptions
      ? { ...this.datatableOptions }
      : new DatatableOptions();
    datatableOptions.rows = requests
      .sort(($1, $2) => {
        const $1Priority =
          $1.requestType === Orders.RequestType.TUTELA ||
          $1.requestType === Orders.RequestType.HOSP;
        const $2Priority =
          $2.requestType === Orders.RequestType.TUTELA ||
          $2.requestType === Orders.RequestType.HOSP;
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
      .filter( req => (
        req.status !== Orders.RequestStatus.DONE &&
        req.status !== Orders.RequestStatus.DELETED
      ) );

    datatableOptions.columnMode = 'force';

    datatableOptions.columns = this.datatableOptions
      ? this.datatableOptions.columns
      : [
          {
            prop: 'name',
            name: 'Nombre paciente'
          },
          {
            prop: 'patient.document',
            name: 'Documento paciente'
          },
          {
            prop: 'requestType',
            name: 'Tipo de solicitud'
          },
          {
            prop: 'createdAt',
            name: 'Plazo para responder',
            cellTemplate: this.dateTemplate
          },
          {
            prop: 'speciality',
            name: 'Especialidad',
            visible: false
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
    const queries: Database.DatabaseQuery[] = Object.keys(model).map(key => {
      if (key.startsWith('$')) {
        return {
          key: key
            .slice(1)
            .split('$')
            .join('.'),
          value: model[key],
          relation: Database.DatabaseQueryRelation.Contains
        };
      } else {
        return {
          key,
          value: key === 'status' ? Number(model[key]) : model[key],
          relation: Database.DatabaseQueryRelation.Equal
        };
      }
    });

    this.filtersApplied = queries.map(query => ({ label: query.value, query }));
    this.currentPage = 0;

    this.requestSvc
      .getRequestsByQueries(
        queries.concat({
          key: 'imported',
          value: true,
          relation: Database.DatabaseQueryRelation.NotEqual
        })
      )
      .subscribe(requests => {
        if (requests) {
          this.loadRequests(requests);
        }
      });
  }

  openRBarFromTableData() {
    this.mainSvc.toogleRBar.next({
      datatableColumns: this.datatableOptions.columns,
      filterOptions: [
        this.formSvc.selectInput(
          'speciality',
          'Especialidad',
          this.requestSvc.specialityOptions(),
          false
        ),
        this.formSvc.selectInput(
          'status',
          'Estado de solicitud',
          this.requestSvc.statusOptionsDoctor(),
          false
        ),
        this.formSvc.textInput('$name', 'Nombre paciente', '', false),
        this.formSvc.textInput(
          '$patient$document',
          'Documento paciente',
          '',
          false
        )
      ],
      filterModel: this.filtersApplied
        .map(filter => {
          if (
            filter.query.relation === Database.DatabaseQueryRelation.Contains
          ) {
            return {
              [`$${filter.query.key.split('.').join('$')}`]: filter.query.value
            };
          } else {
            return { [filter.query.key]: filter.query.value };
          }
        })
        .reduce(($1, $2) => ({ ...$1, ...$2 }), {}),
      confirmation: {
        text: '',
        callback: (response: RBarResponse) => {
          this.updateVisibleColumns(response.columns);
          this.updateResults(response.filterResults);
          return true;
        }
      }
    });
  }

  removeFilter(index: number) {
    this.filtersApplied.splice(index, 1);
    this.currentPage = 0;
    this.requestSvc
      .getRequestsByQueries([
        {
          key: 'imported',
          value: true,
          relation: Database.DatabaseQueryRelation.NotEqual
        },
        ...this.filtersApplied.map(filter => filter.query)
      ])
      .subscribe(requests => {
        if (requests) {
          this.loadRequests(requests);
        }
      });
  }

  displayFilterLabel(filter: FilterConfig) {
    if (this.filterParsers[filter.query.key]) {
      return this.filterParsers[filter.query.key](filter.label);
    } else {
      return filter.label;
    }
  }


  openRequest(request: Orders.Request) {
    this.mainSvc.toogleModal.next(
      this.authorizationSvc.requestAuthorizationEvent(request, savedRequest => {
        const requests = this.datatableOptions.rows as Orders.Request[];
        const requestIndex = requests.findIndex(r => r.id === savedRequest.id);
        requests.splice(requestIndex, 1, savedRequest);
        this.datatableOptions = { ...this.datatableOptions, rows: requests };
      })
    );
  }

  /// this void returns a string with the diffecence betwen
  /// today and the creation date ofthe order
  diffDays(data) {
    let message = '';
    if (data.createdAt) {
      const diffDays = moment(moment()).diff(data.createdAt, 'days');
      if (
        data.requestType === RequestType.HOSP ||
        data.requestType === RequestType.TUTELA
      ) {
        message = 1 - diffDays + ' días ';
      } else {
        message = 5 - diffDays + ' días ';
      }
      return message;
    }
  }

  /// this void returns a class for the row
  diffDaysColor(data: Orders.Request) {
    let _class = '';

    // if (
    //   data.requestType === RequestType.HOSP ||
    //   data.requestType === RequestType.TUTELA
    // ) {
    //   console.log('-------HOSP TUTELA-------');

    //   _class = '-red';
    // } else {
    //   console.log('------NO HOSP TUTELA------');

    //   if (!data.order.isAuthorized && data.createdAt) {
    //     const diffDays = Math.max(
    //       5 - moment(moment()).diff(data.createdAt, 'days'),
    //       0
    //     );
    //     if (diffDays <= 3) {
    //       _class = '-red';
    //     } else if (diffDays > 3 && diffDays < 5) {
    //       _class = '-orange';
    //     } else {
    //       _class = '';
    //     }
    //   }
    // }

    if ( data.status === 4 || !data.order.isAuthorized ) {
        _class = '-red';
      } else {
        _class = '';
      }


    return _class;
  }

  /// this void returns a class for the progress-bar
  diffDaysBar(data) {
    let _class = 'progress-bar';
    if (
      data.requestType === RequestType.HOSP ||
      data.requestType === RequestType.TUTELA
    ) {
      _class = 'progress-bar -red';
    } else {
      if (data.createdAt) {
        const diffDays = Math.max(
          5 - moment(moment()).diff(data.createdAt, 'days'),
          0
        );
        if (diffDays < 3) {
          _class = 'progress-bar -red ';
        } else if (diffDays >= 3 && diffDays < 5) {
          _class = 'progress-bar -orange';
        } else {
          _class = 'progress-bar';
        }
      }
    }
    return _class;
  }

  /// this void returns a string with the diference betwen
  /// today and the expiration date ofthe order in percentage
  diffDaysPercentage(date) {
    const diffDays = Math.max(5 - moment(moment()).diff(date, 'days'), 0);
    return (diffDays / 5) * 100;
  }
}
