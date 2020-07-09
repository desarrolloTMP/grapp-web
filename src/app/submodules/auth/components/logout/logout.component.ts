import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from 'ngx-3a';
import { Router } from '@angular/router';
import { timer } from 'rxjs';

@Component({
  selector: 'app-logout',
  template: ``,
})
export class LogoutComponent implements OnInit {
  constructor(private auth: AuthenticationService, private router: Router) {}

  ngOnInit(): void {
    this.auth.signOut(done => {
      if (done) {
        timer(1000).subscribe(() => this.router.navigateByUrl('/auth').then(() => location.reload()));
      }
    });
  }
}
