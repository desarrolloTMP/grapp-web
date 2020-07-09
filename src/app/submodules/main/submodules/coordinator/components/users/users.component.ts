import { Component, OnInit, ChangeDetectionStrategy, TemplateRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { BaseComponent } from 'src/app/components/base/base.component';
import { Users } from 'grapp-common-se';
import { DatatableOptions } from 'ngx-3a';
import { FilterConfig, FilterParser, RBarResponse } from '../../../../models/rbar';
import { Database } from '3a-common';
import { UsersService } from '../../../../services/users.service';
import { MainService } from '../../../../services/main.service';
import { ExcelService } from 'src/app/services/excel.service';
import * as moment from 'moment';

@Component({
  selector: 'app-coordinator-users',
  templateUrl: './users.component.html',
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinatorUsersComponent extends BaseComponent implements OnInit {
  currentCoordinator: Users.User;
  datatableOptions: DatatableOptions;
  filtersApplied: FilterConfig[] = [];
  filterParsers: { [_: string]: FilterParser } = {};
  filter_text: string;
  dataToExcel: any;

  @ViewChild('dateTemplate') dateTemplate: TemplateRef<any>;
  @ViewChild('userDisabledTemplate') userDisabledTemplate: TemplateRef<any>;
  @ViewChild('userTypeTemplate') userTypeTemplate: TemplateRef<any>;

  constructor(private usersSvc: UsersService, private mainSvc: MainService, private changeDetector: ChangeDetectorRef,
    private excelSvc: ExcelService) {
    super();
  }

  ngOnInit(): void {
    this.filterParsers['userType'] = filter => this.usersSvc.userTypeFilterParser()(filter.label);
    const queries: Database.DatabaseQuery[] = [
      {
        key: 'disabled',
        value: true,
        relation: Database.DatabaseQueryRelation.NotEqual,
      },
    ];
    this.filtersApplied = queries.map(query => ({ label: query.value, query }));
    this.usersSvc.getUsersByQueries(queries).subscribe(users => {
      if (users) {
        this.loadUsers(users);
      }
    });
    this.filterParsers['disabled'] = b => (b.query.relation === Database.DatabaseQueryRelation.NotEqual ? 'Habilitado' : 'Deshabilitado');
  }

  loadUsers(users: Users.User[]) {
    this.dataToExcel = users.map(_ => {
      let userType;
      switch (_.userType) {
        case 0:
          userType = 'Coordinador';
          break;
        case 1:
          userType = 'Analista';
          break;
        case 2:
          userType = 'Asistente';
          break;
        case 3:
          userType = 'Paciente';
          break;
        case 4:
          userType = 'Doctor';
          break;
        case 5:
          userType = 'Ejecutor';
          break;
        default :
          userType = 'Otro';
          break;
      }
      return {
        'NOMBRE USUARIO': _.name,
        'CORREO ELECTRONICO': _.email,
        'DOCUMENTO': _.document,
        'FECHA INGRESO': moment(_.createdAt).locale('en').format('MMMM DD, YYYY'),
        'ROL': userType,
      };
    });
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
            prop: 'userType',
            name: 'Rol',
            cellTemplate: this.userTypeTemplate,
          },
          {
            prop: 'disabled',
            name: 'Deshabilitado',
            cellTemplate: this.userDisabledTemplate,
            visible: false,
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
          value: key === 'userType' ? Number(model[key]) : key === 'disabled' ? true : model[key],
          relation:
            key === 'disabled'
              ? model[key] === 'Habilitado'
                ? Database.DatabaseQueryRelation.NotEqual
                : Database.DatabaseQueryRelation.Equal
              : Database.DatabaseQueryRelation.Equal,
        };
      }
    });
    this.filtersApplied = queries.map(query => ({ label: query.value, query }));
    this.usersSvc.getUsersByQueries(queries).subscribe(users => {
      if (users) {
        this.loadUsers(users);
      }
    });
  }

  openRBarFromTableData() {
    this.mainSvc.toogleRBar.next({
      datatableColumns: this.datatableOptions.columns,
      filterOptions: this.usersSvc.getUsersFilterFields(),
      filterModel: this.filtersApplied
        .map(filter => {
          if (filter.query.relation === Database.DatabaseQueryRelation.Contains) {
            return { [`$${filter.query.key.split('.').join('$')}`]: filter.query.value };
          } else {
            return {
              [filter.query.key]:
                filter.query.key === 'disabled'
                  ? filter.query.relation === Database.DatabaseQueryRelation.NotEqual
                    ? 'Habilitado'
                    : 'Deshabilitado'
                  : filter.query.value,
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
    this.usersSvc.getUsersByQueries(this.filtersApplied.map(filter => filter.query)).subscribe(users => {
      if (users) {
        this.loadUsers(users);
      }
    });
  }

  displayFilterLabel(filter: FilterConfig) {
    if (this.filterParsers[filter.query.key]) {
      return this.filterParsers[filter.query.key](filter);
    } else {
      return filter.label;
    }
  }

  openUser(user?: Users.User) {

    this.mainSvc.toogleModal.next(

      this.usersSvc.addUserEvent(user, savedUser => {
        const users = this.datatableOptions.rows as Users.User[];

        if (user && user.id) {

          const userIndex = users.findIndex(u => u.id === savedUser.id);
          users.splice(userIndex, 1, savedUser);
          
        } else {

          users.unshift(savedUser);
        }

        this.datatableOptions = { ...this.datatableOptions, rows: users };
      })

    );
  }

  exportExcel() {
    this.excelSvc.exportAsExcelFile(this.dataToExcel, 'Users');
  }

  // userType
}
