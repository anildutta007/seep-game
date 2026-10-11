#!/usr/bin/env python3
"""
Seep Game Server - Local HTTP Web Server
Serves the Seep Indian Card Game application and opens default web browser.
"""

import http.server
import socketserver
import webbrowser
import os
import sys

DEFAULT_PORT = 8000
MAX_PORT_ATTEMPTS = 15

class QuietHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Custom request handler that silences routine GET 200 logs for cleaner output."""
    def log_message(self, format, *args):
        # Only log non-200 responses or errors
        if len(args) > 1 and str(args[1]) != '200' and str(args[1]) != '304':
            super().log_message(format, *args)

def start_server():
    # Ensure current directory is the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    port = DEFAULT_PORT
    httpd = None

    for attempt in range(MAX_PORT_ATTEMPTS):
        try:
            handler = QuietHTTPRequestHandler
            httpd = socketserver.TCPServer(("", port), handler)
            break
        except OSError:
            port += 1

    if not httpd:
        print(f"[Error] Could not find an open port starting from {DEFAULT_PORT}.")
        sys.exit(1)

    url = f"http://localhost:{port}"
    print("=" * 65)
    print("      ♠  SEEP (सीप) - Traditional North Indian Card Game  ♠")
    print("=" * 65)
    print(f" Server running at: {url}")
    print(f" Project Directory: {script_dir}")
    print(" Press Ctrl+C in this window to stop the server.")
    print("=" * 65)

    # Open web browser
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f" Note: Please open {url} manually in your browser.")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[Server] Shutting down Seep Game server. Thanks for playing!")
        httpd.server_close()

if __name__ == '__main__':
    start_server()
