#!/usr/bin/env python3
"""
Seep Game Server - Local & Remote HTTP Server
Serves the Seep Indian Card Game application with local network and remote multiplayer support.
"""

import http.server
import socketserver
import webbrowser
import socket
import os
import sys

DEFAULT_PORT = 8000
MAX_PORT_ATTEMPTS = 15

class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler that silences routine GET 200 logs for cleaner output."""
    def log_message(self, format, *args):
        # Only log non-200 responses or errors
        if len(args) > 1 and str(args[1]) not in ('200', '304'):
            super().log_message(format, *args)

def get_lan_ip():
    """Detect local LAN IP address for same-WiFi play."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def start_server():
    # Ensure current directory is the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    port = DEFAULT_PORT
    httpd = None

    for attempt in range(MAX_PORT_ATTEMPTS):
        try:
            handler = QuietHTTPRequestHandler
            socketserver.TCPServer.allow_reuse_address = True
            httpd = socketserver.TCPServer(("0.0.0.0", port), handler)
            break
        except OSError:
            port += 1

    if not httpd:
        print(f"[Error] Could not find an open port starting from {DEFAULT_PORT}.")
        sys.exit(1)

    lan_ip = get_lan_ip()
    local_url = f"http://localhost:{port}"
    lan_url = f"http://{lan_ip}:{port}"

    print("=" * 70)
    print("       ♠  SEEP (सीप) - Traditional North Indian Card Game  ♠")
    print("=" * 70)
    print(f" ▶ Local Game URL:           {local_url}")
    print(f" ▶ Wi-Fi / LAN for Friends:  {lan_url}")
    print("=" * 70)
    print(" 🌐 REMOTE MULTIPLAYER (Play with 3 Friends anywhere):")
    print("    1. Click '🌐 Play with Friends' in the top header.")
    print("    2. Click 'Generate Room & Start Hosting' to get your Room Code.")
    print("    3. Click 'Copy Link' or 'WhatsApp' to invite your 3 friends.")
    print("    Friends can join from PC, Mac, iPhone, or Android with zero install!")
    print("=" * 70)
    print(" Press Ctrl+C in this window to stop the server.")
    print("=" * 70)

    # Open web browser to local game
    try:
        webbrowser.open(local_url)
    except Exception:
        print(f" Note: Please open {local_url} manually in your browser.")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Shutting down Seep Game server. Thanks for playing!")
        httpd.server_close()

if __name__ == '__main__':
    start_server()
