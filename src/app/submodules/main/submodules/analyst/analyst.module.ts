import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared.module';
import { AnalystComponent } from './analyst.component';
import { AnalystService } from './services/analyst.service';
import { AnalystRoutingModule } from './analyst.routes';
import { FormsModule } from '@angular/forms';

@NgModule({
    declarations: [AnalystComponent],
    imports: [CommonModule, AnalystRoutingModule, SharedModule, FormsModule],
    exports: [],
    providers: [AnalystService],
})
export class AnalystModule { }
