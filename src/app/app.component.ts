import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { YoutubeGetVideo } from './shared/youtube.service';
import { SharedService } from './shared/lists.service';

@Component({
  selector: 'app-yt',
  templateUrl: 'app.component.html'
})

export class AppComponent implements OnInit {
  @ViewChild('playlistContainer') private myScrollContainer: ElementRef;

  notify: any;

  relatedVideos: Array<any>;
  feedVideos: Array<any>;
  playlistVideos: Array<any> = [];
  currentVideoObject: Array<any> = [];

  thumbnails = true;
  
  modal = false;
  modalPlaylistItem: number;

  playlistPrefill = true;
  currentPlaylistItem: number;
  displayVideoPlayer = true;
  repeatMode = true;
  regionCode: string;
  shareLink = '';

  player: YT.Player;

  currentVideo = {
      id: '',
      title: '',
      stats: {
        likes: '',
        dislikes: '',
        views: ''
      }
  };

  currentState = -1;
  currentMuteState = false;

  videoRangeTimer: any;
  videoCurRange = 0;
  videoMaxRange = 0;

  videoCurFull = '00:00:00';
  videoMaxFull = '00:00:00';

  videoCurVolume = -1;

  _shared: any;

  loading = true;

  constructor(
    private youtube: YoutubeGetVideo,
    private shared: SharedService,
  ) {
    this._shared = shared;
    this.notify = this._shared.notify;
  }

  ngOnInit() {
      console.log('app comp');
      this.getSettings();
      this.getFeedVideos();
  }

  // ---------------- Init player ----------------

  savePlayer(player) {
      this.player = player;
  }

  playerVars() {
    const playerVars = {
      'enablejsapi': 1,
      'controls': 1,
      'disablekb': 0,
      'showinfo': 0,
      'playsinline': 1,
      'autoplay': 0,
      'loop': 0,
      'rel': 0
    };
    return playerVars;
  }

  getFeedVideos() {
    this._shared.getFeed().subscribe(data => {
      this.feedVideos = data;
      if (!this.currentVideo.id) {
        this.setDefaultPlayer();
      }
    });
  }

  setCurrentVideoObject(data: any) {
    this.currentVideoObject = [];
    this.currentVideoObject.push(data);
  }

  setDefaultPlayer() {
      this.feedVideos = this._shared.feedVideos;
      this.setCurrentVideoObject(this.feedVideos[0]);
      this.currentVideo.id = this.feedVideos[0].id;
      this.currentVideo.title = this.feedVideos[0].snippet.title;
      this.currentVideo.stats.likes = this.feedVideos[0].statistics.likeCount;
      this.currentVideo.stats.dislikes = this.feedVideos[0].statistics.dislikeCount;
      this.currentVideo.stats.views = this.feedVideos[0].statistics.viewCount;
      this.shareLink = 'https://youtu.be/' + this.currentVideo.id;
      this.getRelatedVideos();
      this.findPlaylistItem();
  }

  onStateChange(event) {
    this.currentState = event.data;
    this.videoMaxRange = this.player.getDuration();
    this.videoCurVolume = this.player.getVolume();

    if (this.currentState === 1) {
      this.videoMaxFull = this.timeFormat(this.videoMaxRange);
      this.currentMuteState = this.player.isMuted();
      this.startRange();
    }

    if (this.currentState === 0) {
      this.stopRange();
      if (this.repeatMode) {
        if (this.playlistVideos.length) {
          this.findPlaylistItem();
          if (this.currentPlaylistItem < 0) {
            this.playPlaylistItem('next', this.currentPlaylistItem);
          } else {
            this.playPlaylistItem('next', this.currentPlaylistItem);
          }
          if (this.playlistVideos.length === 1) {
            this.player.playVideo();
          }
        } else {
          this.player.playVideo();
        }
      }
    }
  }

  startRange() {
    this.stopRange();
    this.videoRangeTimer = setInterval(() => {
      this.videoCurRange = this.player.getCurrentTime();
      this.videoCurFull = this.timeFormat(this.videoCurRange);

    }, 1000);
  }

