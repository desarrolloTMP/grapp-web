import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Users } from 'grapp-common-se';
import { Subject } from 'rxjs';
import { DatatableOptions } from 'ngx-3a';
import { MainService } from 'src/app/submodules/main/services/main.service';
import { Database } from '3a-common';
import { BaseComponent } from 'src/app/components/base/base.component';
import { CSVService } from '../../services/csv.service';
import { CSVParser } from '../../coordinator.models';
import { CodablesService } from 'src/app/submodules/main/services/codables.service';
import { debounceTime } from 'rxjs/operators';
import { ExcelService } from 'src/app/services/excel.service';

@Component({
  selector: 'app-coordinator-cie10',
  templateUrl: './cie10.component.html',
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CIE10Component extends BaseComponent implements OnInit {
  @ViewChild('dateTemplate') dateTemplate: TemplateRef<any>;
  @ViewChild( 'booleanTemplate' ) booleanTemplate: TemplateRef<any>;


  currentCoordinator: Users.User;
  datatableOptions: DatatableOptions;
  filter_text: string;
  currentPage = 0;
  searchDiffer: Subject<string> = new Subject<string>();
  exporting = false;

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
    this.codablesSvc.getCIE10ByQuieries().subscribe(cie10 => {
      if (cie10) {
        this.loadCIE10(cie10);
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
      .getCIE10ByQuieries(
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
      .subscribe(cie10 => {
        if (cie10) {
          this.loadCIE10(cie10);
        }
      });
  }

  loadCIE10(cie10) {
    const datatableOptions = this.datatableOptions ? { ...this.datatableOptions } : new DatatableOptions();
    datatableOptions.rows = cie10;
    datatableOptions.columns = this.datatableOptions
      ? this.datatableOptions.columns
      : [
          {
            prop: 'code',
            name: 'Código CIE10',
          },
          {
            prop: 'codeDescription',
            name: 'Descripción completa',
          },
          {
            prop: 'isOrphanDisease',
            name: 'Enfermedad huérfana',
            cellTemplate: this.booleanTemplate,
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

  loadMoreData( recursive: boolean = false, recursionDone?: ( items: any[] ) => void, firstCall = true, query?: string) {

    this.codablesSvc.getCIE10ByQuieries(
      query || query === ''
        ? [
          {
            key: 'codeDescription',
            relation: Database.DatabaseQueryRelation.Contains,
            value: query,
          },
        ]
        : [], ++this.currentPage ).subscribe( cie10 => {
      if (cie10 && cie10.length) {
        const current = this.datatableOptions.rows as any[];
        if (recursive) {
          if (firstCall) {
            cie10 = [...current, ...cie10];
          }
          this.loadMoreData(
            recursive,
            partial => {
              recursionDone([...cie10, ...partial]);
            },
            false,
            this.filter_text
          );
        } else {
          this.loadCIE10([...current, ...cie10]);
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
      title: 'Importar CIE10',
      collection: 'Cie10',
      identityField: 'code',
      mapper: [
        { targetKey: 'name', originalKey: 'Nombre' },
        { targetKey: 'code', originalKey: 'CIE -10' },
        { targetKey: 'codeDescription', originalKey: 'CIE -10', parser: (code, item) => `${code} ${item.name}` },
        { targetKey: 'isOrphanDisease', originalKey: 'Enfermedad', parser: isOD => isOD === '1' },
      ],
    };
    this.mainSvc.toogleModal.next(this.csvSvc.csvImportEvent(parser, undefined));
  }

  exportExcel() {
    this.exporting = true;
    const currentPage = this.currentPage;

    this.loadMoreData( true, fullItems => {

      const excelData = fullItems.map(_ => {
        return {
          'CODIGO CIE10': _.code,
          'DESCRIPCION COMPLETA': _.codeDescription,
          'ENFERMEDAD HUÉRFANA': _.isOrphanDisease ? 'Sí' : 'No',
        };
      } );

      this.excelSvc.exportAsExcelFile(excelData, 'CIE10');
      this.exporting = false;
      this.currentPage = currentPage;

    }, true, this.filter_text);
  }
}
