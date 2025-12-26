# VIDEO FORMAT SUPPORT - IMPLEMENTATION GUIDE

## 📋 What Was Changed

### 1. Created Video Utility Library `/lib/video-utils.ts`
- **Purpose**: Centralized URL parsing and video type detection
- **Functions**:
  - `extractYouTubeId(url: string)`: Extract 11-char ID from YouTube URLs
  - `extractVimeoId(url: string)`: Extract numeric ID from Vimeo URLs  
  - `getVideoInfo(url: string)`: Main function - returns VideoInfo with type and embedUrl
  - `isValidVideoUrl(url: string)`: Boolean validation helper

- **Supported Formats**:
  ```
  YouTube:
    - https://www.youtube.com/watch?v=dQw4w9WgXcQ
    - https://youtu.be/dQw4w9WgXcQ
    - https://www.youtube.com/embed/dQw4w9WgXcQ
  
  Vimeo:
    - https://vimeo.com/123456789
    - https://player.vimeo.com/video/123456789
  
  Direct Files:
    - file.mp4, file.webm, file.ogg, file.mov, file.avi
  ```

### 2. Updated `/app/dictionary/[wordId]/page.tsx`
- **Import Added**: `import { getVideoInfo } from "@/lib/video-utils";`
- **Video Rendering Logic**:
  ```typescript
  {word.videoUrl ? (
    (() => {
      const videoInfo = getVideoInfo(word.videoUrl);
      
      // Render iframe for YouTube/Vimeo
      if (videoInfo.type === 'youtube') {
        return <iframe src={videoInfo.embedUrl} ... />;
      }
      if (videoInfo.type === 'vimeo') {
        return <iframe src={videoInfo.embedUrl} ... />;
      }
      
      // Render video tag for direct files
      return <video src={word.videoUrl} controls ... />;
    })()
  ) : (
    // Placeholder for missing videos
  )}
  ```

- **Benefits**:
  - YouTube/Vimeo links now work with embedded iframes
  - Automatic format detection
  - Graceful fallback for direct video files
  - Better error handling

### 3. Updated `/app/dictionary/page.tsx`
- **Import Added**: `import { getVideoInfo } from "@/lib/video-utils";`
- **Search Results Video Display**:
  - Grid view cards now support YouTube/Vimeo embeds
  - Same conditional rendering logic as detail page
  - Consistent experience across all pages

## 🧪 Test Cases

### Test 1: YouTube Video Display
**Steps**:
1. In Admin Dictionary, create/edit word with YouTube URL:
   ```
   https://www.youtube.com/watch?v=dQw4w9WgXcQ
   ```
2. Navigate to word detail page
3. Verify video plays in embedded player

**Expected**: ✅ YouTube video loads and plays in iframe

**Test Variations**:
- `https://youtu.be/dQw4w9WgXcQ` (short link)
- `https://www.youtube.com/embed/dQw4w9WgXcQ` (embed URL)

---

### Test 2: Vimeo Video Display
**Steps**:
1. Create word with Vimeo URL:
   ```
   https://vimeo.com/123456789
   ```
2. Visit word detail page
3. Verify Vimeo player appears

**Expected**: ✅ Vimeo video loads in iframe

**Test Variations**:
- `https://player.vimeo.com/video/123456789`

---

### Test 3: Direct Video File
**Steps**:
1. Create word with MP4 file URL:
   ```
   https://example.com/videos/demo.mp4
   ```
2. View word detail
3. Verify video controls appear (play, pause, progress)

**Expected**: ✅ HTML video tag renders with controls

**Test Variations**:
- WebM: `https://example.com/demo.webm`
- OGG: `https://example.com/demo.ogg`

---

### Test 4: Missing Video
**Steps**:
1. Create word WITHOUT videoUrl
2. View detail page
3. Check placeholder message

**Expected**: ✅ Shows "🎬 Chưa có video hướng dẫn" with helpful text

---

### Test 5: Search Results Grid
**Steps**:
1. Search for word with YouTube URL
2. View grid results
3. Click on card to see embedded video

**Expected**: ✅ Video embeds in search result cards

---

### Test 6: Admin Create/Edit Flow
**Steps**:
1. Go to `/admin/dictionary`
2. Create new word:
   - Word: "Xin chào"
   - Category: "Greeting"
   - Difficulty: "Easy"
   - VideoUrl: `https://www.youtube.com/watch?v=...`
   - Definition: "Say hello"
3. Save
4. Search for word
5. View detail
6. Verify video plays

**Expected**: ✅ Complete flow works with video support