  stopRange() {
     clearTimeout(this.videoRangeTimer);
  }

  // ---------------- Playlist settings ----------------

  playlistInit() {
      this.playlistVideos = JSON.parse(JSON.stringify(this.relatedVideos));
  }

  findPlaylistItem() {
      let playlistItem;
      if (typeof this.currentVideoObject[0].id.videoId !== 'undefined') {
        playlistItem = this.playlistVideos.find(item => item.id.videoId === this.currentVideoObject[0].id.videoId);
      } else {
        playlistItem = this.playlistVideos.find(item => item.id === this.currentVideoObject[0].id);
      }
      this.currentPlaylistItem = this.playlistVideos.indexOf(playlistItem);
  }

  playPlaylistItem(direction: string, i: number) {
    if (direction === 'next') {
      if (i < this.playlistVideos.length) {
        i += 1;
      }
      if (i === this.playlistVideos.length) {
        i = 0;
      }
    }
    if (direction === 'prev') {
      if (i === 0 || i < 0) {
        i = this.playlistVideos.length - 1;
      } else {
        i -= 1;
      }
    }
    if (this.playlistVideos.length > 0) {
      this.getVideo(this.playlistVideos[i]);
    } else {
      this._shared.triggerNotify('Playlist is empty');
      this.updateNotify();
    }
  }

  removePlaylistItem(i: number) {
      this._shared.triggerNotify('Video removed');
      this.updateNotify();
      setTimeout(() => {
        if (i === this.currentPlaylistItem) {
          this.currentPlaylistItem = -1;
        }
        this.playlistVideos.splice(i, 1);
      }, 200);
  }

  addPlaylistItem(i: number, list: number) {
      let listType;
      let playlistItem;
      if (list === 0) {
        listType = this.feedVideos[i];
      }
      if (list === 1) {
        listType = this._shared.lastSearchedVideos[i];
      }
      if (list === 2) {
        listType = this.relatedVideos[i];
      }
      if (list === 3) {
        listType = this.currentVideoObject[i];
      }

      if (typeof listType.id.videoId !== 'undefined') {
        playlistItem = this.playlistVideos.find(item => item.id.videoId === listType.id.videoId);
      } else {
        playlistItem = this.playlistVideos.find(item => item.id === listType.id);
      }

      if (typeof playlistItem === 'undefined') {
        this.playlistVideos.push(listType);
        this.findPlaylistItem();
        this._shared.triggerNotify('Added to playlist');
        this.updateNotify();
        this.scrollToBottom();
      } else {
        this._shared.triggerNotify('Video is already in playlist');
        this.updateNotify();
      }
  }

  clearPlaylist() {
      this.currentPlaylistItem = -1;
      this.playlistVideos = [];
  }

  // ---------------- Init settings ----------------

  getSettings() {
    this._shared.getSettings().subscribe(data => {
        this.regionCode = data.api_settings[1].value;
        this.thumbnails = data.form_settings[0].value;
        this.displayVideoPlayer = data.form_settings[2].value;
        this.repeatMode = data.form_settings[3].value;
    });
  }

  setSettings(data: any, from: number) {
    if (from === 0) {
      this.thumbnails = data[0].value;
      this.displayVideoPlayer = data[2].value;
      this.repeatMode = data[3].value;
    }
  }

  toggleHeadSettings(int: number) {
    if (int === 0) {
      if (this.displayVideoPlayer) {
        this.displayVideoPlayer = false;
      } else {
        this.displayVideoPlayer = true;
      }
    }
    if (int === 1) {
      if (this.repeatMode) {
        this.repeatMode = false;
      } else {
        this.repeatMode = true;
      }
    }
    if (int === 2) {
      if (this.currentMuteState) {
        this.player.unMute();
        this.currentMuteState = false;
      } else {
        this.player.mute();
        this.currentMuteState = true;
      }
    }
  }


  // ---------------- Video fetching ----------------

  onClickRelated(event: Event, i: number) {
    this.getVideo(this.relatedVideos[i]);
  }

  onClickPlaylist(event: Event, i: number) {
    this.getVideo(this.playlistVideos[i]);
  }

