import socket
from concurrent.futures import ThreadPoolExecutor

def scan_port(target, port):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(0.5)
        result = sock.connect_ex((target, port))
        sock.close()
        if result == 0:
            return port
    except Exception:
        pass
    return None

def port_scan(target, start_port, end_port):
    open_ports = []
    # Resolve hostname to IP first safely
    try:
        target_ip = socket.gethostbyname(target)
    except socket.gaierror:
        return {"error": "Invalid hostname or IP"}
        
    with ThreadPoolExecutor(max_workers=100) as executor:
        results = executor.map(lambda p: scan_port(target_ip, p), range(start_port, end_port + 1))
        open_ports = [p for p in results if p is not None]
    
    return {"open_ports": open_ports, "target_ip": target_ip}
