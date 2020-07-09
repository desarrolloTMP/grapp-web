import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from 'src/app/shared.module';
import { ExecutorComponent } from './executor.component';
import { ExecutorService } from './services/executor.service';
import { ExecutorRoutingModule } from './executor.routes';
import { FormsModule } from '@angular/forms';

@NgModule({
    declarations: [ExecutorComponent],
    imports: [CommonModule, ExecutorRoutingModule, SharedModule, FormsModule],
    exports: [],
    providers: [ExecutorService],
})
export class ExecutorModule { }
