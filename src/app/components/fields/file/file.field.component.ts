import { Component } from '@angular/core';
import { FileComponent } from 'ngx-3a';

@Component({
  selector: 'app-file-field',
  templateUrl: './file.field.component.html',
  styleUrls: ['./file.field.component.css'],
  //   styleUrls: ['../../../../../../styles/app.scss', '../../../../../../styles/tables.scss', '../../forms.css']
})
export class File2Component extends FileComponent {

  clear() {
    this.formControl.setValue(undefined);
  }

  fileUpdates(files: File[]) {
    const keySegments = this.key.split('.');
    let segment = keySegments.shift();
    let oldFiles = this.model[ segment ];

    while (keySegments.length && oldFiles) {
      segment = keySegments.shift();
      oldFiles = oldFiles[segment];
    }

    if (oldFiles && oldFiles.length) {
      const finalFiles = [];

      for (const file of oldFiles) {
        finalFiles.push(file);
      }

      for (const file of files) {
        finalFiles.push(file);
      }

      super.fileUpdates(finalFiles);
    } else {

      super.fileUpdates(files);
    }
  }
}
