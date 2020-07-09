import { BehaviorSubject } from 'rxjs';
import { Database } from '3a-common';

export interface CSVParserMapper {
  targetKey: string;
  originalKey: string;
  parser?: (_: any, partialItem?: any) => any;
}

export interface CSVParser {
  title: string;
  collection: string;
  mapper: CSVParserMapper[];
  filter?: (row: any) => boolean;
  progress?: BehaviorSubject<number>;
  itemsProccessed?: BehaviorSubject<number>;
  identityField?: string;
}
