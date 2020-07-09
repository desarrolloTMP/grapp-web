import { AssistantComponent } from './assistant.component';
import { AssistantRoutingModule } from './assistant.routes';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from 'src/app/shared.module';

@NgModule({
  declarations: [AssistantComponent],
  imports: [CommonModule, AssistantRoutingModule, FormsModule, SharedModule],
  exports: [],
  providers: [],
})
export class AssistantModule {}
