import os
import sqlite3
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify, send_file
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from io import BytesIO
import requests

from models import init_db, get_db_connection, log_activity
from tools.scanner import port_scan
from tools.crypto import encrypt_data, decrypt_data
from tools.steganography import hide_text_in_image, extract_text_from_image

app = Flask(__name__)
app.secret_key = 'super_secret_cyber_key_development_only'

with app.app_context():
    init_db()

@app.route('/')
def home():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not username or not email or not password:
            flash('Please fill out all fields.', 'danger')
            return redirect(url_for('signup'))

        hashed_password = generate_password_hash(password)
        
        conn = get_db_connection()
        try:
            conn.execute('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
                         (username, email, hashed_password))
            conn.commit()
            
            user = conn.execute('SELECT id FROM users WHERE username = ?', (username,)).fetchone()
            log_activity(user['id'], "Signup", "User registered successfully", request.remote_addr)
            
            flash('Account created successfully. Please login.', 'success')
            return redirect(url_for('login'))
        except sqlite3.IntegrityError:
            flash('Username or email already exists.', 'danger')
        finally:
            conn.close()
            
    return render_template('auth.html', action='signup')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and check_password_hash(user['password'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            log_activity(user['id'], "Login", "User logged in", request.remote_addr)
            flash('Welcome back!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password', 'danger')
            
    return render_template('auth.html', action='login')

@app.route('/logout')
def logout():
    if 'user_id' in session:
        log_activity(session['user_id'], "Logout", "User logged out", request.remote_addr)
        session.clear()
    flash('Logged out successfully.', 'success')
    return redirect(url_for('login'))

@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
        
    conn = get_db_connection()
    logs = conn.execute('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10', (session['user_id'],)).fetchall()
    conn.close()
    
    return render_template('dashboard.html', logs=logs)

# --- TOOLS ROUTES ---

@app.route('/tool/password_checker')
def password_checker():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/password_checker.html')

@app.route('/tool/port_scanner')
def port_scanner():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/port_scanner.html')
    
@app.route('/api/scan', methods=['POST'])
def api_scan():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    target = data.get('target', '127.0.0.1')
    start_port = int(data.get('start_port', 20))
    end_port = int(data.get('end_port', 1000))
    
    log_activity(session['user_id'], "Port Scan", f"Scanned {target} (ports {start_port}-{end_port})", request.remote_addr)
    results = port_scan(target, start_port, end_port)
    return jsonify(results)

@app.route('/tool/file_encryption')
def file_encryption():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/file_encryption.html')

@app.route('/api/encrypt', methods=['POST'])
def api_encrypt():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    file = request.files.get('file')
    password = request.form.get('password')
    if not file or not password:
        return jsonify({"error": "File and password required"}), 400
        
    file_data = file.read()
    iv, ct = encrypt_data(file_data, password)
    
    encrypted_content = f"{iv}:{ct}".encode('utf-8')
    log_activity(session['user_id'], "File Encryption", f"Encrypted file: {file.filename}", request.remote_addr)
    
    return send_file(
        BytesIO(encrypted_content),
        as_attachment=True,
        download_name=f"{secure_filename(file.filename)}.enc",
        mimetype='application/octet-stream'
    )

@app.route('/api/decrypt', methods=['POST'])
def api_decrypt():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    file = request.files.get('file')
    password = request.form.get('password')
    if not file or not password:
        return jsonify({"error": "File and password required"}), 400
        
    try:
        content = file.read().decode('utf-8')
        iv, ct = content.split(':', 1)
        decrypted_data = decrypt_data(iv, ct, password)
        if decrypted_data is None:
            return jsonify({"error": "Incorrect password or corrupted file"}), 400
            
        orig_name = file.filename
        if orig_name.endswith('.enc'):
            orig_name = orig_name[:-4]
            
        log_activity(session['user_id'], "File Decryption", f"Decrypted file: {orig_name}", request.remote_addr)
        
        return send_file(
            BytesIO(decrypted_data),
            as_attachment=True,
            download_name=orig_name,
            mimetype='application/octet-stream'
        )
    except Exception as e:
        return jsonify({"error": f"Failed to decrypt: {str(e)}"}), 400

@app.route('/tool/keylogger_demo')
def keylogger_demo():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/keylogger_demo.html')
    
@app.route('/api/log_keys', methods=['POST'])
def api_log_keys():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    log_activity(session['user_id'], "Keylogger Demo", f"Simulated keylogging session used", request.remote_addr)
    return jsonify({"status": "logged"})

@app.route('/tool/stego')
def stego():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/stego.html')

@app.route('/api/stego/hide', methods=['POST'])
def api_stego_hide():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    file = request.files.get('file')
    text = request.form.get('text')
    if not file or not text: return jsonify({"error": "File and text required"}), 400
    
    result = hide_text_in_image(file.read(), text)
    if not result: return jsonify({"error": "File too small or invalid format"}), 400
    
    log_activity(session['user_id'], "Image Steganography", f"Hid text in {secure_filename(file.filename)}", request.remote_addr)
    return send_file(BytesIO(result), as_attachment=True, download_name=f"stego_{secure_filename(file.filename)}", mimetype='image/png')

@app.route('/api/stego/extract', methods=['POST'])
def api_stego_extract():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    file = request.files.get('file')
    if not file: return jsonify({"error": "File required"}), 400
    
    text = extract_text_from_image(file.read())
    if not text: return jsonify({"error": "Invalid image format or processing error"}), 400
    
    log_activity(session['user_id'], "Image Steganography", f"Extracted text from {secure_filename(file.filename)}", request.remote_addr)
    return jsonify({"extracted_text": text})

@app.route('/tool/phishing')
def phishing():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/phishing.html')

import re
@app.route('/api/phishing/check', methods=['POST'])
def api_phishing():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    url = request.json.get('url', '')
    
    score = 0
    reasons = []
    
    if len(url) > 75:
        score += 1
        reasons.append("URL length is unusually long (>75 chars).")
    if '@' in url:
        score += 1
        reasons.append("Contains '@' symbol, often used to bypass filters.")
    if 'http://' in url:
        score += 1
        reasons.append("Uses non-secure HTTP connection.")
    if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url):
        score += 1
        reasons.append("IP address found in URL instead of domain name.")
        
    suspicious_words = ['login', 'verify', 'update', 'secure', 'bank', 'account', 'auth']
    for word in suspicious_words:
        if word in url.lower():
            score += 1
            reasons.append(f"Contains suspicious keyword: '{word}'.")
            break
            
    status = "Suspicious" if score > 0 else "Safe"
    
    log_activity(session['user_id'], "Phishing Detector", f"Scanned URL: {url} -> {status}", request.remote_addr)
    return jsonify({"status": status, "reasons": reasons, "score": score})

@app.route('/tool/vuln_scanner')
def vuln_scanner():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/vuln_scanner.html')

@app.route('/learning_hub')
def learning_hub():
    if 'user_id' not in session: return redirect(url_for('login'))
    log_activity(session['user_id'], "Viewed Learning Hub", "Explored external training platforms", request.remote_addr)
    return render_template('tools/learning_hub.html')

@app.route('/resource_hub')
def resource_hub():
    if 'user_id' not in session: return redirect(url_for('login'))
    log_activity(session['user_id'], "Viewed Resource Hub", "Explored Bug Bounty & Kali tools curriculum", request.remote_addr)
    return render_template('tools/resource_hub.html')

# --- MOCK DEMO ROUTES ---
@app.route('/api/vuln/scan', methods=['POST'])
def api_vuln_scan():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    url = request.json.get('url', '')
    log_activity(session['user_id'], "Vuln Scanner Target", f"Simulated scan on {url}", request.remote_addr)
    return jsonify({"message": f"Demo Scan completed for {url}. Simulated Results generated."})

@app.route('/tool/sniffer')
def sniffer():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/sniffer.html')

@app.route('/tool/ducky')
def ducky():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/ducky.html')

@app.route('/tool/device_monitor')
def device_monitor():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/device_monitor.html')

@app.route('/tool/ai_assistant')
def ai_assistant():
    if 'user_id' not in session: return redirect(url_for('login'))
    return render_template('tools/ai_assistant.html')

@app.route('/api/chat', methods=['POST'])
def api_chat():
    if 'user_id' not in session: return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    user_message = data.get('message', '')
    if not user_message: return jsonify({"error": "Message required"}), 400
    
    ollama_url = "http://localhost:11434/api/generate"
    prompt = f"You are Cyber AI Assistant, a helpful and concise cybersecurity expert. Explain in simple terms.\nUser: {user_message}\nAI:"
    
    payload = {
        "model": "llama3",
        "prompt": prompt,
        "stream": False
    }
    
    try:
        # Timeout 60s since local models can be slow
        response = requests.post(ollama_url, json=payload, timeout=60)
        response.raise_for_status()
        result = response.json()
        ai_reply = result.get('response', 'No response generated.')
        
        log_activity(session['user_id'], "AI Interaction", f"Asked AI: {user_message[:25]}...", request.remote_addr)
        return jsonify({"reply": ai_reply})
        
    except requests.exceptions.ConnectionError:
        return jsonify({"reply": "AI offline (demo mode active)"})
    except requests.exceptions.Timeout:
        return jsonify({"error": "AI model generation timed out. Is your machine heavily loaded?"}), 504
    except Exception as e:
        return jsonify({"error": f"LLM Integration Error: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
