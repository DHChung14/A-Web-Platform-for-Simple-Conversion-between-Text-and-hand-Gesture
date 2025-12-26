# QUICK START - VIDEO FORMAT TESTING

## ✅ What's Fixed

YouTube and Vimeo links now work! They're embedded via iframes instead of trying to load with the `<video>` tag.

```
BEFORE: <video src="https://www.youtube.com/watch?v=..."> ❌ Blank screen
AFTER:  <iframe src="https://www.youtube.com/embed/..."> ✅ Embedded player
```

---

## 🎯 Test It Now

### Step 1: Start Frontend
```bash
cd vsl-platform-frontend
npm run dev
```
Opens on `http://localhost:3000`

### Step 2: Create Test Word
**Go to**: http://localhost:3000/admin/dictionary

**Fill form**:
```
Word:      Xin chào
Category:  Greeting
Difficulty: Easy
VideoUrl:  https://www.youtube.com/watch?v=dQw4w9WgXcQ
Definition: Say hello in sign language
```

**Click**: Save

### Step 3: View Result
**Search for**: "Xin chào"
**Click**: View Chi Tiết (Detail)

**Expected**: ✅ YouTube video player shows up and plays!

---

## 🔗 Test Video URLs

### YouTube (Copy-Paste Ready)
```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtu.be/dQw4w9WgXcQ
```

### Vimeo
```
https://vimeo.com/90509568
https://player.vimeo.com/video/90509568
```

### MP4 File (for direct video test)
```
https://commondatastorage.googleapis.com/gtv-videos-library/sample/BigBuckBunny.mp4
```

---

## 📋 Files Changed

| File | Change | Impact |
|------|--------|--------|
| `/lib/video-utils.ts` | ✨ NEW | Detects video type & converts URLs |
| `/app/dictionary/[wordId]/page.tsx` | 📝 UPDATED | Uses iframe for YouTube/Vimeo |
| `/app/dictionary/page.tsx` | 📝 UPDATED | Search results support embeds |

---

## 🧪 Test Matrix

| URL Type | Detail Page | Search Grid | Works? |
|----------|-------------|-------------|--------|
| YouTube | iframe player | iframe player | ✅ YES |
| Vimeo | iframe player | iframe player | ✅ YES |
| MP4 | video controls | video controls | ✅ YES |
| No URL | Placeholder | 🎬 Icon | ✅ YES |

---

## 🚨 Common Issues & Fixes

### "Video doesn't load"
- Check URL format is correct (see Test URLs above)
- YouTube IDs must be 11 characters
- Vimeo links must have video ID number

### "Blank iframe shows"
- Video might be private - check YouTube/Vimeo video settings
- Make sure it's publicly accessible

### "Search results don't show videos"
- Refresh browser (hard refresh: Ctrl+Shift+R)
- Build succeeded? Check: `npm run build`

---

## ✨ Architecture

```typescript
// Input: Any video URL
const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

// Process: Detect type & convert to embed URL
const videoInfo = getVideoInfo(url);
// Returns: {
//   type: 'youtube',
//   id: 'dQw4w9WgXcQ', 
//   embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
// }

// Output: Render appropriate component
if (videoInfo.type === 'youtube') {
  <iframe src={videoInfo.embedUrl} /> // ✅ Works!
}
```

---

## 🎬 Supported Formats

```
✅ YouTube watch URLs        https://www.youtube.com/watch?v=...
✅ YouTube short links       https://youtu.be/...
✅ YouTube embed URLs        https://www.youtube.com/embed/...
✅ Vimeo URLs               https://vimeo.com/...
✅ Vimeo player URLs        https://player.vimeo.com/video/...
✅ Direct MP4 files         https://example.com/video.mp4
✅ Direct WebM files        https://example.com/video.webm
✅ Direct OGG files         https://example.com/video.ogg
```

---

## 💡 Pro Tips

1. **Copy YouTube URL from browser**:
   - Go to YouTube video
   - Copy URL from address bar
   - Paste directly - works!

2. **Test with public videos**:
   - Make sure video isn't private
   - Public videos embed fine

3. **Check console for errors**:
   - F12 → Console tab
   - Look for any red errors
   - Report if something breaks

---

## 📞 Need Help?

If video doesn't show:
1. Check URL format (copy from above examples)
2. Refresh browser (Ctrl+Shift+R)
3. Check browser console (F12 → Console)
4. Verify word was saved to database

Everything should work now! 🎉
