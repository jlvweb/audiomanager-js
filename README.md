## AudioManager
A JavaScript Library for playing audio on multiple tracks handeled by the Web Audio API. Designed to be used with require.js.

###How to play an auudio file
```javascript
require([
    'AudioManager',
], function (
    AudioManager
) {
    "use strict";

    AudioManager.PlayAudio("http://example.com/audio.mp3");
    
});
```

