import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DockConnectionService } from './core/dock-connection.service';
import {
  acceptLegal,
  hasAcceptedLegal,
  LEGAL_BANNER,
} from './core/legal-notice';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit, OnDestroy {
  private readonly connection = inject(DockConnectionService);

  protected readonly title = signal('NOA Guardian');
  protected readonly legalBanner = LEGAL_BANNER;
  protected readonly showLegalBanner = signal(!hasAcceptedLegal());
  /** Misma señal que la vista Session: el pill jamás dice otra cosa. */
  protected readonly estado = this.connection.estado;

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.connection.refresh();
    this.timer = setInterval(() => {
      if (!document.hidden) void this.connection.refresh();
    }, 30_000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected dismissLegalBanner(): void {
    acceptLegal();
    this.showLegalBanner.set(false);
  }
}
