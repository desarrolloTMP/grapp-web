import { Injectable } from '@angular/core';
import { Papa } from 'ngx-papaparse';
import { CSVParser } from '../coordinator.models';
import { ModalEvent, Modals } from 'src/app/models/navigation';
import { Observable, from } from 'rxjs';
import { Database } from '3a-common';
import { map } from 'rxjs/operators';

const BATCH_PROCESS_SIZE = 50;
const BATCH_CHUNK_SIZE = 93;

export interface CSVImportResult {
  pending: any[];
}

@Injectable()
export class CSVService {
  constructor(private papa: Papa, private db: Database.DatabaseService) {}

  /**
   * Confirm a CSV import
   */
  importAndSaveCSV(file: File, parser: CSVParser, progress?: (p: number) => void): Observable<CSVImportResult> {
    return from(
      new Promise<CSVImportResult>((resolve, _) => {
        const options = {
          complete: (results: any, innerFile: any) => {
            const data = (results.data as any[]).filter(
              res => Object.values(res).reduce((partialString, v) => `${partialString}${v}`, '') !== ''
            );
              // console.log('data: ', data)
              // console.log('parser: ', parser)
              // console.log('progress: ', progress)
            this.saveRawDataFromCSV(data, parser, data.length, progress).then(resolve);
          },
          header: true,
          // dynamicTyping: true,
          skipEmptyLines: true,
        };
        // console.log('FILE: ', file)
        // console.log('options: ', options)
        this.papa.parse(file, options);
      })
    );
  }

  /**
   * Create a CSV Import event
   */
  csvImportEvent(parser: CSVParser, callback?: (response: CSVImportResult) => void, progress?: (p: number) => void): ModalEvent {
    return {
      type: Modals.CSV,
      payload: parser,
      confirmation: {
        text: '',
        callback: (helper: { files: FileList }) => {
          return this.importAndSaveCSV(helper.files[0], parser, progress).pipe(
            map(response => {
              if (callback) {
                callback(response);
              }
              return true;
            })
          );
        },
      },
    };
  }

  /**
   * Save a chunk of data received in a CSV Read
   */
  saveRawDataFromCSV(
    data: any[],
    parser: CSVParser,
    totalData: number,
    progress?: (p: number) => void,
    itemsProccessed: number = 0
  ): Promise<CSVImportResult> {
    return new Promise<CSVImportResult>((resolve, reject) => {
      const pendingImports = [];
      let jobs = Math.min(Math.ceil(data.length / BATCH_PROCESS_SIZE), BATCH_PROCESS_SIZE);
      for (let i = 0; i < BATCH_PROCESS_SIZE && data.length; i++) {
        const chunk = [];
        for (let j = 0; j < BATCH_CHUNK_SIZE && j < data.length; j++) {
          let item: Object = {};
          const d = data.shift();
          for (const mapper of parser.mapper) {
            item = this.assignValueToKey(
              item,
              mapper.targetKey.split('.'),
              mapper.parser ? mapper.parser(d[mapper.originalKey], item) : d[mapper.originalKey]
            );
          }
          if (!parser.filter || parser.filter(item)) {
            chunk.push(item);
          }
          itemsProccessed++;
          if (parser.itemsProccessed) {
            parser.itemsProccessed.next(itemsProccessed);
          }
          if (parser.progress) {
            parser.progress.next(itemsProccessed / totalData);
          }
          if (progress) {
            progress(itemsProccessed / totalData);
          }
        }
        console.log('chunk: ', chunk)
        this.db.batchSave(chunk, { name: parser.collection }, true, parser.identityField).subscribe(saved => {
          jobs--;
          if (jobs === 0) {
            if (data.length) {
              this.saveRawDataFromCSV(data, parser, totalData, progress, itemsProccessed).then(partialResults => {
                resolve({
                  pending: [...pendingImports, partialResults.pending],
                });
              });
            } else {
              resolve({
                pending: pendingImports,
              });
            }
          }
        });
      }
    });
  }

  private assignValueToKey(target: Object, keySegments: string[], value: any): Object {
    const currentKeySegment = keySegments.shift();
    if (keySegments.length === 0) {
      target[currentKeySegment] = value;
      return target;
    } else {
      target[currentKeySegment] = target[currentKeySegment] || {};
      target[currentKeySegment] = this.assignValueToKey(target[currentKeySegment], keySegments, value);
      return target;
    }
  }
}