  getVideo(data: any) {
    const tempData = {
      id: '',
      title: '',
      thumbnail: ''
    };
    this.setCurrentVideoObject(data);
    if (data.id.videoId) {
      tempData.id = data.id.videoId;
      this.getStatsVideos(data.id.videoId);
    } else if (data.id) {
      tempData.id = data.id;
      this.getStatsVideos(data.id);
    }
    tempData.title = data.snippet.title;
    tempData.thumbnail = data.snippet.thumbnails.medium.url;
    this.playVideo(tempData);
  }

  playVideo(data: any) {
    if (data.id !== this.currentVideo.id || this.currentState === -1) {
      this.currentVideo.id = data.id;
      this.currentVideo.title = data.title;
      this._shared.addHistoryVideo(data);
      this.player.loadVideoById(this.currentVideo.id);
      this.getRelatedVideos();
      this.findPlaylistItem();
    }
  }

  getStatsVideos(query: string) {
    this.youtube.statsVideos(query).subscribe(
        result => {
          this.currentVideo.id = result.items[0].id;
          this.currentVideo.title = result.items[0].snippet.title;
          this.currentVideo.stats.likes = result.items[0].statistics.likeCount;
          this.currentVideo.stats.dislikes = result.items[0].statistics.dislikeCount;
          this.currentVideo.stats.views = result.items[0].statistics.viewCount;
          this.shareLink = 'https://youtu.be/' + this.currentVideo.id;
        },
        error => {
          console.log('error on related videos');
        }
    );
  }

  getRelatedVideos() {
    this.youtube.relatedVideos(this.currentVideo.id).subscribe(
        result => {
          this.relatedVideos = result.items;
          if (this.playlistPrefill) {
            this.playlistInit();
            this.playlistPrefill = false;
          }
        },
        error => {
          console.log('error on related videos');
        }
      );
  }

  // ---------------- Player controls ----------------

  playPauseVideo() {
    if (this.currentState === 1) {
      this.player.pauseVideo();
    } else {
      this.player.playVideo();
    }
  }

  RangeNouseDown(event: Event) {
    if (event['buttons'] === 1) {
      this.stopRange();
    }
  }

  RangeMouseUp(value: number) {
    this.player.seekTo(value, true);
    this.videoCurRange = value;
    this.startRange();
  }

  volumeRangeMouseUp(value: number) {
    if (this.currentMuteState) {
      this.player.unMute();
      this.currentMuteState = false;
    }
    this.player.setVolume(value);
  }

  // ---------------- Modal functions ----------------

  closeModal() {
    this.modal = false;
  }
  
  showModal(i: number) {
    this.modal = true;
    this.modalPlaylistItem = i;
  }
  
  confirmModal() {
    this.removePlaylistItem(this.modalPlaylistItem);
    this.modal = false;
  }
  
  // ---------------- Related functions ----------------

  scrollToBottom() {
      try {
        setTimeout( () => {
          this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
        }, 200);
      } catch (err) {
        console.log(err);
        console.log('scroll issue');
      }
  }


  copyShareLink() {
    if (!this.notify.enabled) {
      document.execCommand('Copy');
      this._shared.triggerNotify('Copied');
      this.updateNotify();
    } else {
      setTimeout(() => {
          document.execCommand('Copy');
          this._shared.triggerNotify('Copied');
          this.updateNotify();
      }, 1000);
    }
  }

  updateNotify() {
    this.notify = this._shared.notify;
    setTimeout(() => this.notify = this._shared.notify, 1000);
  }

  timeFormat(time: number) {
    const hours: any = Math.floor(time / 3600);
    const minutes: any = Math.floor(time % 3600 / 60);
    const seconds: any = Math.floor(time % 3600 % 60);
    const value = (parseInt(hours, 10) < 10 ? '0' : '' ) + parseInt(hours, 10) + ':'
              + (parseInt(minutes, 10) < 10 ? '0' : '' ) + parseInt(minutes, 10) + ':'
              + (parseInt(seconds, 10) < 10 ? '0' : '' ) + parseInt(seconds, 10);
    return value;
  }

}
