import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Users } from 'grapp-common-se';
import { DatatableOptions } from 'ngx-3a';
import { MainService } from 'src/app/submodules/main/services/main.service';
import { BaseComponent } from 'src/app/components/base/base.component';
import { CSVService } from '../../services/csv.service';
import { CSVParser } from '../../coordinator.models';
import { CodablesService } from 'src/app/submodules/main/services/codables.service';
import { Database } from '3a-common';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { ExcelService } from 'src/app/services/excel.service';

@Component({
  selector: 'app-coordinator-ehr',
  templateUrl: './ehr.component.html',
})
export class EhrComponent extends BaseComponent implements OnInit {
  currentCoordinator: Users.User;
  datatableOptions: DatatableOptions;
  filter_text: string;
  currentPage = 0;
  searchDiffer: Subject<string> = new Subject<string>();
  exporting = false;
  @ViewChild('dateTemplate') dateTemplate: TemplateRef<any>;

  constructor(
    private codablesSvc: CodablesService,
    private mainSvc: MainService,
    private changeDetector: ChangeDetectorRef,
    private csvSvc: CSVService,
    private excelSvc: ExcelService
  ) {
    super();
  }

  ngOnInit(): void {
    this.codablesSvc.getEhrByQuieries().subscribe(cups => {
      if (cups) {
        this.loadEHR(cups);
      }
    });
    this.searchDiffer.pipe(debounceTime(500)).subscribe(query => this.applySearch(query));
  }

  handlerSearch( event: Event ) {
    this.filter_text = event.target[ 'value' ];
    this.searchDiffer.next( event.target[ 'value' ] );
  }

  handlerScroll() {
    this.loadMoreData( false, _ => _, false, this.filter_text );
  }

  applySearch(query: string) {
    this.currentPage = 0;
    this.codablesSvc
      .getEhrByQuieries(
        query
          ? [
              {
                key: 'codeDescription',
                relation: Database.DatabaseQueryRelation.Contains,
                value: query,
              },
            ]
          : []
      )
      .subscribe(cups => {
        if (cups) {
          this.loadEHR(cups);
        }
      });
  }

  loadEHR(ehr: any[]) {
    const datatableOptions = this.datatableOptions ? { ...this.datatableOptions } : new DatatableOptions();
    datatableOptions.rows = ehr;
    datatableOptions.columns = this.datatableOptions
      ? this.datatableOptions.columns
      : [
          {
            prop: 'code',
            name: 'Número',
          },
          {
            prop: 'name',
            name: 'Enfermedad Huérfana',
          },
          {
            prop: 'cie10',
            name: 'Código CIE 10',
          },
        ];
    this.datatableOptions = datatableOptions;
    this.changeDetector.detectChanges();
  }

  loadMoreData( recursive: boolean = false, recursionDone?: ( items: any[] ) => void, firstCall = true, query?: string) {
    this.codablesSvc.getEhrByQuieries(
      query
        ? [
          {
            key: 'codeDescription',
            relation: Database.DatabaseQueryRelation.Contains,
            value: query,
          },
        ]
        : [], ++this.currentPage ).subscribe( ehr => {
      if (ehr && ehr.length) {
        const current = this.datatableOptions.rows as any[];
        if ( recursive ) {

          if (firstCall) {
            ehr = [...current, ...ehr];
          }

          this.loadMoreData(
            recursive,
            partial => {
              recursionDone([...ehr, ...partial]);
            },
            false,
            this.filter_text
          );
        } else {
          this.loadEHR([...current, ...ehr]);
        }
      } else if ( recursive ) {

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
      title: 'Importar EH-R',
      collection: 'Ehr',
      identityField: 'code',
      mapper: [
        { targetKey: 'code', originalKey: 'codigo' },
        { targetKey: 'name', originalKey: 'nombre' },
        { targetKey: 'cie10', originalKey: 'CIE10' },
        { targetKey: 'codeDescription', originalKey: 'CIE10', parser: (code, item) => `${code} ${item.name}` },
      ],
    };
    this.mainSvc.toogleModal.next(this.csvSvc.csvImportEvent(parser, undefined));
  }

  exportExcel() {
    this.exporting = true;
    const currentRealPage = this.currentPage;

    this.loadMoreData( true, fullItems => {

      const excelData = fullItems.map(_ => {
        return {
          NUMERO: _.code,
          'ENFERMEDAD HUÉRFANA': _.name,
          'CÓDIGO CIE 10': _.cie10,
        };
      } );

      this.excelSvc.exportAsExcelFile(excelData, 'EHR');
      this.exporting = false;
      this.currentPage = currentRealPage;
    }, true, this.filter_text);
  }
}
