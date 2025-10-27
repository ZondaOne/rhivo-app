# Cloudinary Setup for Image Uploads

The onboarding form now supports uploading profile and banner images for businesses. This feature uses Cloudinary's free tier for frontend-only image uploads.

## Why Cloudinary?

- **Free tier**: 25GB storage, 25GB bandwidth/month
- **Frontend-only**: No backend API needed
- **Automatic optimization**: Images are optimized and served via CDN
- **Secure**: Unsigned uploads with preset configurations
- **Reliable**: Enterprise-grade infrastructure

## Setup Instructions

### 1. Create a Free Cloudinary Account

1. Go to [https://cloudinary.com/users/register/free](https://cloudinary.com/users/register/free)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your Cloud Name

1. Log into your Cloudinary dashboard
2. Your **Cloud Name** is displayed at the top of the dashboard
3. Copy this value (e.g., `dxxxxxxxx`)

### 3. Create an Upload Preset

1. In your Cloudinary dashboard, go to **Settings** > **Upload**
2. Scroll down to **Upload presets** section
3. Click **Add upload preset**
4. Configure the preset:
   - **Preset name**: Choose a name (e.g., `rivo_onboarding`)
   - **Signing mode**: Select **Unsigned** (this allows frontend uploads)
   - **Folder**: (optional) Set to `rivo-app/businesses` to organize uploads
   - **Access mode**: Public
   - **Allowed formats**: jpg, png, webp
   - **File size limit**: 5MB (optional but recommended)
5. Click **Save**

### 4. Add Environment Variables

Add the following to your `.env.local` file:

```env
# Cloudinary configuration for image uploads
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name_here
```

Replace:
- `your_cloud_name_here` with your actual Cloud Name from step 2
- `your_upload_preset_name_here` with the preset name you created in step 3

### 5. Restart Your Development Server

```bash
npm run dev
```

## Testing the Upload

1. Navigate to the onboarding page: `http://localhost:3000/onboard`
2. Fill in the business information
3. On the **Branding** step, you should see upload areas for:
   - Profile Picture (square, 1:1 aspect ratio)
   - Banner Image (wide, 16:9 aspect ratio)
4. Click to upload an image
5. The image should upload to Cloudinary and display a preview

## Fallback Behavior

If Cloudinary is not configured:
- The upload component will still work locally using data URLs
- However, these won't persist and won't work in production
- A warning message will be displayed in the UI

## Alternative Free Options

If you prefer not to use Cloudinary, here are alternatives:

### imgbb
- Completely free
- No signup required
- Less reliable for production
- API endpoint: `https://api.imgbb.com/1/upload`

### Uploadcare
- 3GB storage, 3GB traffic/month (free tier)
- Built-in upload widget
- Smaller limits than Cloudinary

## Troubleshooting

### "Upload failed" error
- Check that your cloud name and upload preset are correct
- Verify the upload preset signing mode is set to "Unsigned"
- Check browser console for detailed error messages

### Images not displaying
- Verify the image URL is being saved to the database
- Check that the URL is accessible (not blocked by CORS)

### "Cloudinary not configured" warning
- Make sure environment variables are in `.env.local`
- Restart your dev server after adding the variables
- Check for typos in the variable names (must start with `NEXT_PUBLIC_`)

## Security Considerations

- Unsigned uploads are safe for this use case because:
  - They're limited to specific folders via the preset
  - File size limits are enforced
  - Only specific file types are allowed
- Consider adding signed uploads for production if you need tighter control
- Monitor your Cloudinary usage dashboard to prevent abuse

## Production Deployment

When deploying to production:

1. Add the same environment variables to your hosting platform (Vercel, Netlify, etc.)
2. Consider setting up a separate upload preset for production
3. Monitor your Cloudinary usage via the dashboard
4. Set up usage alerts if approaching the free tier limits

## Cost Optimization

To stay within the free tier:
- **No transformations are used** - images are uploaded as-is
- Cloudinary's automatic optimization handles basic compression
- Users should upload appropriately sized images:
  - Profile: ~400×400px (square)
  - Banner: ~1200×400px (wide)
- This keeps the app on the free tier (no transformation costs)
