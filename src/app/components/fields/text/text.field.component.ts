import { Component } from '@angular/core';
import { InputComponent } from 'ngx-3a';
import { timer } from 'rxjs';

@Component({
  selector: 'app-text-field',
  templateUrl: './text.field.component.html',
  styleUrls: ['./text.field.component.scss'],
  //   styleUrls: ['../../../../../../styles/app.scss', '../../../../../../styles/tables.scss', '../../forms.css']
})
export class TextComponent extends InputComponent {
  ANIMATION_TIME = 150;

  selectSuggestion(prediction: string) {
    this.formControl.setValue(prediction);
    this.selected = false;
  }

  blur() {
    timer(this.ANIMATION_TIME).subscribe(() => {
      this.selected = false;
    });
  }
}
