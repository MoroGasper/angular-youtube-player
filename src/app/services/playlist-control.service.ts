import { Injectable, ElementRef } from '@angular/core';
import { SharedService } from '../services/shared.service';
import { GlobalsService } from '../services/globals.service';

@Injectable()
export class PlaylistControlService {

  playlistPrefill = true;

  constructor(
    public shared: SharedService,
    public globals: GlobalsService,
  ) { }

  fillPlaylist() {
    if (this.playlistPrefill) {
      this.shared.getRelatedVideos().then(() => {
        this.playlistInit();
        this.playlistPrefill = false;
      });
    }
  }

  playlistInit() {
    if (localStorage.getItem('playlist') === null || localStorage.getItem('playlist').length === 0 || localStorage.getItem('playlist').length === 2) {
      this.globals.playlistVideos = this.globals.relatedVideos;
      this.shared.updatePlaylist();
    } else {
      this.shared.getPlaylist();
    }
    this.shared.findPlaylistItem();
  }

  addPlaylistItem(i: number, list: number, div?: ElementRef) {
    let listType;
    if (list === 0) {
      listType = this.globals.feedVideos[i];
    }
    if (list === 1) {
      listType = this.globals.lastSearchedVideos[i];
    }
    if (list === 2) {
      listType = this.globals.relatedVideos[i];
    }
    if (list === 3) {
      listType = this.globals.currentVideo;
    }
    if (list === 4) {
      listType = this.globals.historyVideos[i];
    }

    const playlistItem = this.globals.playlistVideos.find(item => item.id === listType.id);

    if (typeof playlistItem === 'undefined') {
      this.globals.playlistVideos.push(listType);
      this.shared.checkPlaylist();

      this.shared.triggerNotify('Added to playlist');
      this.scrollToBottom(div);
    } else {
      this.shared.triggerNotify('Video is already in playlist');
    }
  }

  scrollToBottom(div: ElementRef) {
    try {
      setTimeout( () => {
        div.nativeElement.scrollTop = div.nativeElement.scrollHeight;
      }, 200);
    } catch (err) {
      console.log(err);
      console.log('scroll issue');
    }
  }

}