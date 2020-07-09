import { Component, OnInit, ViewChild, TemplateRef, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { Users, Clinics } from 'grapp-common-se';
import { DatatableOptions } from 'ngx-3a';
import { MainService } from 'src/app/submodules/main/services/main.service';
import { BaseComponent } from 'src/app/components/base/base.component';
import { CSVService } from '../../services/csv.service';
import { CSVParser } from '../../coordinator.models';
import { CodablesService } from 'src/app/submodules/main/services/codables.service';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Database } from '3a-common';
import { ExcelService } from 'src/app/services/excel.service';

@Component({
  selector: 'app-coordinator-cups',
  templateUrl: './cups.component.html',
  // changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CupsComponent extends BaseComponent implements OnInit {
  currentCoordinator: Users.User;
  datatableOptions: DatatableOptions;
  filter_text: string;
  currentPage = 0;
  searchDiffer: Subject<string> = new Subject<string>();
  exporting = false;
  @ViewChild('dateTemplate') dateTemplate: TemplateRef<any>;
  // @ViewChild('userTypeTemplate') userTypeTemplate: TemplateRef<any>;

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

    this.codablesSvc.getCUPSByQuieries().subscribe(cups => {
      if (cups) {
        this.loadCUPS(cups);
      }
    } );

    this.searchDiffer.pipe(debounceTime(500)).subscribe(query => this.applySearch(query));
  }

  handlerSearch( event: Event ) {
    this.filter_text = event.target[ 'value' ];
    this.searchDiffer.next( event.target['value'] );
  }

  handlerScroll() {
    this.loadMoreData(false, _ => _, false, this.filter_text );
  }

  applySearch( query: string ) {
    this.currentPage = 0;

    this.codablesSvc
      .getCUPSByQuieries(
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
          this.loadCUPS(cups);
        }
      });
  }

  loadCUPS(cups: Clinics.CUPS[]) {
    const datatableOptions = this.datatableOptions ? { ...this.datatableOptions } : new DatatableOptions();
    datatableOptions.rows = cups;

    datatableOptions.columns = this.datatableOptions
      ? this.datatableOptions.columns
      : [
          {
            prop: 'code',
            name: 'Código CUPS',
          },
          {
            prop: 'codeDescription',
            name: 'Descripción completa',
          },
        ];
    this.datatableOptions = datatableOptions;
    // this.currentPage = 0;
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

  /**
   * Open an import modal
   */
  openImport() {
    const parser: CSVParser = {
      title: 'Importar CUPS',
      collection: 'Cups',
      identityField: 'code',
      //filter: cups => !cups.disabled,
      mapper: [
        { targetKey: 'name', originalKey: 'CUPS', parser: cie => cie.split(' ')[1] },
        { targetKey: 'code', originalKey: 'CUPS', parser: cie => cie.split(' ')[0] },
        //{ targetKey: 'disabled', originalKey: 'Excluido', parser: excluded => excluded === '1' },
        { targetKey: 'codeDescription', originalKey: 'CUPS' },
      ],
    };
    this.mainSvc.toogleModal.next(this.csvSvc.csvImportEvent(parser, undefined));
  }

  loadMoreData( recursive: boolean = false, recursionDone?: ( items: any[] ) => void, firstCall = true, query?: string ) {
    this.codablesSvc.getCUPSByQuieries( query || query === ''
      ? [
        {
          key: 'codeDescription',
          relation: Database.DatabaseQueryRelation.Contains,
          value: query,
        },
      ]
      : [], ++this.currentPage ).subscribe( cups => {

      if (cups && cups.length) {
        const current = this.datatableOptions.rows as any[];

        if ( recursive ) {

          if ( firstCall ) {
            cups = [ ...current, ...cups ];
          }

          this.loadMoreData(
            recursive,
            partial => {
              recursionDone([...cups, ...partial]);
            },
            false,
            this.filter_text
          );

        } else {

          this.loadCUPS([...current, ...cups]);
        }
      } else if ( recursive ) {
        if ( firstCall ) {
          recursionDone( this.datatableOptions.rows as any[] );
        } else {
          recursionDone([]);
        }
      }
    });
  }

  openCUPS(cups: Clinics.CUPS) {
    this.mainSvc.toogleModal.next(
      this.codablesSvc.addCUPSEvent(cups, $cups => {
        const cupsList = this.datatableOptions.rows as Clinics.CUPS[];
        const index = cupsList.findIndex(c => c.code === $cups.code);
        if (index > -1) {
          cupsList.splice(index, 1, $cups);
          this.datatableOptions = { ...this.datatableOptions, rows: cupsList };
        }
      })
    );
  }

  exportExcel() {
    this.exporting = true;
    const currentRealPage = this.currentPage;

    this.loadMoreData( true, fullItems => {

      const excelData = fullItems.map( _ => {
        return {
          'CODIGO CUPS': _.code,
          'DESCRIPCION COMPLETA': _.codeDescription,
        };
      } );

      this.excelSvc.exportAsExcelFile(excelData, 'Cups');
      this.exporting = false;
      this.currentPage = currentRealPage;

    }, true, this.filter_text);
  }
}
