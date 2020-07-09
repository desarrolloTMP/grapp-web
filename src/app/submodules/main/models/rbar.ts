import { DatatableColumn } from 'ngx-3a';
import { Action } from 'src/app/models/navigation';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Database } from '3a-common';
/**
 * Interface for config the rbar event
 */
export interface RBarEvent {
  filterOptions: FormlyFieldConfig[];
  filterModel?: Object;
  datatableColumns: DatatableColumn[];
  confirmation?: Action;
  cancelation?: Action;
}

export interface RBarResponse {
  columns: string[];
  filterResults: Object;
}

export interface FilterConfig {
  label: string;
  query: Database.DatabaseQuery;
}

export type FilterParser = (value: any) => string;
