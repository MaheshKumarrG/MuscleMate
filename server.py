from http.server import HTTPServer, SimpleHTTPRequestHandler
import mimetypes
import os

class CustomHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Add CORS headers
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        
        # Set proper MIME type
        _, ext = os.path.splitext(self.path)
        if ext:
            mime_type = mimetypes.types_map.get(ext)
            if mime_type:
                self.send_header('Content-Type', mime_type)
        
        self.end_headers()
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

def run(server_class=HTTPServer, handler_class=CustomHandler, port=5501):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    print(f"Starting server on port {port}...")
    httpd.serve_forever()

if __name__ == '__main__':
    # Add common MIME types
    mimetypes.add_type('application/javascript', '.js')
    mimetypes.add_type('text/css', '.css')
    mimetypes.add_type('text/html', '.html')
    run()
