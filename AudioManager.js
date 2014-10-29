(function(window){
    
    define([], function() {
        'use strict';
        
        /**
         *  Audio Track Prototype
         */
        function AudioTrack(AudioContext) {
            var t = this;
            this.type = 'AudioTrack';
            this.playing = false;
            this.audioUrl = '';
            this.Buffer = AudioContext.createBufferSource();
            this.Gain = AudioContext.createGain();
            this.Analyser = AudioContext.createScriptProcessor(1024,1,1);
            this.db = 0;
            this.loudness = 0;
            
            // Connect the nodes
            this.Buffer.connect(this.Gain);
            this.Gain.connect(this.Analyser);
            this.Analyser.connect(AudioContext.destination);
            this.Gain.connect(AudioContext.destination);
            
            //this.Analyser.onaudioprocess = this.processAnalyser;
            this.Analyser.onaudioprocess = function(e){
                var out = e.outputBuffer.getChannelData(0);
                var int = e.inputBuffer.getChannelData(0);
                var max = 0;
                
                for(var i = 0; i < int.length; i++){
                    out[i] = 0;//prevent feedback and we only need the input data
                    max = int[i] > max ? int[i] : max;
                }
                this.loudness = Math.round(max*100);
                this.db = 20*Math.log(Math.max(max,Math.pow(10,-72/20)))/Math.LN10;
            };
            
        };
        AudioTrack.prototype.setBuffer = function(bfr, audioUrl) {
            this.Buffer.buffer = bfr;
            if (typeof audioUrl != 'undefined') {
                this.audioUrl = audioUrl;
            } else {
                this.audioUrl = '';
            }
        };
        AudioTrack.prototype.stop = function() {
            this.Buffer.stop();
            this.playing = false;
        };
        AudioTrack.prototype.start = function(t) {
            this.Buffer.start(t);
            this.playing = true;
        };
        AudioTrack.prototype.currentTime = function() {
            return this.Buffer.currentTime;
        };
        AudioTrack.prototype.setGain = function(g) {
            if (g >= 0 && g <=1) {
                this.Gain.gain.value = g;
            } else if (g > 1 && g <=100) {
                this.Gain.gain.value = g/100;
            }
        };
        AudioTrack.prototype.mute = function() {
            if (this.Gain.gain.value > 0) {
                this.Gain.gain.value = 0;
            } else {
                this.Gain.gain.value = 1;
            }
        };
        
        
        
        
        
        
        
        /**
         *  Global variables in the main class
         */
        var AudioManager = {};
        AudioManager.AudioTracks = [];
        AudioManager.AudioTrackReferences = [];
        AudioManager.Buffers = [];
        
        // Prepare the  audio context
        var AudioContextClass = (window.AudioContext 
                                ||  window.webkitAudioContext 
                                || window.mozAudioContext 
                                || window.oAudioContext 
                                || window.msAudioContext);
        if (AudioContextClass) {
            // Web Audio API is available.
            AudioManager.AudioContext = new AudioContextClass();
        } else {
            AudioManager.AudioContext = false;
        }
        
        
        /**
         *  Play different kind of audio
         */
        AudioManager.PlayAmbience = function(params) {
            AudioManager.StartAudio({
                audioUrl : params.audioUrl,
                trackId: 3
            });
        };
        AudioManager.PlayDialogLine = function() { };
        AudioManager.PlayMusic = function() { };

        
        /**
         *  Audio Buffer Managment:
         *  Preload
         *  PreloadRequest
         *  Unload
         */
        AudioManager.Preload = function(audioUrlList, callback) {
            var do_callback = false;
            for(var i = 0; i < audioUrlList.length; i++) {
                if (i+1 == audioUrlList.length) {
                    do_callback = callback;
                }
                AudioManager.PreloadRequest(audioUrlList[i], i, do_callback);
            }
            
        };
        AudioManager.PreloadRequest = function(audioUrl, i, callback) {
            var request = new XMLHttpRequest();
            request.open('GET', audioUrl, true);
            request.responseType = 'arraybuffer';
            request.onload = function() {
                AudioManager.AudioContext.decodeAudioData(
                    request.response,
                    function(buffer) {
                        // Do if data is decoded
                        if (!buffer) {
                            return;
                        }
                        
                        AudioManager.Buffers[audioUrl] = buffer;
                        
                        if (typeof callback == 'function') {
                            callback(AudioManager.Buffers);
                        }
                        
                    },
                    function(er) {
                        // Do if data could not be decoded
                    }
                );
            };
            request.send();
        };
        AudioManager.Unload = function(audioUrl) {
            if (typeof AudioManager.Buffers[audioUrl] != 'undefined') {
                AudioManager.Buffers[audioUrl] = null;
                delete AudioManager.Buffers[audioUrl];
            }
        };
        
        
        /**
         *  Handle Audio:
         *  StartAudio
         *  StopAudio
         */
        AudioManager.StartAudio = function(params) {
            
            var audioUrl;
            if (typeof params == "string") {
                audioUrl = params;
                params = {audioUrl: audioUrl};
            } else {
                audioUrl = params.audioUrl;
            }
            
            if (typeof params.trackId != "number") {
                // no audio track specified
                // get new track id
                params.trackId = AudioManager.GetEmptyAudioTrack();
            } else if (typeof AudioManager.AudioTracks[params.trackId] != 'object') {
                // track id is specified but there is no track
                // create track
                AudioManager.CreateAudioTrack(params.trackId);
            } else if (typeof AudioManager.AudioTracks[params.trackId] == 'object' && AudioManager.AudioTracks[params.trackId].currentTime() > 0) {
                // Track id is specified, there is a track but it is playing
                // stop it
                AudioManager.AudioTracks[params.trackId].stop();
            }
            
                        
            if (typeof AudioManager.Buffers[audioUrl] != 'undefined') {
                // The audio is already preloaded
                // Play it
                AudioManager.AudioTracks[params.trackId].setBuffer(AudioManager.Buffers[audioUrl], audioUrl);
                if (typeof params.onended == "function") {
                    AudioManager.AudioTracks[params.trackId].Buffer.onended = params.onended;
                }
                AudioManager.AudioTracks[params.trackId].start(0); 
                if (typeof params.onstart == "function") {
                    params.onstart(params.trackId);
                }
                
                // console.log(AudioManager.AudioTracks);
                
            } else {
                // The audio needs to be loaded first
                
                AudioManager.Preload([audioUrl], function(obj) {
                    AudioManager.StartAudio(params);
                });
            }
            return params.trackId;
        };
        AudioManager.StopAudio = function(params) {
            if (typeof params == 'undefined') { var params = {}; }
            var trackId = (typeof params.trackId != "undefined") ? params.trackId : false;
            if (trackId >= 0 && typeof AudioManager.AudioTracks[trackId] != 'undefined' && typeof AudioManager.AudioTracks[trackId] != null) {
                AudioManager.AudioTracks[trackId].stop();
            } else {
                for (var i = 0; i < AudioManager.AudioTracks.length; i++) {
                    if (typeof AudioManager.AudioTracks[i] != 'undefined' && typeof AudioManager.AudioTracks[i] != null) {
                        AudioManager.AudioTracks[i].Buffer.onended = void(0);
                        AudioManager.AudioTracks[i].stop();
                    }
                }
            }
        };
        AudioManager.GetCurrentTime = function(trackId) {
            if (typeof AudioManager.AudioTracks[trackId] == "object") {
                return AudioManager.AudioTracks[trackId].currentTime();
            } else {
                return 0;
            }
        };
        
        
        
        /**
         * Track management in the AudioManager class
         */
        AudioManager.GetEmptyAudioTrack = function() {
            
            var trackId = 0;
            while (typeof AudioManager.AudioTracks[trackId] == 'object') {
                trackId++;
            }
            //if (typeof AudioManager.AudioTracks[trackId] != 'undefined' && AudioManager.AudioTracks[trackId].currentTime() > 0) {
            //    AudioManager.AudioTracks[trackId].stop();
            //}
            AudioManager.AudioTracks[trackId] = null;
            return AudioManager.CreateAudioTrack(trackId);
        };
        AudioManager.CreateAudioTrack = function(trackId) {
            if (typeof AudioManager.AudioTracks[trackId] == "undefined" || AudioManager.AudioTracks[trackId] == null) {
                AudioManager.AudioTracks[trackId] = new AudioTrack(AudioManager.AudioContext);
            }
            return trackId;
        };
        
        
        /**
         *  Visual Mixer
         */
        AudioManager.MixerUpdatesPerSec = 30;
        AudioManager.MixerContainer = null;
        AudioManager.InitMixer = function(containerSelector) {
            if (typeof containerSelector == 'undefined' || !document.querySelector(containerSelector)) {
                // Create the mixer container
                var containerSelector = '#AudioManagerMixer';
                var mixerDiv = document.createElement('div');
                mixerDiv.id = 'AudioManagerMixer';
                mixerDiv.style.position = 'absolute';
                mixerDiv.style.top = '5px';
                mixerDiv.style.left = '5px';
                mixerDiv.style.background = '#FFFFFF';
                mixerDiv.style.borderRadius = '5px';
                mixerDiv.style.padding = '5px';
                mixerDiv.style.zIndex = '1000';
                // mixerDiv.style.display = 'none';
                document.body.appendChild(mixerDiv);
                AudioManager.AddEvent(document,'keydown',function(e) {
                    if (e.keyCode == 77) {
                        AudioManager.ToggleMixer();
                    }
                });
            }
            AudioManager.MixerContainer = document.querySelector(containerSelector);
            AudioManager.UpdateMixer();
        };
        AudioManager.UpdateMixer = function() {
            var html;
            for (var i = 0; i < AudioManager.AudioTracks.length; i++) {
                if (typeof AudioManager.AudioTracks[i] != 'undefined') {
                    
                    //  Build the track (if needed)
                    if (!document.querySelector("#track-"+i)) {
                        html = '';
                        html += '<div class="track" id="track-'+i+'">';
                            if (i>0) {
                                html += '<div style="height: 10px;"></div>';
                            }
                            html += '<div>';
                            html += '<span class="track-id" style="display: inline-block; font-weight: bold;"></span>';
                            html += '<span class="track-buttons" style="display: inline-block; padding-left: 10px;">';
                            html += '<input type="button" id="track-btn-'+i+'-playstop" data-track-id="'+i+'" value="Stop Audio" style="font-size: 10px; height: 18px;">';
                            html += '&nbsp;';
                            html += '<input type="button" id="track-btn-'+i+'-mute" data-track-id="'+i+'" value="Mute" style="font-size: 10px; height: 18px;">';
                            html += '</span>';
                            html += '</div>';
                            html += '<p class="track-url"></p>';
                            html += '<p class="track-volume"></p>';
                            html += '<div style="padding: 5px 10px 5px 0;">';
                                html += '<div class="track-meter" style="height: 15px; border: 1px solid #888888; width: 100%;"></div>';
                            html += '</div>';
                            
                        html += '</div>';
                        AudioManager.MixerContainer.innerHTML = html;
                        
                        // Create events
                        AudioManager.AddEvent(document.querySelector('#track-btn-'+i+'-playstop'),'click',function() {
                            var i = parseInt(this.getAttribute("data-track-id"));
                            AudioManager.AudioTracks[i].stop();
                        });
                        
                        AudioManager.AddEvent(document.querySelector('#track-btn-'+i+'-mute'),'click',function() {
                            var i = parseInt(this.getAttribute("data-track-id"));
                            AudioManager.AudioTracks[i].mute();
                        });
                        
                    }
                    
                    //
                    //  Update the track
                    //
                    document.querySelector("#track-"+i+" .track-id").innerHTML = 'Track '+i;
                    if (typeof AudioManager.AudioTracks[i].Gain.gain.value != 'undefined') {
                        document.querySelector("#track-"+i+" .track-volume").innerHTML = 'Volume: ' + AudioManager.AudioTracks[i].Gain.gain.value;
                        if (AudioManager.AudioTracks[i].Gain.gain.value == 0) {
                            document.querySelector('#track-btn-'+i+'-mute').style.borderStyle = 'inset';
                        } else {
                            document.querySelector('#track-btn-'+i+'-mute').style.borderStyle = 'outset';
                        }
                    }
                    if (typeof AudioManager.AudioTracks[i].audioUrl != 'undefined' && AudioManager.AudioTracks[i].audioUrl != '') {
                        document.querySelector("#track-"+i+" .track-url").innerHTML = AudioManager.AudioTracks[i].audioUrl;
                    }
                    if (typeof AudioManager.AudioTracks[i].Analyser.loudness != 'undefined') {
                        document.querySelector("#track-"+i+" .track-meter").innerHTML = '<div style="width: '
                                                            + AudioManager.AudioTracks[i].Analyser.loudness
                                                            + '%; background-color: green; height: 100%"></div>';
                    }
                    
                    
                }
            }
            
            setTimeout(function(){ AudioManager.UpdateMixer() }, Math.round(1000/AudioManager.MixerUpdatesPerSec));
        };
        AudioManager.AddEvent = function(elem,evtype,callback) {
            if (elem.addEventListener) {
                elem.addEventListener(evtype,callback,false);
            } else if (elem.attachEvent) {
                elem.attachEvent('on'+evtype,callback); 
            }
        };
        AudioManager.ToggleMixer = function() {
            if ((AudioManager.MixerContainer.style.display == "none")) {
                AudioManager.MixerContainer.style.display = 'block';
            } else {
                AudioManager.MixerContainer.style.display = 'none';
            }
        }
        
        
        return AudioManager;
    });
    
})(window)