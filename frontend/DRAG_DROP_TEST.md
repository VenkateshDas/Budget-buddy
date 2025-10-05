# Drag & Drop Testing Guide

## How to Test Drag and Drop Feature

### Test Cases:

#### 1. **Valid Image Upload**
- Drag a JPG, PNG, GIF, or WebP image onto the upload area
- **Expected**:
  - Border turns blue, background changes to light blue
  - Shows "Drop your receipt here..." message
  - File uploads successfully after drop

#### 2. **Invalid File Type**
- Drag a non-image file (PDF, TXT, etc.) onto the upload area
- **Expected**:
  - Border turns red, background changes to light red
  - Shows "⚠️ Invalid file type or size" message
  - Error toast appears: "Please drop an image file (JPG, PNG, GIF, WebP)"

#### 3. **File Too Large**
- Drag an image larger than 10MB onto the upload area
- **Expected**:
  - Border turns red
  - Error toast appears: "File is too large. Maximum size is 10MB"

#### 4. **Click to Browse**
- Click on the upload area
- **Expected**:
  - File browser dialog opens
  - Can select file normally

#### 5. **During Upload**
- Start an upload, then try to drag another file
- **Expected**:
  - Upload area is disabled (pointer-events-none)
  - No drag events are triggered
  - Shows processing spinner

### Console Logs to Verify:

When dragging a file, you should see these console logs:
```
🎯 Drag enter
🎯 Drag over
✅ Drop accepted: [File]
📁 Files dropped: [File]
📄 Selected file: { name, type, size, sizeMB }
🚀 Starting async upload...
```

### Visual Indicators:

1. **Default State**: Gray dashed border, white background
2. **Hover State**: Blue border on hover
3. **Drag Active (Valid)**: Blue solid-ish border, light blue background, slight scale up
4. **Drag Active (Invalid)**: Red border, light red background
5. **Uploading**: Semi-transparent, disabled

## Fixes Applied:

1. ✅ Removed unstable dependencies from useCallback
2. ✅ Added `preventDropOnDocument: true` to prevent accidental drops
3. ✅ Added `maxSize` validation to dropzone config
4. ✅ Added `isDragReject` state for invalid files
5. ✅ Added `pointer-events-none` when uploading to fully disable interaction
6. ✅ Added better error handling with `onDropRejected`
7. ✅ Added visual feedback for drag reject state
8. ✅ Enhanced console logging for debugging

## Known Issues Fixed:

- **Issue**: Drag and drop not responding
- **Root Cause**: Inconsistent event handling and missing drag state indicators
- **Fix**: Properly configured dropzone with all necessary callbacks and visual states
