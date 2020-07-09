import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { DatatableOptions } from 'ngx-3a';
import { BaseComponent } from 'src/app/components/base/base.component';
import { RequestService } from 'src/app/submodules/main/services/request.service';
import { RequestStatus } from 'grapp-common-se/dist/orders';
import * as moment from 'moment';
import { MainService } from 'src/app/submodules/main/services/main.service';
import { RBarResponse, FilterConfig, FilterParser } from 'src/app/submodules/main/models/rbar';
import { Database } from '3a-common';
import { UsersService } from 'src/app/submodules/main/services/users.service';
@Component({
    selector: 'app-coordinator-analytics',
    templateUrl: './analytics.component.html',
    styles: [`
  :host nb-layout-column:first-child {
    background: #FFFFFF;
  }
  :host nb-layout-column:last-child {
    background: #FFFFFF;
  }
`],
    changeDetection: ChangeDetectionStrategy.Default,
})
export class AnalyticsComponent extends BaseComponent implements OnInit {
    // view: any[] = [400, 400];

    _dataStatus: any[] = [];
    _dataDays: any[] = [];
    filtersApplied: FilterConfig[] = [];
    filterParsers: { [_: string]: FilterParser } = {};

    // options
    showLegend = true;
    colorScheme = {
        domain: ['#ff7b6a', '#ffd6c0', '#a77bca', '#1976d2']
    };
    // pie
    pieLegendTitle = 'Estado';
    showLabels = true;
    explodeSlices = false;
    doughnut = false;
    // bar
    showXAxis = true;
    showYAxis = true;
    gradient = false;
    showLegendBar = true;
    showXAxisLabel = true;
    xAxisLabel = 'Peticiones';
    xAxisLabelDays = 'Peticiones por dia';
    showYAxisLabel = false;
    totalVotosBarChart: any = 0;

    constructor(private requestsSvc: RequestService,
        private mainSvc: MainService, private requestSvc: RequestService) {
        super();
    }
    onSelect(event) {
    }
    ngOnInit(): void {
        this.getRequest([]);
        this.filterParsers['status'] = this.requestSvc.statusFilterParser();
    }

    /*
    get all requests for data base
    */
    getRequest(queries) {
        const options = new DatatableOptions();
        let jobs = 1;
        const finalCallback = () => {
            jobs--;
            if (jobs === 0) {
                this.requestsSvc.getRequestsByQueries(queries).subscribe(requests => {
                    this.loadResults(requests);
                });
            }
        };
        options.displayName = `Preguntas`;
        finalCallback();
    }

    loadResults(requests) {
        let registered = 0;
        let aprooved = 0;
        let sent = 0;
        let done = 0;
        let cancelled = 0;
        let lunes = 0, martes = 0, miercoles = 0, jueves = 0, viernes = 0;
        requests.forEach((option) => {
            switch (option['status']) {
                case RequestStatus.REGISTERED:
                    registered++;
                    break;
                case RequestStatus.APROOVED:
                    aprooved++;
                    break;
                case RequestStatus.SENT:
                    sent++;
                    break;
                case RequestStatus.DONE:
                    done++;
                    break;
                case RequestStatus.CANCELED:
                    cancelled++;
                    break;
            }
            switch (moment(option['createdAt']).isoWeekday()) {
                case 1:
                    lunes++;
                    break;
                case 2:
                    martes++;
                    break;
                case 3:
                    miercoles++;
                    break;
                case 4:
                    jueves++;
                    break;
                case 5:
                    viernes++;
                    break;
            }
        });

        this._dataDays = [
            {
                'name': 'Lunes',
                'value': lunes
            },
            {
                'name': 'Martes',
                'value': martes
            },
            {
                'name': 'Miercoles',
                'value': miercoles
            },
            {
                'name': 'Jueves',
                'value': jueves
            },
            {
                'name': 'Viernes',
                'value': viernes
            },
        ];

        this._dataStatus = [
            {
                'name': 'Registradas',
                'value': registered
            },
            {
                'name': 'Aprobadas',
                'value': aprooved
            },
            {
                'name': 'Enviadas',
                'value': sent
            },
            {
                'name': 'Terminadas',
                'value': done
            },
            {
                'name': 'Canceladas',
                'value': cancelled
            },
        ];

    }
    /*
    returns the list with data for the Request Status chart
   */
    data() {
        return this._dataStatus;
    }
    /**
     * returns the list with data for the 'Peticiones por dia' chart
     */
    days() {
        return this._dataDays;
    }

    openRBarFromTableData() {
        this.mainSvc.toogleRBar.next({
            datatableColumns: [],
            filterOptions: this.requestsSvc.getRequestFilterFields(),
            filterModel: this.filtersApplied
                .map(filter => {
                    if (filter.query.relation === Database.DatabaseQueryRelation.Contains) {
                        return { [`$${filter.query.key.split('.').join('$')}`]: filter.query.value };
                    } else {
                        return { [filter.query.key]: filter.query.value };
                    }
                })
                .reduce(($1, $2) => ({ ...$1, ...$2 }), {}),
            confirmation: {
                text: '',
                callback: (response: RBarResponse) => {
                    this.updateResults(response.filterResults);
                    return true;
                },
            },
        });
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
                    relation: Database.DatabaseQueryRelation.Contains,
                };
            } else if (key === 'createdAt') {
                return {
                    key: key,
                    value: (model[key] as moment.Moment).valueOf(),
                    relation: Database.DatabaseQueryRelation.Greater,
                };
            } {
                return {
                    key: key === 'cups' ? 'order.cups.codeDescription'
                        : (key === 'cie10' ? 'order.cie10.codeDescription' : (key === 'city' ? 'patient.address.city' : key)),
                    value: key === 'status' ? Number(model[key]) : model[key],
                    relation: Database.DatabaseQueryRelation.Equal,
                };
            }
        });
        this.filtersApplied = queries.map(query => ({ label: query.value, query }));
        this.requestsSvc.getRequestsByQueries(queries).subscribe(requests => {
            if (requests) {
                this.loadResults(requests);
            }
        });
    }

    removeFilter(index: number) {
        this.filtersApplied.splice(index, 1);
        this.requestsSvc.getRequestsByQueries(this.filtersApplied.map(filter => filter.query)).subscribe(users => {
            if (users) {
                this.loadResults(users);
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
}
