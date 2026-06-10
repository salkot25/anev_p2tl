import os
from PIL import Image

def generate_icons():
    logo_path = 'LOGO.jpg'
    public_dir = 'public'
    
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found!")
        return

    print("Generating PWA icons from LOGO.jpg...")
    img = Image.open(logo_path)
    
    # Auto-detect background color (using top-left corner pixel)
    bg_color = img.getpixel((0, 0))
    print(f"Detected background color: {bg_color}")
    
    # Ensure public directory exists
    os.makedirs(public_dir, exist_ok=True)
    
    # 1. logo192.png (192x192)
    img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)
    img_192.save(os.path.join(public_dir, 'logo192.png'), 'PNG')
    print("Generated public/logo192.png")
    
    # 2. logo512.png (512x512)
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(public_dir, 'logo512.png'), 'PNG')
    print("Generated public/logo512.png")
    
    # 3. apple-touch-icon.png (180x180)
    img_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
    img_180.save(os.path.join(public_dir, 'apple-touch-icon.png'), 'PNG')
    print("Generated public/apple-touch-icon.png")
    
    # 4. maskable-icon.png (512x512 with safe area margin)
    # Resize original image to fit within safe area (~70% of 512 = 360)
    safe_size = 360
    img_safe = img.resize((safe_size, safe_size), Image.Resampling.LANCZOS)
    
    # Create background canvas with the detected background color
    maskable_canvas = Image.new('RGB', (512, 512), bg_color)
    # Paste logo in the center
    paste_offset = (512 - safe_size) // 2
    maskable_canvas.paste(img_safe, (paste_offset, paste_offset))
    maskable_canvas.save(os.path.join(public_dir, 'maskable-icon.png'), 'PNG')
    print("Generated public/maskable-icon.png (maskable layout)")
    
    # 5. favicon.ico (multi-size ico)
    ico_sizes = [(16, 16), (32, 32), (48, 48)]
    img_ico = img.resize((48, 48), Image.Resampling.LANCZOS)
    img_ico.save(os.path.join(public_dir, 'favicon.ico'), format='ICO', sizes=ico_sizes)
    print("Generated public/favicon.ico")

if __name__ == '__main__':
    generate_icons()
