#!/usr/bin/env python3
"""
Generate icon files for Skooper Chrome Extension
Creates simple SVG-based icons in different sizes
"""

import os

def create_svg_icon():
    """Create an SVG icon with a recording symbol"""
    return '''<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="128" height="128" rx="24" ry="24" fill="url(#grad)"/>
  <circle cx="64" cy="64" r="38" fill="white"/>
  <circle cx="64" cy="64" r="20" fill="#667eea"/>
</svg>'''

def svg_to_png_base64(size):
    """Create a simple PNG placeholder as base64"""
    # Since we can't use PIL without installing it, we'll create a minimal PNG
    # This is a 1x1 purple pixel PNG, which Chrome will scale
    import base64
    
    # Minimal PNG header + IDAT + IEND for a purple pixel
    if size == 16:
        # 16x16 purple PNG (simplified)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x10\x00\x00\x00\x10\x08\x02\x00\x00\x00\x90\x91h6\x00\x00\x00\x1fIDATx\x9cc\xc8\x8f\xae\xfc\xcf\x00\x02\x18\x18\x18\x18\x98\x98\x03\x92\x80\x04 \x01H\x00\x00C\x14\x02\x01\xd5J\xb5W\x00\x00\x00\x00IEND\xaeB`\x82'
    elif size == 32:
        # 32x32 purple PNG (simplified)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00 \x00\x00\x00 \x08\x02\x00\x00\x00\xfcK\xe2"\x00\x00\x00BIDAT8\x8d\xed\xce1\x01\x00\x00\x08\x020\xfe\xa7\xea\xdd!\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\x82`U\xd5Z\x00\x00\x00\x00IEND\xaeB`\x82'
    elif size == 48:
        # 48x48 purple PNG (simplified)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x000\x00\x00\x000\x08\x02\x00\x00\x00\xd92\x1f<\x00\x00\x00`IDAT8\x8d\xed\xce1\x01\x00\x00\x0c\x020\xfe\xa7j;\x84B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P(\x14\n\x85B\xa1P\xe8\x1f\xdc\x00\x01\xdc\xd9O\xe8\x00\x00\x00\x00IEND\xaeB`\x82'
    else:  # 128x128
        # 128x128 purple PNG (simplified)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x80\x00\x00\x00\x80\x08\x02\x00\x00\x00L\\\xf6\x9c\x00\x00\x00\xb5IDAT8\x8d\xed\xc11\x01\x00\x00\x00\xc2\xa0\xf5O\xed\r\n\x1b\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xe0\x07\x00\x01\x00\x00\xff\xff\xb0m\r\xcd\x00\x00\x00\x00IEND\xaeB`\x82'
    
    return png_data

def main():
    """Generate icon files"""
    icons_dir = 'icons'
    
    # Create icons directory if it doesn't exist
    if not os.path.exists(icons_dir):
        os.makedirs(icons_dir)
        print(f"Created {icons_dir}/ directory")
    
    # Sizes needed for Chrome extension
    sizes = [16, 32, 48, 128]
    
    # Create SVG file first
    svg_content = create_svg_icon()
    svg_path = os.path.join(icons_dir, 'icon.svg')
    with open(svg_path, 'w') as f:
        f.write(svg_content)
    print(f"Created {svg_path}")
    
    # Create PNG files
    for size in sizes:
        png_data = svg_to_png_base64(size)
        png_path = os.path.join(icons_dir, f'icon{size}.png')
        with open(png_path, 'wb') as f:
            f.write(png_data)
        print(f"Created {png_path}")
    
    print("\nIcon files generated successfully!")
    print("Note: These are placeholder icons. For production, use proper image editing software.")

if __name__ == '__main__':
    main()