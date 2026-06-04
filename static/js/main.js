document.addEventListener('DOMContentLoaded', () => {
    
    // --- Loader helper ---
    const showLoader = () => document.getElementById('loading').style.display = 'flex';
    const hideLoader = () => document.getElementById('loading').style.display = 'none';

    // --- Password Strength Checker Logic ---
    const pwdInput = document.getElementById('password-input');
    if (pwdInput) {
        const toggleBtn = document.getElementById('toggle-pwd');
        const strengthBar = document.getElementById('strength-bar');
        const strengthText = document.getElementById('strength-text');
        const suggestionsList = document.getElementById('suggestions');

        // Toggle visibility
        toggleBtn.addEventListener('click', () => {
            const type = pwdInput.getAttribute('type') === 'password' ? 'text' : 'password';
            pwdInput.setAttribute('type', type);
            toggleBtn.innerHTML = type === 'password' ? '<i class="ph ph-eye"></i>' : '<i class="ph ph-eye-slash"></i>';
        });

        pwdInput.addEventListener('input', (e) => {
            const val = e.target.value;
            let score = 0;
            let suggestions = [];

            if (val.length === 0) {
                strengthBar.style.width = '0%';
                strengthText.innerText = 'Awaiting Input...';
                strengthText.style.color = 'var(--neon-blue)';
                suggestionsList.innerHTML = '';
                return;
            }

            if (val.length > 8) score += 1; else suggestions.push('Make it longer than 8 characters');
            if (val.length > 12) score += 1;
            if (/[A-Z]/.test(val)) score += 1; else suggestions.push('Add uppercase letters');
            if (/[a-z]/.test(val)) score += 1; else suggestions.push('Add lowercase letters');
            if (/[0-9]/.test(val)) score += 1; else suggestions.push('Add numbers');
            if (/[^A-Za-z0-9]/.test(val)) score += 1; else suggestions.push('Add special characters (!@#$%)');

            // Map score to UI
            let width = (score / 6) * 100;
            strengthBar.style.width = `${width}%`;

            if (score <= 2) {
                strengthBar.style.backgroundColor = 'var(--danger)';
                strengthText.innerText = 'Weak';
                strengthText.style.color = 'var(--danger)';
            } else if (score <= 4) {
                strengthBar.style.backgroundColor = 'var(--warning)';
                strengthText.innerText = 'Moderate';
                strengthText.style.color = 'var(--warning)';
            } else {
                strengthBar.style.backgroundColor = 'var(--success)';
                strengthText.innerText = 'Strong';
                strengthText.style.color = 'var(--success)';
            }

            suggestionsList.innerHTML = suggestions.map(s => `<li><i class="ph ph-warning-circle"></i> ${s}</li>`).join('');
        });
    }

    // --- Port Scanner Logic ---
    const btnScan = document.getElementById('btn-scan');
    if (btnScan) {
        const terminal = document.getElementById('scan-terminal');
        const resultsBox = document.getElementById('scan-results');

        const appendLog = (msg, className = '') => {
            const line = document.createElement('div');
            line.className = `log-line ${className}`;
            line.innerText = msg;
            resultsBox.appendChild(line);
            resultsBox.scrollTop = resultsBox.scrollHeight;
        };

        btnScan.addEventListener('click', async () => {
            const target = document.getElementById('scan-target').value;
            const startStr = document.getElementById('scan-start').value;
            const endStr = document.getElementById('scan-end').value;

            if (!target) return alert('Enter target IP or Domain');
            
            terminal.style.display = 'block';
            resultsBox.innerHTML = '';
            btnScan.disabled = true;
            btnScan.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i> Scanning...';
            
            appendLog(`> Initializing stealth scan on ${target} (Ports: ${startStr}-${endStr})`, 'info');
            
            try {
                const res = await fetch('/api/scan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ target, start_port: parseInt(startStr), end_port: parseInt(endStr) })
                });
                
                const data = await res.json();
                
                if (data.error) {
                    appendLog(`> Error: ${data.error}`, 'error');
                } else {
                    appendLog(`> Target resolved to ${data.target_ip}`, 'info');
                    if (data.open_ports.length === 0) {
                        appendLog(`> No open ports found in specified range. Target appears secure.`, 'success');
                    } else {
                        appendLog(`> Found ${data.open_ports.length} open port(s):`, 'warning');
                        data.open_ports.forEach(p => {
                            appendLog(`  - Port ${p} [OPEN]`, 'success');
                        });
                    }
                }
            } catch (err) {
                appendLog(`> Connection failed to backend API`, 'error');
            } finally {
                appendLog(`> Scan complete. Connection closed.`, 'info');
                btnScan.disabled = false;
                btnScan.innerHTML = '<i class="ph ph-scan"></i> Initiate Scan Sequence';
            }
        });
    }

    // --- Keylogger Demo Logic ---
    const klTrap = document.getElementById('kl-trap');
    if (klTrap) {
        const klLogs = document.getElementById('kl-logs');
        const klClear = document.getElementById('kl-clear');
        
        let strokeBuffer = [];
        let logTimeout = null;

        const appendKeyLog = (keyStr) => {
            const line = document.createElement('div');
            line.className = 'log-line success';
            line.innerText = `[${new Date().toLocaleTimeString()}] INTRCPT: ${keyStr}`;
            klLogs.appendChild(line);
            klLogs.scrollTop = klLogs.scrollHeight;
        };
        
        klTrap.addEventListener('keydown', (e) => {
            let keyStr = e.key;
            if (keyStr === ' ') keyStr = '[SPACE]';
            else if (keyStr === 'Enter') keyStr = '[ENTER]';
            else if (keyStr === 'Backspace') keyStr = '[BACKSPACE]';
            
            strokeBuffer.push(keyStr);
            appendKeyLog(keyStr);

            // Periodically tell the backend we are using it (throttled)
            clearTimeout(logTimeout);
            logTimeout = setTimeout(() => {
                if (strokeBuffer.length > 0) {
                    fetch('/api/log_keys', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ keys: strokeBuffer.join('') })
                    }).catch(err => console.log('Log sync failed:', err));
                    strokeBuffer = [];
                }
            }, 5000);
        });

        klClear.addEventListener('click', () => {
            klLogs.innerHTML = '<div class="log-line">> Process restarted. Awaiting keystrokes...</div>';
            klTrap.value = '';
            klTrap.focus();
        });
    }

    // --- Steganography Extract Wrapper ---
    const btnStegoExt = document.getElementById('btn-stego-extract');
    if (btnStegoExt) {
        btnStegoExt.addEventListener('click', async () => {
            const fileInput = document.getElementById('ext-file');
            if (fileInput.files.length === 0) return alert('Select an image file first!');
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            const resultBox = document.getElementById('stego-result-container');
            const resultText = document.getElementById('stego-output');
            
            resultBox.style.display = 'block';
            resultText.innerText = 'Extracting data payload... [██████    ]';
            resultText.style.color = 'yellow';
            
            try {
                const res = await fetch('/api/stego/extract', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.error) {
                    resultText.innerText = 'ERROR: ' + data.error;
                    resultText.style.color = 'red';
                } else {
                    resultText.innerText = `PAYLOAD: ${data.extracted_text}`;
                    resultText.style.color = '#0f0';
                }
            } catch(e) {
                resultText.innerText = 'Extraction failed entirely.';
                resultText.style.color = 'red';
            }
        });
    }

    // --- Phishing Detector Logic ---
    const btnPhish = document.getElementById('btn-phish-scan');
    if (btnPhish) {
        const resultsBox = document.getElementById('phish-results');
        const output = document.getElementById('phish-output');
        btnPhish.addEventListener('click', async () => {
            const url = document.getElementById('phish-url').value;
            if(!url) return alert('Enter a URL.');
            btnPhish.disabled = true;
            resultsBox.style.display = 'block';
            output.innerHTML = '<div class="log-line">Running AI heuristic scanner...</div>';
            
            try {
                const res = await fetch('/api/phishing/check', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({url})
                });
                const data = await res.json();
                
                let resultHtml = `<div class="log-line mt-2 text-xl" style="color: ${data.status === 'Safe' ? '#0f0' : 'red'};">Verdict: ${data.status}</div>`;
                if(data.reasons && data.reasons.length > 0) {
                    resultHtml += `<div class="log-line warning mt-2">Flags Triggered:</div>`;
                    data.reasons.forEach(r => {
                        resultHtml += `<div class="log-line" style="color: yellow;">- ${r}</div>`;
                    });
                }
                output.innerHTML += resultHtml;
            } catch(e) {
                output.innerHTML += `<div class="log-line error">API Error: Could not reach backend.</div>`;
            } finally {
                btnPhish.disabled = false;
            }
        });
    }

    // --- Vulnerability Scanner Demo ---
    const btnVuln = document.getElementById('btn-vuln-scan');
    if (btnVuln) {
        const terminal = document.getElementById('vuln-terminal');
        const output = document.getElementById('vuln-output');
        btnVuln.addEventListener('click', async () => {
            const url = document.getElementById('vuln-url').value;
            if(!url) return alert('Enter target URL');
            
            btnVuln.disabled = true;
            terminal.style.display = 'block';
            output.innerHTML = `<div class="log-line info">Audit initialized for [ ${url} ]...</div>`;
            
            const steps = [
                { msg: "Injecting generic SQLi payload (WAITFOR DELAY)...", ok: false },
                { msg: "WAF bypassed. Processing response times...", ok: true },
                { msg: "Reflected XSS script execution verification...", ok: true },
                { msg: "Fuzzing root directory for .env and sensitive configs...", ok: true }
            ];
            
            for(let i=0; i<steps.length; i++) {
                await new Promise(r => setTimeout(r, 1500));
                let c = steps[i].ok ? 'success' : 'warning';
                output.innerHTML += `<div class="log-line ${c}">> ${steps[i].msg}</div>`;
                output.scrollTop = output.scrollHeight;
            }
            
            await fetch('/api/vuln/scan', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({url}) });
            
            await new Promise(r => setTimeout(r, 1000));
            output.innerHTML += `<br><div class="alert alert-danger" style="margin-top: 20px;">VULNERABILITY FOUND: SQL Injection vector confirmed explicitly on Login route. <br>[SIMULATED RESULT FOR EDUCATIONAL PURPOSES]</div>`;
            btnVuln.disabled = false;
        });
    }

    // --- Packet Sniffer Summary ---
    const btnSniffStart = document.getElementById('btn-sniff-start');
    if (btnSniffStart) {
        let sniffing = false;
        let sniffInterval = null;
        let pCount = 0;
        const stopBtn = document.getElementById('btn-sniff-stop');
        const list = document.getElementById('packet-list');
        const emptyMsg = document.getElementById('packet-empty-msg');
        
        btnSniffStart.addEventListener('click', () => {
            sniffing = true;
            btnSniffStart.disabled = true;
            stopBtn.disabled = false;
            if(emptyMsg) emptyMsg.style.display = 'none';
            
            sniffInterval = setInterval(() => {
                pCount++;
                const isHttps = Math.random() > 0.3;
                const proto = isHttps ? 'HTTPS' : 'HTTP';
                const color = isHttps ? '#2ecc71' : '#e74c3c';
                const len = Math.floor(Math.random() * 1500) + 40;
                
                const packet = document.createElement('div');
                packet.style.display = 'grid';
                packet.style.gridTemplateColumns = '80px 100px 150px 150px 100px 2fr';
                packet.style.padding = '5px 10px';
                packet.style.borderBottom = '1px solid #333';
                packet.style.cursor = 'pointer';
                packet.style.color = color;
                
                packet.innerHTML = `
                    <div>${pCount}</div>
                    <div>${proto}</div>
                    <div>192.168.1.${Math.floor(Math.random()*100)+1}</div>
                    <div>104.22.${Math.floor(Math.random()*50)+1}.X</div>
                    <div>${len}</div>
                    <div>${isHttps ? 'Encrypted Application Data' : 'GET /login.php?user=admin&pass=123 (CLEARTEXT!)'}</div>
                `;
                
                packet.addEventListener('click', () => {
                    document.querySelectorAll('#packet-list div').forEach(d => d.style.background = 'transparent');
                    packet.style.background = 'rgba(102, 252, 241, 0.2)';
                    document.getElementById('packet-inspect').innerHTML = `<span style="color:${color}">Deep Inspection [Packet ${pCount}]:</span><br>${isHttps ? '0xF4 0x2A 0x99 ... ENCRYPTED ...' : 'Raw Text: user=admin&pass=123'}`;
                });
                
                list.insertBefore(packet, list.firstChild);
                if (list.children.length > 50) list.lastChild.remove();
            }, 800);
        });
        
        stopBtn.addEventListener('click', () => {
            clearInterval(sniffInterval);
            btnSniffStart.disabled = false;
            stopBtn.disabled = true;
        });
    }

    // --- Ducky Simulator ---
    const btnDucky = document.getElementById('btn-ducky-run');
    if (btnDucky) {
        document.getElementById('ducky-load-example').addEventListener('click', () => {
            document.getElementById('ducky-script').value = `DELAY 500\nGUI r\nDELAY 200\nSTRING cmd\nENTER\nDELAY 500\nSTRING echo "You have been simulated!" > test.txt\nENTER`;
        });
        
        btnDucky.addEventListener('click', async () => {
            const script = document.getElementById('ducky-script').value.split('\\n');
            const term = document.getElementById('ducky-terminal');
            const out = document.getElementById('ducky-output');
            
            term.style.display = 'block';
            out.innerHTML = '<div class="log-line">Injecting Ducky payload line-by-line...</div>';
            btnDucky.disabled = true;
            
            for(let line of script) {
                line = line.trim();
                if(!line) continue;
                
                let delay = 500;
                if(line.startsWith('DELAY')) { delay = parseInt(line.split(' ')[1]) || 500; }
                else if(line.startsWith('STRING')) { delay = 800; }
                
                await new Promise(r => setTimeout(r, delay));
                out.innerHTML += `<div class="log-line" style="color: #66fcf1;">Executing: ${line}</div>`;
                out.scrollTop = out.scrollHeight;
            }
            out.innerHTML += `<div class="log-line" style="color: #2ecc71; margin-top: 10px;">Payload delivered successfully (Host unaffected).</div>`;
            btnDucky.disabled = false;
        });
    }

    // --- Device Monitor ---
    const btnNetScan = document.getElementById('btn-net-scan');
    if (btnNetScan) {
        btnNetScan.addEventListener('click', async () => {
            const status = document.getElementById('net-scan-status');
            const grid = document.getElementById('device-grid');
            
            btnNetScan.disabled = true;
            status.style.display = 'block';
            grid.innerHTML = '';
            
            const devices = [
                { ip: '192.168.1.1', mac: '00:14:22:01:23:45', name: 'Gateway Router', icon: 'router' },
                { ip: '192.168.1.15', mac: '1A:2B:3C:4D:5E:6F', name: 'Your Host Machine', icon: 'laptop' },
                { ip: '192.168.1.20', mac: 'AA:BB:CC:DD:EE:FF', name: 'Unknown IoT Device', icon: 'plugs' },
                { ip: '192.168.1.55', mac: '11:22:33:44:55:66', name: 'Mobile Phone', icon: 'device-mobile' }
            ];
            
            for(let d=0; d<devices.length; d++) {
                await new Promise(r => setTimeout(r, 1200));
                grid.innerHTML += `
                    <div class="glass-card" style="padding: 1.5rem; text-align: center;">
                        <i class="ph ph-${devices[d].icon}" style="font-size: 3rem; color: #66fcf1;"></i>
                        <h3 style="margin-top: 0.5rem; color: #fff;">${devices[d].ip}</h3>
                        <p style="font-family: monospace; color: #888;">${devices[d].mac}</p>
                        <p style="color: #aaa; margin-top: 10px;">${devices[d].name}</p>
                    </div>
                `;
            }
            status.innerHTML = 'Scan Completed [4 Active Hosts Found]';
            status.style.color = '#2ecc71';
            btnNetScan.disabled = false;
        });
    }

    // --- AI Assistant Logic ---
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        const btnSend = document.getElementById('btn-send-chat');
        const messagesArea = document.getElementById('chat-messages');
        const voiceBtn = document.getElementById('btn-voice-input');
        const voiceStatus = document.getElementById('voice-status');
        const cameraBtn = document.getElementById('btn-camera-demo');
        const cameraContainer = document.getElementById('camera-container');
        const cameraVideo = document.getElementById('camera-preview');
        
        let localStream = null;

        const appendUserMessage = (msg) => {
            const wrap = document.createElement('div');
            wrap.style = "align-self: flex-end; max-width: 80%; background: rgba(46, 204, 113, 0.1); border-right: 3px solid var(--success); padding: 15px; border-radius: 8px;";
            wrap.innerHTML = `<h4 style="margin-bottom: 5px; color: var(--success); text-align: right;"><i class="ph ph-user"></i> Operator</h4><p style="text-align: right; color: white;">${msg}</p>`;
            messagesArea.appendChild(wrap);
            messagesArea.scrollTop = messagesArea.scrollHeight;
            return wrap;
        };

        const appendAILoading = () => {
            const wrap = document.createElement('div');
            wrap.id = 'ai-loading-bubble';
            wrap.style = "align-self: flex-start; max-width: 80%; background: rgba(102, 252, 241, 0.1); border-left: 3px solid var(--neon-blue); padding: 15px; border-radius: 8px;";
            wrap.innerHTML = `<h4 style="margin-bottom: 5px; color: var(--neon-blue);"><i class="ph ph-robot"></i> Cyber AI</h4><p class="typing-anim">Processing conceptual paths<span>.</span><span>.</span><span>.</span></p>`;
            messagesArea.appendChild(wrap);
            messagesArea.scrollTop = messagesArea.scrollHeight;
            return wrap;
        };

        const appendAIMessage = (msg) => {
            const loader = document.getElementById('ai-loading-bubble');
            if(loader) loader.remove();
            
            const wrap = document.createElement('div');
            wrap.style = "align-self: flex-start; max-width: 80%; background: rgba(102, 252, 241, 0.1); border-left: 3px solid var(--neon-blue); padding: 15px; border-radius: 8px; line-height: 1.5; color: white;";
            
            // basic formatting handling
            let formattedMsg = msg.replace(/\n/g, '<br>');
            wrap.innerHTML = `<h4 style="margin-bottom: 5px; color: var(--neon-blue);"><i class="ph ph-robot"></i> Cyber AI</h4><p>${formattedMsg}</p>`;
            messagesArea.appendChild(wrap);
            messagesArea.scrollTop = messagesArea.scrollHeight;
            
            // Add to session history visually
            const hList = document.getElementById('ai-history-list');
            const hText = `<p style="color: #ccc; font-size: 0.9rem; margin-bottom: 8px; border-left: 2px solid #555; padding-left: 5px;">> ${msg.substring(0, 30)}...</p>`;
            hList.innerHTML = hText + hList.innerHTML.replace('<p style="color: #555; font-style: italic;">No active conversations.</p>', '');
        };

        const generateAIResponse = async (text) => {
            appendUserMessage(text);
            appendAILoading();
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({message: text})
                });
                const data = await res.json();
                if(data.error) appendAIMessage(`*[System Warning]: ${data.error}*`);
                else appendAIMessage(data.reply);
            } catch(e) {
                appendAIMessage("*[System Error]: Cannot reach local backend endpoint.*");
            }
        };

        btnSend.addEventListener('click', () => {
            if(chatInput.value.trim() === '') return;
            generateAIResponse(chatInput.value.trim());
            chatInput.value = '';
        });

        chatInput.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') btnSend.click();
        });

        document.querySelectorAll('.prompt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.innerText;
                chatInput.value = ''; // Prevent collision
                generateAIResponse(prompt);
            });
        });

        // --- Camera Optional Demo ---
        cameraBtn.addEventListener('click', async () => {
            if(localStream) {
                localStream.getTracks().forEach(track => track.stop());
                cameraVideo.srcObject = null;
                cameraContainer.style.display = 'none';
                localStream = null;
                cameraBtn.innerHTML = '<i class="ph ph-camera"></i> Start Camera Vision';
                cameraBtn.classList.replace('btn-danger', 'btn-primary');
            } else {
                try {
                    localStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    cameraVideo.srcObject = localStream;
                    cameraContainer.style.display = 'block';
                    cameraBtn.innerHTML = '<i class="ph ph-stop"></i> Stop Camera Vision';
                    cameraBtn.classList.replace('btn-primary', 'btn-danger');
                } catch(e) {
                    alert('Camera access denied or unavailable inside this secure session.');
                }
            }
        });

        // --- Voice Input ---
        if('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            
            recognition.onstart = () => {
                voiceStatus.style.display = 'block';
                voiceBtn.style.color = 'var(--warning)';
                voiceBtn.style.borderColor = 'var(--warning)';
            };
            
            recognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                chatInput.value = transcript;
            };
            
            recognition.onerror = () => {
                voiceStatus.style.display = 'none';
                voiceBtn.style.color = '';
                voiceBtn.style.borderColor = '';
                alert('Secure Speech recognition failed.');
            };
            
            recognition.onend = () => {
                voiceStatus.style.display = 'none';
                voiceBtn.style.color = '';
                voiceBtn.style.borderColor = '';
                setTimeout(() => {
                    if (chatInput.value.trim() !== '') btnSend.click();
                }, 300);
            };
            
            voiceBtn.addEventListener('click', () => {
                recognition.start();
            });
        } else {
            voiceBtn.addEventListener('click', () => alert('Speech synthesis matrix is not supported inside this browser wrapper.'));
        }
    }

    // --- Learning Hub Filtering ---
    const learningSearchInput = document.getElementById('learning-search');
    if (learningSearchInput) {
        const filterBtns = document.querySelectorAll('.filter-controls .filter-btn');
        const learningCards = document.querySelectorAll('.learning-card');
        let currentFilter = 'all';

        const applyFilters = () => {
            const query = learningSearchInput.value.toLowerCase();
            learningCards.forEach(card => {
                const name = card.getAttribute('data-name').toLowerCase();
                const category = card.getAttribute('data-category');
                
                const matchesSearch = name.includes(query);
                const matchesCategory = (currentFilter === 'all') || (category === currentFilter);
                
                if (matchesSearch && matchesCategory) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        };

        learningSearchInput.addEventListener('input', applyFilters);

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-filter');
                applyFilters();
            });
        });
    }

    // --- Resource Hub Filtering ---
    const resourceSearchInput = document.getElementById('resource-search');
    if (resourceSearchInput) {
        const filterBtns = document.querySelectorAll('.filter-controls .resource-btn');
        const resourceCards = document.querySelectorAll('.resource-card');
        const toolRows = document.querySelectorAll('.tool-row');
        let currentFilter = 'all';

        const applyFilters = () => {
            const query = resourceSearchInput.value.toLowerCase();
            
            // Filter Platform Cards based on Query + Category Tag
            resourceCards.forEach(card => {
                const name = card.getAttribute('data-name').toLowerCase();
                const category = card.getAttribute('data-category');
                
                const matchesSearch = name.includes(query);
                const matchesCategory = (currentFilter === 'all') || (category === currentFilter);
                
                if (matchesSearch && matchesCategory) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });

            // Filter Table entries strictly based on Search Query
            toolRows.forEach(row => {
                const rowText = row.innerText.toLowerCase();
                if (rowText.includes(query)) {
                    row.style.display = 'table-row';
                } else {
                    row.style.display = 'none';
                }
            });
        };

        resourceSearchInput.addEventListener('input', applyFilters);

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.getAttribute('data-filter');
                applyFilters();
            });
        });
    }

    // --- REAL ACTIONABLE FLOATING AI PANEL LOGIC ---
    const aiPanel = document.getElementById('ai-floating-panel');
    const toggleBtns = document.querySelectorAll('#toggle-cyber-ai, [href="/tool/ai_assistant"]');
    
    if (aiPanel) {
        // Toggle Logic with CSS Slide transition
        toggleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                if (aiPanel.style.transform === 'translateX(100%)') {
                    aiPanel.style.transform = 'translateX(0)';
                } else {
                    aiPanel.style.transform = 'translateX(100%)';
                }
            });
        });

        // Close and Minimize
        document.getElementById('ai-minimize')?.addEventListener('click', () => aiPanel.style.transform = 'translateX(100%)');
        document.getElementById('ai-close')?.addEventListener('click', () => aiPanel.style.transform = 'translateX(100%)');

        // --- 3. REAL RESIZABLE PANEL ---
        const resizer = document.getElementById('ai-resizer');
        let isResizing = false;
        let resizeStartX = 0;
        let startWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            resizeStartX = e.clientX;
            startWidth = aiPanel.offsetWidth;
            aiPanel.style.transition = 'none'; // disable slide transition during resize
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const diff = resizeStartX - e.clientX;
            const newWidth = startWidth + diff;
            
            if (newWidth >= 300 && newWidth <= 800) {
                aiPanel.style.width = newWidth + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            if(isResizing) {
                isResizing = false;
                aiPanel.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
            }
        });

        // --- 4. REAL DRAGGING ---
        const header = document.getElementById('ai-header');
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            aiPanel.style.transition = 'none';
            
            const rect = aiPanel.getBoundingClientRect();
            dragOffsetX = rect.right - e.clientX; 
            dragOffsetY = e.clientY - rect.top;
            
            // Preserve height so panel doesn't collapse
            aiPanel.style.height = rect.height + 'px';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if(!isDragging) return;
            
            const newRight = window.innerWidth - e.clientX - dragOffsetX;
            const newTop = e.clientY - dragOffsetY;
            
            aiPanel.style.right = newRight + 'px';
            aiPanel.style.top = newTop + 'px';
            aiPanel.style.left = 'auto';
            aiPanel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if(isDragging) {
                isDragging = false;
                aiPanel.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)';
            }
        });

        // --- 5 & 6 & 7. CHAT SYSTEM INTEGRATION ---
        const msgsArea = document.getElementById('ai-chat-messages');
        const inputField = document.getElementById('ai-chat-input');
        const btnSend = document.getElementById('ai-btn-send');
        
        const appendUserMsg = (msg) => {
            const div = document.createElement('div');
            div.style = "margin-left: auto; max-width: 85%; background: rgba(46, 204, 113, 0.1); border-right: 3px solid #2ecc71; padding: 12px; border-radius: 8px 8px 0 8px; color: #fff; text-align: right;";
            div.innerHTML = `<div style="color: #2ecc71; font-size: 0.8rem; margin-bottom: 4px; font-weight: bold;">User <i class="ph ph-user"></i></div>${msg}`;
            msgsArea.appendChild(div);
            msgsArea.scrollTop = msgsArea.scrollHeight;
        };

        const appendAITyping = () => {
            const div = document.createElement('div');
            div.id = 'ai-typing-loader';
            div.style = "margin-right: auto; max-width: 85%; background: rgba(0, 240, 255, 0.1); border-left: 3px solid #00f0ff; padding: 12px; border-radius: 8px 8px 8px 0; color: #fff;";
            div.innerHTML = `<div style="color: #00f0ff; font-size: 0.8rem; margin-bottom: 4px; font-weight: bold;"><i class="ph ph-robot"></i> Cyber AI</div>
                             <span style="display: inline-block; animation: pulse 1s infinite;">Thinking...</span>`;
            msgsArea.appendChild(div);
            msgsArea.scrollTop = msgsArea.scrollHeight;
        };

        const appendAIMsg = (msg) => {
            const loader = document.getElementById('ai-typing-loader');
            if(loader) loader.remove();
            
            const div = document.createElement('div');
            div.style = "margin-right: auto; max-width: 85%; background: rgba(0, 240, 255, 0.1); border-left: 3px solid #00f0ff; padding: 12px; border-radius: 8px 8px 8px 0; color: #fff;";
            div.innerHTML = `<div style="color: #00f0ff; font-size: 0.8rem; margin-bottom: 4px; font-weight: bold;"><i class="ph ph-robot"></i> Cyber AI</div>${msg.replace(/\\n/g, '<br>')}`;
            msgsArea.appendChild(div);
            msgsArea.scrollTop = msgsArea.scrollHeight;
        };
        
        const sendChatMessage = async (text) => {
            if(!text) return;
            appendUserMsg(text);
            appendAITyping();
            
            try {
                const res = await fetch('/api/chat', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({message: text})
                });
                const data = await res.json();
                if(data.error) appendAIMsg(`*[System Error]*: ${data.error}`);
                else appendAIMsg(data.reply);
            } catch(e) {
                appendAIMsg("AI offline (demo mode active)"); // strict requirement fallback
            }
        };

        btnSend.addEventListener('click', () => {
            const text = inputField.value.trim();
            if(text) {
                sendChatMessage(text);
                inputField.value = '';
            }
        });

        inputField.addEventListener('keypress', (e) => {
            if(e.key === 'Enter') btnSend.click();
        });

        document.getElementById('ai-clear-chat').addEventListener('click', () => {
            const welcomeNode = msgsArea.firstElementChild;
            msgsArea.innerHTML = '';
            msgsArea.appendChild(welcomeNode.cloneNode(true));
            bindQuickPrompts(); // rebind cloned prompts
        });

        function bindQuickPrompts() {
            document.querySelectorAll('.ai-quick-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const prompt = btn.innerText;
                    sendChatMessage(prompt);
                    inputField.value = '';
                });
            });
        }
        bindQuickPrompts();

        // --- 8. VOICE INPUT ---
        const micBtn = document.getElementById('ai-btn-mic');
        const voiceStatus = document.getElementById('ai-voice-status');
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            
            recognition.onstart = () => voiceStatus.style.display = 'block';
            recognition.onresult = (e) => {
                const transcript = e.results[0][0].transcript;
                inputField.value = transcript;
                setTimeout(() => btnSend.click(), 500); // auto fill and send requirement
            };
            recognition.onerror = () => {
                voiceStatus.style.display = 'none';
                alert('Speech recognition failed.');
            };
            recognition.onend = () => voiceStatus.style.display = 'none';
            micBtn.addEventListener('click', () => recognition.start());
        } else {
            micBtn.addEventListener('click', () => alert('Browser does not support Voice input.'));
        }

        // --- 9. CAMERA FEATURE ---
        const camBtn = document.getElementById('ai-btn-camera');
        const camContainer = document.getElementById('camera-container');
        const camVideo = document.getElementById('camera-preview');
        const camClose = document.getElementById('btn-camera-close');
        let streamHandle = null;

        const closeCamera = () => {
            if(streamHandle) {
                streamHandle.getTracks().forEach(track => track.stop());
                camVideo.srcObject = null;
                streamHandle = null;
            }
            camContainer.style.display = 'none';
        };

        camBtn.addEventListener('click', async () => {
            if (streamHandle) {
                closeCamera();
            } else {
                try {
                    streamHandle = await navigator.mediaDevices.getUserMedia({ video: true });
                    camVideo.srcObject = streamHandle;
                    camContainer.style.display = 'block';
                } catch(e) {
                    alert('Camera access denied. (Requires local permissions)');
                }
            }
        });
        
        camClose.addEventListener('click', closeCamera);
    }

});
