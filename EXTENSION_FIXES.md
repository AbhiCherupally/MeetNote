# Chrome Extension Fixes Needed

## Issues Found:
1. content.js references undefined method `requestRealScreenCapture()`
2. content.js references undefined method `stopAudioCapture()`
3. content.js references undefined method `updateRealTranscriptOverlay()`
4. popup.js recording flow needs proper mic permission handling
5. Meeting detection showing "No meeting detected"

## Solution:
- Remove or implement missing methods in content.js
- Simplify recording to use basic MediaRecorder
- Fix meeting detection logic
- Improve error messages

