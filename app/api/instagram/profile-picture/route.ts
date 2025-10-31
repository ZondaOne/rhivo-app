import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/instagram/profile-picture
 * Fetches Instagram profile picture from username
 *
 * This endpoint scrapes the public Instagram profile page to extract the profile picture URL.
 * It then uploads the image to Cloudinary for permanent storage.
 *
 * Request body:
 * {
 *   "username": "instagram_username"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "profilePictureUrl": "https://res.cloudinary.com/..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    // Extract username if user pasted a URL
    let cleanUsername = username.trim();
    if (cleanUsername.includes('instagram.com/')) {
      const match = cleanUsername.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
      if (match) {
        cleanUsername = match[1];
      }
    }

    // Validate username format (alphanumeric, dots, underscores)
    const usernameRegex = /^[a-zA-Z0-9._]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      return NextResponse.json(
        { success: false, error: 'Invalid username format' },
        { status: 400 }
      );
    }

    console.log(`📸 Fetching Instagram profile picture for: ${cleanUsername}`);

    // Try multiple methods to get the profile picture
    let profilePicUrl: string | null = null;

    try {
      // Method 1: Try the JSON endpoint (works for public profiles)
      const jsonUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${cleanUsername}`;

      const jsonResponse = await fetch(jsonUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': `https://www.instagram.com/${cleanUsername}/`,
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
      });

      if (jsonResponse.ok) {
        const data = await jsonResponse.json();
        profilePicUrl = data?.data?.user?.profile_pic_url_hd || data?.data?.user?.profile_pic_url;
        console.log('✅ Fetched from JSON API');
      }
    } catch (err) {
      console.warn('JSON API failed, trying fallback methods...', err);
    }

    // Method 2: If JSON API failed, try scraping the HTML page
    if (!profilePicUrl) {
      try {
        const instagramUrl = `https://www.instagram.com/${cleanUsername}/`;
        const response = await fetch(instagramUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            return NextResponse.json(
              { success: false, error: 'Instagram profile not found' },
              { status: 404 }
            );
          }
          throw new Error(`Instagram returned status ${response.status}`);
        }

        const html = await response.text();

        // Extract profile picture URL from HTML - try multiple patterns
        // Pattern 1: Look for profile_pic_url_hd (highest quality)
        const hdRegex = /"profile_pic_url_hd":"([^"]+)"/;
        const hdMatch = html.match(hdRegex);
        if (hdMatch && hdMatch[1]) {
          profilePicUrl = hdMatch[1].replace(/\\u0026/g, '&');
        }

        // Pattern 2: Look for profile_pic_url
        if (!profilePicUrl) {
          const jsonRegex = /"profile_pic_url":"([^"]+)"/;
          const jsonMatch = html.match(jsonRegex);
          if (jsonMatch && jsonMatch[1]) {
            profilePicUrl = jsonMatch[1].replace(/\\u0026/g, '&');
          }
        }

        // Pattern 3: Look in meta tags
        if (!profilePicUrl) {
          const metaRegex = /<meta property="og:image" content="([^"]+)"/;
          const metaMatch = html.match(metaRegex);
          if (metaMatch && metaMatch[1]) {
            profilePicUrl = metaMatch[1];
          }
        }

        if (profilePicUrl) {
          console.log('✅ Fetched from HTML scraping');
        }
      } catch (err) {
        console.warn('HTML scraping failed:', err);
      }
    }

    if (!profilePicUrl) {
      console.error('Could not extract profile picture URL from any method');
      return NextResponse.json(
        { success: false, error: 'Could not extract profile picture from Instagram. The profile may be private or Instagram may be blocking requests. Please upload an image manually.' },
        { status: 500 }
      );
    }

    console.log(`✅ Found profile picture URL: ${profilePicUrl.substring(0, 50)}...`);

    // Upload to Cloudinary for permanent storage
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary not configured, returning Instagram URL directly');
      return NextResponse.json({
        success: true,
        profilePictureUrl: profilePicUrl,
        temporary: true,
        message: 'Cloudinary not configured. Using temporary Instagram URL.'
      });
    }

    // Download the image from Instagram
    const imageResponse = await fetch(profilePicUrl);
    if (!imageResponse.ok) {
      console.warn('Failed to download image from Instagram, returning direct URL');
      return NextResponse.json({
        success: true,
        profilePictureUrl: profilePicUrl,
        temporary: true,
        message: 'Using Instagram URL directly.'
      });
    }

    const imageBlob = await imageResponse.blob();

    // Upload to Cloudinary
    const formData = new FormData();
    formData.append('file', imageBlob);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', 'profile-pictures'); // Organize in folder

    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!cloudinaryResponse.ok) {
      console.warn('Cloudinary upload failed, returning Instagram URL directly');
      return NextResponse.json({
        success: true,
        profilePictureUrl: profilePicUrl,
        temporary: true,
      });
    }

    const cloudinaryData = await cloudinaryResponse.json();
    const permanentUrl = cloudinaryData.secure_url;

    console.log(`✅ Uploaded to Cloudinary: ${permanentUrl}`);

    return NextResponse.json({
      success: true,
      profilePictureUrl: permanentUrl,
      temporary: false,
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
