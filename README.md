## AudioManager
A JavaScript Library for playing audio on multiple tracks handeled by the Web Audio API. Designed to be used with require.js.

###How to play an audio file
```javascript
require([
    'AudioManager',
], function (
    AudioManager
) {
    "use strict";

    AudioManager.PlayAudio("http://example.com/audio01.mp3");
    
});
```



###How to use multiple tracks
```javascript
require([
    'AudioManager',
], function (
    AudioManager
) {
    "use strict";
    
    // Create two tracks
    AudioManager.CreateAudioTrack(0);
    AudioManager.CreateAudioTrack(1);
    
    // play audio on the first track (trackId 0)
    AudioManager.PlayAudio({
        trackId: 0, 
        audioUrl: "http://example.com/audio01.mp3"
    });
    
    // Preload audio on the second track (trackId 1)
    AudioManager.PreloadAudio({
        trackId: 1, 
        audioUrl: "http://example.com/audio02.mp3"
    });
    
    // Play audio after 10 seconds
    // The audio file will already be loaded into the buffer
    setTimeout(function() {
        AudioManager.PlayAudio({
            trackId: 1, 
            audioUrl: "http://example.com/audio02.mp3"
        });
    }, 10000);
    
});
```