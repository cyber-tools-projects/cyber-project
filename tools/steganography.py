from PIL import Image
import io

def _text_to_bin(text):
    return ''.join(format(ord(c), '08b') for c in text)

def _bin_to_text(binary_str):
    chars = [binary_str[i:i+8] for i in range(0, len(binary_str), 8)]
    # Filter out anything that isn't a printable character roughly
    parsed_chars = []
    for c in chars:
        if 32 <= int(c, 2) <= 126:
            parsed_chars.append(chr(int(c, 2)))
        elif int(c, 2) == 0:
            pass # ignore null bytes
        else:
            parsed_chars.append('?') # substitute unknown
            
    return ''.join(parsed_chars)

def hide_text_in_image(image_bytes, secret_text):
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert('RGB')
        encoded = img.copy()
        width, height = img.size
        
        # Delimiter so we know where to stop extracting
        binary_secret = _text_to_bin(secret_text + "#####")
        data_len = len(binary_secret)
        
        if data_len > width * height * 3:
            return None
            
        data_idx = 0
        pixels = encoded.load()
        
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y]
                
                if data_idx < data_len:
                    r = (r & ~1) | int(binary_secret[data_idx])
                    data_idx += 1
                if data_idx < data_len:
                    g = (g & ~1) | int(binary_secret[data_idx])
                    data_idx += 1
                if data_idx < data_len:
                    b = (b & ~1) | int(binary_secret[data_idx])
                    data_idx += 1
                    
                pixels[x, y] = (r, g, b)
                
                if data_idx >= data_len:
                    break
            if data_idx >= data_len:
                break
                
        output = io.BytesIO()
        encoded.save(output, format='PNG')
        return output.getvalue()
    except Exception as e:
        return None

def extract_text_from_image(image_bytes):
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img = img.convert('RGB')
        width, height = img.size
        pixels = img.load()
        
        binary_data = ""
        for y in range(height):
            for x in range(width):
                r, g, b = pixels[x, y]
                binary_data += str(r & 1)
                binary_data += str(g & 1)
                binary_data += str(b & 1)
                # Quick optimization, we don't need to load the whole image if we found #####
                if len(binary_data) % 8 == 0:
                    text = ''.join(chr(int(binary_data[i:i+8], 2)) for i in range(0, len(binary_data), 8) if int(binary_data[i:i+8], 2) != 0 and 32 <= int(binary_data[i:i+8], 2) <= 126)
                    if "#####" in text:
                        return text.split("#####")[0]
        
        text = _bin_to_text(binary_data)
        if "#####" in text:
            return text.split("#####")[0]
        return "No hidden message found."
    except Exception as e:
        return None
