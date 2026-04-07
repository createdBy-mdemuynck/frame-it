# TransformArt QR Code Generator

A simple, standalone web app to generate QR codes with the TransformArt logo embedded in the center.

## Features

- ✨ Beautiful, user-friendly interface
- 🎨 Customizable QR code colors
- 📏 Adjustable size and logo proportion
- 💾 Download QR codes as PNG images
- 🔒 High error correction level (H) for reliable scanning with logo overlay
- 🌐 No server required - runs entirely in the browser

## How to Use

### Option 1: Open Directly in Browser

1. Simply open `index.html` in any modern web browser
2. Enter your text or URL
3. Customize the appearance (size, colors, logo size)
4. Click "Generate QR Code"
5. Download the generated QR code

### Option 2: Run with a Local Server

If you prefer to run it with a local server:

```bash
# Using Python 3
python -m http.server 8080

# Using Node.js (with http-server installed globally)
npx http-server -p 8080

# Using PHP
php -S localhost:8080
```

Then open your browser to `http://localhost:8080`

## Customization Options

- **Text/URL**: Any text or web address you want to encode
- **QR Code Size**: 200-1000 pixels
- **QR Color**: The color of the QR code dots
- **Background Color**: The background color of the QR code
- **Logo Size**: Percentage of QR code size (10-40%)

## Technical Details

- Uses the [qrcode](https://www.npmjs.com/package/qrcode) library via CDN
- Error correction level: H (High - ~30% of data can be restored)
- Generates QR codes entirely client-side (no data sent to servers)
- Responsive design works on desktop and mobile devices

## Browser Compatibility

Works in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Files

- `index.html` - The main application
- `logo.png` - TransformArt logo (copied from web/public/logo.png)
- `README.md` - This file

## Examples

Common use cases:

- Event registration links
- Product information pages
- Social media profiles
- WiFi credentials
- Contact information (vCard)
- Payment links

## Tips

- Keep the logo size between 15-25% for best scanning reliability
- Test the QR code with multiple scanner apps before mass production
- Use high contrast colors (dark QR code on light background) for best results
- The high error correction level compensates for the logo overlay

---

Created for TransformArt