---

## 🔧 URL Format Examples for Testing

### YouTube Test Links (rickroll video)
```
Watch URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
Short URL: https://youtu.be/dQw4w9WgXcQ
Embed URL: https://www.youtube.com/embed/dQw4w9WgXcQ
```

### Vimeo Test Links (public demo video)
```
https://vimeo.com/90509568
Player: https://player.vimeo.com/video/90509568
```

### Local Video (Self-hosted)
```
http://localhost:3000/videos/demo.mp4
http://your-server.com/videos/sign-language-demo.webm
```

---

## 🚀 How to Test Locally

### 1. Start Development Server
```bash
cd vsl-platform-frontend
npm run dev
```

### 2. Test Each Video Type
```bash
# Open browser to http://localhost:3000/admin/dictionary

# Create word with each video type:
1. YouTube: https://www.youtube.com/watch?v=dQw4w9WgXcQ
2. Vimeo: https://vimeo.com/90509568  
3. Direct: https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4
4. No Video: Leave empty

# Search and verify each format loads correctly
```

### 3. Debug with Browser Console
```javascript
// Check if getVideoInfo is working
const { getVideoInfo } = await import('http://localhost:3000/_next/static/chunks/lib_video-utils.ts');
const info = getVideoInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
console.log(info);
// Should output: { type: 'youtube', id: 'dQw4w9WgXcQ', embedUrl: '...' }
```

---

## 📊 Compatibility Matrix

| Format | Detail Page | Search Grid | Admin Create | Notes |
|--------|------------|-------------|--------------|-------|
| YouTube | ✅ iframe | ✅ iframe | ✅ Accepted | Full player with controls |
| Vimeo | ✅ iframe | ✅ iframe | ✅ Accepted | Full player with controls |
| MP4 | ✅ video tag | ✅ video tag | ✅ Accepted | HTML5 video |
| WebM | ✅ video tag | ✅ video tag | ✅ Accepted | Modern browsers |
| OGG | ✅ video tag | ✅ video tag | ✅ Accepted | Fallback format |
| No URL | ✅ Placeholder | ✅ Icon | ✅ Optional | Graceful UX |

---

## 🐛 Troubleshooting

### Problem: YouTube video shows blank
**Causes**:
- Invalid video ID
- Video is private/deleted
- CORS issues with embedding

**Solutions**:
- Verify video ID is 11 characters
- Use publicly accessible video
- Check browser console for errors

### Problem: Vimeo video won't load
**Causes**:
- Video privacy settings
- Invalid embed URL

**Solutions**:
- Make video public in Vimeo settings
- Verify full URL format: `https://player.vimeo.com/video/123456789`

### Problem: Direct video file won't play
**Causes**:
- File not accessible from browser
- Incorrect file format
- CORS headers missing

**Solutions**:
- Test URL directly in browser
- Verify file is MP4/WebM/OGG
- Add CORS headers if hosted externally

---

## ✅ Verification Checklist

- [ ] `/lib/video-utils.ts` exists with 4+ functions
- [ ] `[wordId]/page.tsx` imports `getVideoInfo`
- [ ] `dictionary/page.tsx` imports `getVideoInfo`
- [ ] Conditional iframe rendering for YouTube
- [ ] Conditional iframe rendering for Vimeo
- [ ] Video tag rendering for direct files
- [ ] Placeholder shows for missing videos
- [ ] npm run build succeeds without errors
- [ ] All video formats tested in browser
- [ ] Admin can create words with videos
- [ ] Search results show video previews

---

## 📝 Code Review Notes

### Key Implementation Details:

1. **Type Safety**: VideoInfo interface ensures type consistency
2. **Regex Patterns**: Handles multiple URL formats per platform
3. **Conditional Rendering**: IIFE (Immediately Invoked Function Expression) allows inline conditional JSX
4. **Fallback Logic**: Unknown URLs default to video tag (safe default)
5. **Performance**: URL parsing done once per render (getVideoInfo memoization possible future optimization)

### Security Considerations:

- ✅ iframe allowFullScreen properly scoped
- ✅ iframe allow attributes restricted to necessary permissions
- ✅ Video URLs user-provided but from trusted database
- ✅ No eval() or dynamic script injection

---

## 🎯 Next Steps

1. **Test all video formats** in local environment
2. **Deploy to staging** environment
3. **Get user feedback** on video playback quality
4. **Monitor for errors** in production logs
5. **Consider caching** embed URLs for performance (optional)
6. **Add video metadata** (duration, thumbnail) if needed (future)

