import http.server
import socketserver
import os

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BUILD_DIR = os.path.join(BASE_DIR, 'build')

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BUILD_DIR, **kwargs)

    def translate_path(self, path):
        if path.startswith('/bug_editor/'):
            path = '/' + path[len('/bug_editor/'):]
        elif path == '/bug_editor':
            path = '/'
        return super().translate_path(path)

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f"Serving BUG Editor from build/ on http://localhost:{PORT}/bug_editor/")
    httpd.serve_forever()
