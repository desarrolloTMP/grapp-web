import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, combineLatest } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Files, Collections } from 'grapp-common-se';
import { Database } from '3a-common';

@Injectable()
export class ImageService {
  private _cachedFiles: { [ _: string ]: Files.InnerFile; } = {};

  constructor( private http: HttpClient, private db: Database.DatabaseService ) { }

  inlineSVG( fileRoute: string, fill?: string ): Observable<string> {
    return this.http.get( `assets/${ fileRoute }.svg`, { responseType: 'text' } ).pipe(
      map( data => {
        if ( fill ) {
          return `data:image/svg+xml;utf8,${ data.replace( new RegExp( 'fill:.*;' ), `fill: ${ fill };` ) }`;
        } else {
          return `data:image/svg+xml;utf8,${ data }`;
        }
      } )
    );
  }

  uploadFile( file: File ): Observable<string> {
    const formData = new FormData();
    formData.append( 'file', file, file.name );
    return this.http.post<any>( `${ environment.serverURL }/upload`, formData ).pipe(
      map( result => {
        this._cachedFiles[ result._id ] = result;
        return result._id;
      } )
    );
  }

  uploadMultiplesFiles( fileList ): Observable<string[]> {
    const allData: Observable<any>[] = [];

    for ( let i = 0; i < fileList.length; i++ ) {
      const file = fileList[ i ];

      if ( file.size >= 5000000 ) {
        continue;
      }

      if ( file[ '_id' ] ) {
        allData.push( of( file[ '_id' ] ) );
        continue;
      }

      const formData = new FormData();

      formData.append( 'file', file, file.name );

      allData.push(
        this.http.post<any>( `${ environment.serverURL }/upload`, formData ).pipe(
          map( result => {
            this._cachedFiles[ result._id ] = result;
            return result._id;
          } )
        )
      );
    }

    return combineLatest( allData );
  }

  /**
   * Download File info from collection
   */
  downloadFile( id: string ): Observable<Files.InnerFile> {

    if ( this._cachedFiles[ id ] ) {
      return of( this._cachedFiles[ id ] );
    } else {
      return this.db.get<Files.InnerFile>( id, { name: Collections.FILES } ).pipe(

        tap( file => {
          if ( id !== '' && file ) {
            this._cachedFiles[ id ] = file;
          } else {
            this._cachedFiles[ id ] = {
              _id: '',
              data: '',
              name: 'Archivo no encontrado',
              path: '',
            };
          }
        } )
      );
    }

  }

  disableAllPatients(){
    return this.http.get<any>( `${ environment.serverURL }/patients/update`)
  }
}
