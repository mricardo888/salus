"""
Combined server for Heroku deployment
Runs FastAPI backend on the Heroku-assigned PORT
Next.js is pre-built and served via FastAPI
"""
import os
import subprocess
import sys

def main():
    port = os.environ.get('PORT', '8000')
    
    # Start uvicorn with the FastAPI app
    os.chdir('backend')
    subprocess.run([
        sys.executable, '-m', 'uvicorn',
        'main:app',
        '--host', '0.0.0.0',
        '--port', port
    ])

if __name__ == '__main__':
    main()
