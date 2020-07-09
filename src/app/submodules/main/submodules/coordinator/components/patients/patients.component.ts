import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Users } from 'grapp-common-se';
import { DatatableOptions, Logger } from 'ngx-3a';
import { FilterConfig, FilterParser, RBarResponse } from 'src/app/submodules/main/models/rbar';
import { MainService } from 'src/app/submodules/main/services/main.service';
import { Database } from '3a-common';
import { PatientService } from 'src/app/submodules/main/services/patient.service';
import { BaseComponent } from 'src/app/components/base/base.component';
import { CSVService } from '../../services/csv.service';
import { CSVParser } from '../../coordinator.models';
import { ExcelService } from 'src/app/services/excel.service';
import * as moment from 'moment';

@Component({
  selector: 'app-coordinator-patients',
  templateUrl: './patients.component.html',
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinatorPatientsComponent extends BaseComponent implements OnInit {
  currentCoordinator: Users.User;
  datatableOptions: DatatableOptions;
  filtersApplied: FilterConfig[] = [];
  filterParsers: string[];
  filter_text: string;
  currentSearchPage = 0;
  exporting = false;
  @ViewChild('dateTemplate') dateTemplate: TemplateRef<any>;
  @ViewChild('userActiveTemplate') userActiveTemplate: TemplateRef<any>;

  constructor(
    private patientSvc: PatientService,
    private mainSvc: MainService,
    private changeDetector: ChangeDetectorRef,
    private csvSvc: CSVService,
    private excelSvc: ExcelService
  ) {
    super();

    this.filterParsers = [];
  }

  ngOnInit(): void {
    this.patientSvc.getPatientsByQueries().subscribe(patients => {
      if (patients) {
        this.loadUsers(patients);
      }
    });

    this.filterParsers['active'] = b => (b ? 'Activo' : 'Inactivo');
  }

  loadUsers(users: Users.Patient[]) {
    const datatableOptions = this.datatableOptions ? { ...this.datatableOptions } : new DatatableOptions();
    datatableOptions.rows = users;
    datatableOptions.columns = this.datatableOptions
      ? this.datatableOptions.columns
      : [
          {
            prop: 'name',
            name: 'Nombre usuario',
          },
          {
            prop: 'email',
            name: 'Correo electrónico',
          },
          {
            prop: 'document',
            name: 'Documento',
          },
          {
            prop: 'createdAt',
            name: 'Fecha de ingreso',
            cellTemplate: this.dateTemplate,
          },
          {
            prop: 'active',
            name: 'MIAS',
            cellTemplate: this.userActiveTemplate,
          },
        ];
    this.datatableOptions = datatableOptions;
    this.changeDetector.detectChanges();
  }

  updateVisibleColumns(keys: string[]) {
    const columns = this.datatableOptions.columns.map(dt => {
      dt.visible = keys.indexOf(dt.prop) > -1;
      return dt;
    });
    this.datatableOptions = { ...this.datatableOptions, columns: columns };
    this.changeDetector.detectChanges();
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
      } else {
        return {
          key,
          value: key === 'userType' ? Number(model[key]) : key === 'active' ? model[key] === 'Activo' : model[key],
          relation: Database.DatabaseQueryRelation.Equal,
        };
      }
    });
    this.filtersApplied = queries.map(query => ({ label: query.value, query }));
    this.currentSearchPage = 0;

    this.displayFilterLabel();

    this.patientSvc.getPatientsByQueries(queries).subscribe(users => {
      if (users) {
        this.loadUsers(users);
      }
    });
  }

  openRBarFromTableData() {
    this.mainSvc.toogleRBar.next({
      datatableColumns: this.datatableOptions.columns,
      filterOptions: this.patientSvc.getPatientsFilterFields(),
      filterModel: this.filtersApplied
        .map(filter => {
          if (filter.query.relation === Database.DatabaseQueryRelation.Contains) {
            return { [`$${filter.query.key.split('.').join('$')}`]: filter.query.value };
          } else {
            return {
              [filter.query.key]: filter.query.key === 'active' ? (filter.query.value ? 'Activo' : 'Inactivo') : filter.query.value,
            };
          }
        })
        .reduce(($1, $2) => ({ ...$1, ...$2 }), {}),
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
    this.currentSearchPage = 0;

    this.patientSvc.getPatientsByQueries(this.filtersApplied.map(filter => filter.query)).subscribe(users => {
      if (users) {
        this.loadUsers(users);
      }
    });
  }

  displayFilterLabel( ) {
    this.filterParsers = this.filtersApplied.map( filter => {

      if ( filter.query.key === 'createdAt' ) {

        return new Date( filter.label ).toDateString();
      } else {

        return filter.label;
      }

    } );
  }

  openUser(user?: Users.Patient) {
    this.mainSvc.toogleModal.next(
      this.patientSvc.addPatientEvent(user, savedUser => {
        const users = this.datatableOptions.rows as Users.Patient[];
        if (user && (user.id || user['_id'])) {
          const userIndex = users.findIndex(u => u.id === savedUser.id || u['_id'] === savedUser.id);
          users.splice(userIndex, 1, savedUser);
        } else {
          users.unshift(savedUser);
        }
        this.datatableOptions = { ...this.datatableOptions, rows: users };
      })
    );
  }

  loadMoreData( recursive: boolean = false, recursionDone?: ( items: any[] ) => void, firstCall = true ) {

    this.patientSvc.getPatientsByQueries(this.filtersApplied.map(filter => filter.query), ++this.currentSearchPage).subscribe(users => {
      if (users && users.length) {
        const currentUsers = this.datatableOptions.rows as Users.Patient[];
        if (recursive) {
          if (firstCall) {
            users = [...currentUsers, ...users];
          }
          this.loadMoreData(
            recursive,
            partial => {
              recursionDone([...users, ...partial]);
            },
            false
          );
        } else {
          this.loadUsers([...currentUsers, ...users]);
        }
      } else if (recursive) {
        if ( firstCall ) {
          recursionDone( this.datatableOptions.rows as any[] );
        } else {
          recursionDone( [] );
        }
      }
    });
  }

  /**
   * Open an import modal
   */
  openImport() {
    const parser: CSVParser = {
      title: 'Importar pacientes',
      collection: 'Patients',
      identityField: 'document',
      mapper: [
        {
          targetKey: 'name',
          originalKey: 'NOMBRE',
        },
        { targetKey: 'document', originalKey: 'NUMERO_IDENTIFICACION' },
        { targetKey: 'phone', originalKey: 'TELEFONO' },
        { targetKey: 'active', originalKey: 'ESTADO', parser: _ => true },
        {
          targetKey: 'address.city',
          originalKey: 'MUNICIPIO/RESIDENCIA',
          //parser: mun => mun.split('/')[0],
        },
        {
          targetKey: 'address.state',
          originalKey: 'ESTADO',
          parser: state => (state === 'AC' ? 'Antioquia' : 'Córdoba'),
        },
        {
          targetKey: 'address.country',
          originalKey: 'ESTADO',
          parser: _ => 'Colombia',
        },
        {
          targetKey: 'account',
          originalKey: 'RÉGIMEN/NIVEL',
        },
      ],
    };
    //console.log('netst: ', this.csvSvc.csvImportEvent(parser, undefined))
    this.mainSvc.toogleModal.next(this.csvSvc.csvImportEvent(parser, undefined));
  }

  exportExcel () {
    this.exporting = true;
    const currentRealPage = this.currentSearchPage;

    this.loadMoreData( true, fullItems => {
      const excelData = fullItems.map(_ => {
        return {
          'NOMBRE USUARIO': _.name,
          'CORREO ELECTRONICO': _.email,
          'DOCUMENTO': _.document,
          'TELEFONO': _.phone,
          'FECHA INGRESO': moment(_.createdAt).locale('en').format('MMMM DD, YYYY'),
          'ROL': _.active ? 'Activo' : 'Inactivo' ,
        };
      } );

      this.excelSvc.exportAsExcelFile(excelData, 'Patients');
      this.exporting = false;
      this.currentSearchPage = currentRealPage;
    }, true);
  }
}
